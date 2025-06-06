import type {
  RawTranscriptData,
  TranscriptForAnalysis,
  ProcessingOptions,
  TranscriptSegment
} from '../types/transcript';

export class TranscriptProcessor {
  private readonly DEFAULT_MIN_SEGMENT_LENGTH = 3;
  private readonly WORDS_PER_MINUTE_READING = 200; // Average reading speed

  /**
   * Process transcript for AI analysis
   */
  processForAnalysis(
    rawTranscript: RawTranscriptData,
    options: ProcessingOptions = {}
  ): TranscriptForAnalysis {
    let segments = [...rawTranscript.segments];
    let text = rawTranscript.fullText;
    
    const processingFlags = {
      cleaned: false,
      merged: false,
      filtered: false
    };

    // Clean text if requested
    if (options.cleanText !== false) { // Default to true
      text = this.cleanTextForAnalysis(text);
      processingFlags.cleaned = true;
    }

    // Merge short segments if requested
    if (options.mergeShortSegments !== false) { // Default to true
      const minLength = options.minSegmentLength || this.DEFAULT_MIN_SEGMENT_LENGTH;
      segments = this.mergeShortSegments(segments, minLength);
      processingFlags.merged = true;
    }

    // Remove music and sound effects if requested
    if (options.removeMusic || options.removeSoundEffects) {
      segments = this.filterSegments(segments, {
        removeMusic: options.removeMusic,
        removeSoundEffects: options.removeSoundEffects
      });
      text = segments.map(s => s.text).join(' ');
      processingFlags.filtered = true;
    }

    const wordCount = this.countWords(text);
    const estimatedReadTime = this.calculateReadTime(wordCount);

    return {
      videoId: rawTranscript.videoId,
      language: rawTranscript.language,
      text,
      segments,
      wordCount,
      estimatedReadTime,
      quality: rawTranscript.quality,
      processingFlags
    };
  }

  /**
   * Clean text specifically for AI analysis
   */
  private cleanTextForAnalysis(text: string): string {
    return text
      // Remove repeated whitespace
      .replace(/\s+/g, ' ')
      // Remove incomplete words at segment boundaries
      .replace(/\b\w{1,2}\s+(?=\w)/g, ' ')
      // Fix common transcription issues
      .replace(/\b(um|uh|ah|er)\b/gi, '')
      .replace(/\b(you know|like|so)\b(?=\s+\1)/gi, '$1') // Remove repetitions
      // Clean up punctuation
      .replace(/[.]{2,}/g, '.')
      .replace(/[,]{2,}/g, ',')
      // Normalize spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Merge short segments to create more meaningful chunks
   */
  private mergeShortSegments(
    segments: TranscriptSegment[], 
    minLength: number
  ): TranscriptSegment[] {
    if (segments.length === 0) return segments;

    const merged: TranscriptSegment[] = [];
    let currentSegment: TranscriptSegment | null = null;

    for (const segment of segments) {
      const wordCount = this.countWords(segment.text);

      if (currentSegment === null) {
        currentSegment = { ...segment };
      } else if (wordCount < minLength || this.countWords(currentSegment.text) < minLength) {
        // Merge with current segment
        currentSegment.duration = (segment.start + segment.duration) - currentSegment.start;
        currentSegment.text = `${currentSegment.text} ${segment.text}`.trim();
      } else {
        // Current segment is complete, add it to results
        merged.push(currentSegment);
        currentSegment = { ...segment };
      }
    }

    // Add the last segment
    if (currentSegment) {
      merged.push(currentSegment);
    }

    return merged;
  }

  /**
   * Filter out music and sound effects
   */
  private filterSegments(
    segments: TranscriptSegment[],
    options: { removeMusic?: boolean; removeSoundEffects?: boolean }
  ): TranscriptSegment[] {
    return segments.filter(segment => {
      const text = segment.text.toLowerCase();

      // Remove music indicators
      if (options.removeMusic) {
        if (
          text.includes('[music]') ||
          text.includes('♪') ||
          text.includes('♫') ||
          /\[.*music.*\]/i.test(text) ||
          /♪.*♪/.test(text)
        ) {
          return false;
        }
      }

      // Remove sound effects
      if (options.removeSoundEffects) {
        if (
          text.includes('[applause]') ||
          text.includes('[laughter]') ||
          text.includes('[sound') ||
          /\[.*sound.*\]/i.test(text) ||
          /\(.*sound.*\)/i.test(text)
        ) {
          return false;
        }
      }

      // Keep segments with meaningful content
      const meaningfulWords = text
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim();

      return meaningfulWords.length > 0;
    });
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  /**
   * Calculate estimated reading time in minutes
   */
  private calculateReadTime(wordCount: number): number {
    return Math.max(1, Math.round(wordCount / this.WORDS_PER_MINUTE_READING));
  }

  /**
   * Create a summary of segments for quick analysis
   */
  createSegmentSummary(segments: TranscriptSegment[]): {
    totalSegments: number;
    totalDuration: number;
    averageSegmentLength: number;
    wordCount: number;
  } {
    const totalDuration = segments.length > 0
      ? segments[segments.length - 1].start + segments[segments.length - 1].duration
      : 0;

    const wordCount = segments.reduce((count, segment) => 
      count + this.countWords(segment.text), 0
    );

    return {
      totalSegments: segments.length,
      totalDuration,
      averageSegmentLength: segments.length > 0 ? totalDuration / segments.length : 0,
      wordCount
    };
  }

  /**
   * Extract key phrases from transcript
   */
  extractKeyPhrases(text: string, maxPhrases: number = 10): string[] {
    // Simple key phrase extraction
    // In a production system, you might use more sophisticated NLP
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Score sentences by length and word quality
    const scoredSentences = sentences.map(sentence => {
      const words = sentence.trim().split(/\s+/);
      const score = words.length * 0.7 + 
                   words.filter(w => w.length > 4).length * 0.3;
      return { sentence: sentence.trim(), score };
    });

    // Return top phrases
    return scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPhrases)
      .map(item => item.sentence);
  }

  /**
   * Split transcript into chunks for AI processing
   */
  createChunksForAI(
    segments: TranscriptSegment[],
    maxWordsPerChunk: number = 500,
    overlapWords: number = 50
  ): Array<{
    text: string;
    startTime: number;
    endTime: number;
    segmentIndices: number[];
  }> {
    const chunks = [];
    let currentChunk = {
      segments: [] as TranscriptSegment[],
      indices: [] as number[],
      wordCount: 0
    };

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentWordCount = this.countWords(segment.text);

      // If adding this segment would exceed the limit, finalize current chunk
      if (currentChunk.wordCount + segmentWordCount > maxWordsPerChunk && currentChunk.segments.length > 0) {
        chunks.push(this.finalizeChunk(currentChunk));
        
        // Start new chunk with overlap
        const overlapSegments = this.getOverlapSegments(
          currentChunk.segments, 
          currentChunk.indices, 
          overlapWords
        );
        
        currentChunk = {
          segments: overlapSegments.segments,
          indices: overlapSegments.indices,
          wordCount: overlapSegments.wordCount
        };
      }

      currentChunk.segments.push(segment);
      currentChunk.indices.push(i);
      currentChunk.wordCount += segmentWordCount;
    }

    // Add the last chunk
    if (currentChunk.segments.length > 0) {
      chunks.push(this.finalizeChunk(currentChunk));
    }

    return chunks;
  }

  private finalizeChunk(chunk: {
    segments: TranscriptSegment[];
    indices: number[];
    wordCount: number;
  }) {
    const text = chunk.segments.map(s => s.text).join(' ');
    const startTime = chunk.segments[0]?.start || 0;
    const lastSegment = chunk.segments[chunk.segments.length - 1];
    const endTime = lastSegment ? lastSegment.start + lastSegment.duration : startTime;

    return {
      text,
      startTime,
      endTime,
      segmentIndices: chunk.indices
    };
  }

  private getOverlapSegments(
    segments: TranscriptSegment[],
    indices: number[],
    overlapWords: number
  ): {
    segments: TranscriptSegment[];
    indices: number[];
    wordCount: number;
  } {
    let wordCount = 0;
    const overlapSegments = [];
    const overlapIndices = [];

    // Take segments from the end until we reach the overlap word count
    for (let i = segments.length - 1; i >= 0 && wordCount < overlapWords; i--) {
      const segmentWords = this.countWords(segments[i].text);
      wordCount += segmentWords;
      overlapSegments.unshift(segments[i]);
      overlapIndices.unshift(indices[i]);
    }

    return {
      segments: overlapSegments,
      indices: overlapIndices,
      wordCount
    };
  }
}

// Export singleton instance
export const transcriptProcessor = new TranscriptProcessor(); 