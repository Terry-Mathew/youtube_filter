import { YoutubeTranscript } from 'youtube-transcript';
import type { 
  YouTubeVideoId, 
  TranscriptSegment, 
  TranscriptLanguage,
  TranscriptExtractionOptions,
  RawTranscriptData,
  TranscriptExtractionResult
} from '../types/transcript';

export class YouTubeTranscriptExtractor {
  private readonly PROCESSING_VERSION = '1.0.0';
  private readonly DEFAULT_RETRY_COUNT = 3;
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds

  constructor() {
    // Initialize any required configurations
  }

  /**
   * Extract transcript for a YouTube video
   */
  async extractTranscript(
    videoId: YouTubeVideoId, 
    options: TranscriptExtractionOptions = {}
  ): Promise<TranscriptExtractionResult> {
    const maxRetries = options.maxRetries || this.DEFAULT_RETRY_COUNT;
    let lastError: string = '';
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting transcript extraction for ${videoId}, attempt ${attempt + 1}/${maxRetries + 1}`);
        
        const result = await this.performExtraction(videoId, options);
        
        if (result) {
          console.log(`Successfully extracted transcript for ${videoId}`);
          return {
            success: true,
            data: result,
            retryCount: attempt
          };
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Transcript extraction attempt ${attempt + 1} failed for ${videoId}:`, lastError);
        
        // If this is the last attempt, don't wait
        if (attempt < maxRetries) {
          await this.delay(1000 * (attempt + 1)); // Progressive delay
        }
      }
    }

    return {
      success: false,
      error: `Failed to extract transcript after ${maxRetries + 1} attempts. Last error: ${lastError}`,
      retryCount: maxRetries
    };
  }

  /**
   * Perform the actual transcript extraction
   */
  private async performExtraction(
    videoId: YouTubeVideoId,
    options: TranscriptExtractionOptions
  ): Promise<RawTranscriptData | null> {
    try {
      // Get available languages first
      const availableLanguages = await this.getAvailableLanguagesForVideo(videoId);
      
      if (availableLanguages.length === 0) {
        throw new Error('No transcripts available for this video');
      }

      // Select the best language
      const selectedLanguage = this.selectBestLanguage(
        availableLanguages,
        options.language,
        options.fallbackLanguages
      );

      if (!selectedLanguage) {
        throw new Error('No suitable language found');
      }

      // Fetch transcript
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: selectedLanguage.language
      });

      if (!transcript || transcript.length === 0) {
        throw new Error('Empty transcript received');
      }

      // Transform to our format
      const segments: TranscriptSegment[] = transcript.map(item => ({
        start: parseFloat(item.offset.toString()) / 1000, // Convert ms to seconds
        duration: parseFloat(item.duration.toString()) / 1000, // Convert ms to seconds
        text: item.text
      }));

      const fullText = this.cleanTranscript(
        segments.map(s => s.text).join(' ')
      );

      const quality = this.assessTranscriptQuality(fullText, segments);

      return {
        videoId,
        language: selectedLanguage.language,
        isAutoGenerated: selectedLanguage.isAutoGenerated,
        segments,
        fullText,
        quality,
        extractedAt: new Date().toISOString(),
        source: 'youtube-transcript'
      };

    } catch (error) {
      console.error(`Failed to extract transcript for ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Get available languages for a video
   */
  async getAvailableLanguagesForVideo(videoId: YouTubeVideoId): Promise<TranscriptLanguage[]> {
    try {
      // Try fetching with default language to get error info about available languages
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      // If successful with default, we know at least one language is available
      if (transcript && transcript.length > 0) {
        return [{
          language: 'en', // youtube-transcript defaults to English
          languageName: 'English',
          isAutoGenerated: true // We assume auto-generated unless we can determine otherwise
        }];
      }
      
      return [];
    } catch (error) {
      // If error contains language info, we could parse it, but for now return empty
      console.warn(`Could not determine available languages for ${videoId}:`, error);
      return [];
    }
  }

  /**
   * Check if transcript exists for a video
   */
  async hasTranscript(videoId: YouTubeVideoId): Promise<boolean> {
    try {
      const languages = await this.getAvailableLanguagesForVideo(videoId);
      return languages.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Select the best available language
   */
  private selectBestLanguage(
    available: TranscriptLanguage[],
    preferred?: string,
    fallbacks?: string[]
  ): TranscriptLanguage | null {
    if (available.length === 0) return null;

    // If preferred language is specified, try to find it
    if (preferred) {
      const match = available.find(lang => 
        lang.language === preferred || lang.language.startsWith(preferred + '-')
      );
      if (match) return match;
    }

    // Try fallback languages
    if (fallbacks) {
      for (const fallback of fallbacks) {
        const match = available.find(lang => 
          lang.language === fallback || lang.language.startsWith(fallback + '-')
        );
        if (match) return match;
      }
    }

    // Try to find English
    const english = available.find(lang => 
      lang.language === 'en' || lang.language.startsWith('en-')
    );
    if (english) return english;

    // Prefer manual over auto-generated
    const manual = available.find(lang => !lang.isAutoGenerated);
    if (manual) return manual;

    // Return first available
    return available[0];
  }

  /**
   * Clean transcript text
   */
  private cleanTranscript(text: string): string {
    return text
      .replace(/\[.*?\]/g, '') // Remove [Music], [Applause], etc.
      .replace(/\(.*?\)/g, '') // Remove (sound effects)
      .replace(/♪.*?♪/g, '') // Remove music notes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Assess transcript quality based on content
   */
  private assessTranscriptQuality(
    text: string, 
    segments: TranscriptSegment[]
  ): 'high' | 'medium' | 'low' {
    const wordCount = text.split(' ').filter(word => word.length > 0).length;
    const segmentCount = segments.length;
    const avgWordsPerSegment = wordCount / segmentCount;
    
    // Calculate estimated video duration from segments
    const videoDuration = segments.length > 0 
      ? segments[segments.length - 1].start + segments[segments.length - 1].duration 
      : 0;
    
    const wordsPerMinute = videoDuration > 0 ? (wordCount / (videoDuration / 60)) : 0;

    // Quality assessment based on multiple factors
    let qualityScore = 0;

    // Words per minute (normal speech is 120-150 wpm)
    if (wordsPerMinute >= 100 && wordsPerMinute <= 200) qualityScore += 2;
    else if (wordsPerMinute >= 50 && wordsPerMinute <= 250) qualityScore += 1;

    // Average words per segment (good segments have 3-10 words)
    if (avgWordsPerSegment >= 3 && avgWordsPerSegment <= 10) qualityScore += 2;
    else if (avgWordsPerSegment >= 2 && avgWordsPerSegment <= 15) qualityScore += 1;

    // Text length (longer transcripts are usually more reliable)
    if (wordCount >= 100) qualityScore += 1;
    if (wordCount >= 500) qualityScore += 1;

    // Return quality based on score
    if (qualityScore >= 5) return 'high';
    if (qualityScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Create metadata for a transcript
   */
  createMetadata(transcript: RawTranscriptData) {
    const totalDuration = transcript.segments.length > 0
      ? transcript.segments[transcript.segments.length - 1].start + 
        transcript.segments[transcript.segments.length - 1].duration
      : 0;

    return {
      extractedAt: transcript.extractedAt,
      quality: transcript.quality,
      language: transcript.language,
      isAutoGenerated: transcript.isAutoGenerated,
      segmentCount: transcript.segments.length,
      totalDuration,
      wordCount: transcript.fullText.split(' ').filter(w => w.length > 0).length,
      processingVersion: this.PROCESSING_VERSION
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const transcriptExtractor = new YouTubeTranscriptExtractor(); 