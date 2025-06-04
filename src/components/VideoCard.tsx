import React from 'react';
import { ExternalLink, Clock, Award } from 'lucide-react';
import { VideoUI } from '../types/video-ui';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

interface VideoCardProps {
  video: VideoUI;
  index: number;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, index }) => {
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

export default VideoCard;