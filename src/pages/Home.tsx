import React from 'react';
import SearchBar from '../components/SearchBar';
import Hero from '../components/Hero';
import SearchResults from '../components/SearchResults';
import { useAppStore } from '../store';

const Home: React.FC = () => {
  const { videos, searchQuery } = useAppStore();
  const hasSearched = searchQuery.trim().length > 0;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        {!hasSearched || videos.length === 0 ? (
          <>
            <Hero />
            <div className="relative -mt-10 z-10">
              <SearchBar />
            </div>
          </>
        ) : (
          <div className="py-8">
            <SearchBar />
            <SearchResults />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;