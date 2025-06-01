import React from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import VideoCard from './VideoCard';
import { useAppStore } from '../store';

const SearchResults: React.FC = () => {
  const { videos, isSearching, searchQuery } = useAppStore();
  
  if (isSearching) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-primary-500/30 blur-sm"></div>
          <div className="relative bg-white rounded-full p-4">
            <RefreshCw size={24} className="text-primary-600 animate-spin" />
          </div>
        </div>
        <p className="mt-4 text-gray-600 animate-pulse">Analyzing videos for "{searchQuery}"...</p>
      </div>
    );
  }
  
  if (videos.length === 0 && searchQuery) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <div className="bg-gray-100 rounded-full p-4">
          <AlertCircle size={24} className="text-gray-400" />
        </div>
        <p className="mt-4 text-gray-600">No videos found for "{searchQuery}". Try a different search term.</p>
      </div>
    );
  }
  
  if (videos.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <div className="bg-gray-100 rounded-full p-4">
          <Search size={24} className="text-gray-400" />
        </div>
        <p className="mt-4 text-gray-600">Search for a topic to see curated learning videos</p>
      </div>
    );
  }
  
  return (
    <div className="py-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-xl font-semibold mb-2">Results for "{searchQuery}"</h2>
        <p className="text-gray-500 mb-6">
          Found {videos.length} videos ranked by relevance to your learning goals
        </p>
        
        <div className="space-y-4">
          {videos.map((video, index) => (
            <VideoCard key={video.id} video={video} index={index} />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SearchResults;