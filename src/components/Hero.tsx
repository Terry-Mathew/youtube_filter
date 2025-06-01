import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Youtube } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-white py-16">
      <div className="relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center mb-6"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white">
                <Lightbulb className="h-8 w-8" />
              </div>
            </motion.div>

            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl"
            >
              Learn Anything with <span className="text-primary-600">AI-Curated</span> Videos
            </motion.h1>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-6 text-lg leading-8 text-gray-600"
            >
              Our AI analyzes YouTube videos to find the most relevant, highest-quality content 
              for your specific learning goals. Skip the fluff and learn efficiently.
            </motion.p>
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-10 flow-root"
          >
            <div className="relative rounded-xl bg-gray-900/5 p-2">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg">
                  <Youtube className="h-6 w-6 text-error-500" />
                </div>
              </div>
              
              <div className="relative mx-auto w-full rounded-xl bg-white shadow-xl ring-1 ring-gray-900/10 overflow-hidden">
                <div className="p-4">
                  <div className="flex space-x-1.5">
                    <div className="h-3 w-3 rounded-full bg-error-500"></div>
                    <div className="h-3 w-3 rounded-full bg-warning-500"></div>
                    <div className="h-3 w-3 rounded-full bg-success-500"></div>
                  </div>
                  <div className="mt-4 flex justify-center items-center h-48 bg-gray-50 rounded-md">
                    <div className="text-center">
                      <div className="flex justify-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <Search className="h-6 w-6 text-primary-600" />
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">Search for any topic to see curated learning videos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const Search = ({ className }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  );
};

export default Hero;