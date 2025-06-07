import React from 'react';
import { ExternalLink, Clock, Award, Brain, TrendingUp, CheckCircle } from 'lucide-react';
import { VideoUI } from '../types/video-ui';
import { VideoAnalysis } from '../types';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface VideoCardProps {
  video: VideoUI;
  index: number;
  showAnalysis?: boolean;
  analysis?: VideoAnalysis;
  isLoadingAnalysis?: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ 
  video, 
  index, 
  showAnalysis = true,
  analysis,
  isLoadingAnalysis = false
}) => {
  const { 
    id, 
    title, 
    channelTitle, 
    thumbnailUrl, 
    publishedAt, 
    viewCount, 
    relevanceScore, 
    keyPoints,
    duration
  } = video;

  // Format date
  const formattedDate = new Date(publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Format view count
  const formattedViewCount = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(viewCount);

  // Calculate score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-success-500';
    if (score >= 70) return 'bg-success-400';
    if (score >= 50) return 'bg-warning-400';
    return 'bg-error-500';
  };

  // Check if we have valid analysis data
  const hasAnalysis = analysis && analysis.confidence > 0.5;
  const shouldShowAnalysis = showAnalysis && (hasAnalysis || isLoadingAnalysis);

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <div className="flex flex-col md:flex-row">
        <div className="relative md:w-64 lg:w-80">
          <img 
            src={thumbnailUrl} 
            alt={title}
            className="w-full aspect-video object-cover"
          />
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-1.5 py-0.5 text-xs rounded">
            {duration}
          </div>
        </div>
        
        <div className="flex flex-col flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold line-clamp-2">{title}</h3>
            <div className={cn(
              "flex items-center justify-center rounded-full w-10 h-10 shrink-0 text-white font-semibold",
              getScoreColor(relevanceScore)
            )}>
              {relevanceScore}
            </div>
          </div>
          
          <div className="mt-1 text-sm text-gray-500">
            {channelTitle} • {formattedViewCount} views • {formattedDate}
          </div>
          
          <div className="mt-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Award className="h-4 w-4 text-accent-600" /> 
              Key Insights
            </h4>
            <ul className="mt-1 space-y-1">
              {keyPoints.map((point, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start">
                  <span className="mr-2 font-medium text-accent-700">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Analysis Section */}
          {shouldShowAnalysis && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <Brain className="h-4 w-4 text-blue-600" />
                  AI Analysis
                </h4>
                {hasAnalysis && (
                  <div className="flex items-center space-x-2">
                    <ScoreIndicator 
                      label="Quality" 
                      score={Math.round(analysis.overallQualityScore * 100)} 
                      color="green" 
                    />
                    {analysis.engagementScore && (
                      <ScoreIndicator 
                        label="Engagement" 
                        score={Math.round(analysis.engagementScore * 100)} 
                        color="blue" 
                      />
                    )}
                  </div>
                )}
              </div>
              
              {isLoadingAnalysis && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-500">Analyzing content...</span>
                </div>
              )}
              
              {hasAnalysis && (
                <>
                  {analysis.summary && (
                    <p className="text-sm text-gray-600 mb-3">{analysis.summary}</p>
                  )}
                  
                  {analysis.keyTopics.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Key Topics
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {analysis.keyTopics.slice(0, 4).map((topic, idx) => (
                          <span 
                            key={idx} 
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysis.pros.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        Strengths
                      </h5>
                      <ul className="space-y-1">
                        {analysis.pros.slice(0, 2).map((pro, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-start">
                            <span className="w-1 h-1 bg-green-400 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <span>Confidence: {Math.round(analysis.confidence * 100)}%</span>
                      <span className="text-gray-300">•</span>
                      <span className="capitalize">{analysis.difficultyLevel}</span>
                    </div>
                    <span>
                      {formatDistanceToNow(analysis.analysisDate, { addSuffix: true })}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="mr-1 h-4 w-4" /> 
              <span>{duration} total</span>
            </div>
            <a 
              href={`https://youtube.com/watch?v=${id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <ExternalLink className="mr-1 h-4 w-4" /> 
              Watch Video
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Score Indicator Component
const ScoreIndicator: React.FC<{
  label: string;
  score: number;
  color: 'blue' | 'green' | 'yellow' | 'red';
}> = ({ label, score, color }) => {
  const getColorClasses = (color: 'blue' | 'green' | 'yellow' | 'red', score: number) => {
    const intensity = score >= 80 ? '600' : score >= 60 ? '500' : '400';
    const colorMap: Record<'blue' | 'green' | 'yellow' | 'red', string> = {
      blue: `bg-blue-${intensity} text-blue-50`,
      green: `bg-green-${intensity} text-green-50`, 
      yellow: `bg-yellow-${intensity} text-yellow-50`,
      red: `bg-red-${intensity} text-red-50`,
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className={cn(
      "px-2 py-1 rounded-full text-xs font-medium",
      getColorClasses(color, score)
    )}>
      {label}: {score}
    </div>
  );
};

export default VideoCard;