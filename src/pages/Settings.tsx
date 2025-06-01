"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, History, Trash2, User, Bell, Shield, Folder } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryManager } from "@/components/CategoryManager";
import { useAppStore } from '../store';

const Settings: React.FC = () => {
  const { 
    userPreferences, 
    updateUserPreferences, 
    searchHistory,
    clearSearchHistory
  } = useAppStore();

  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <SettingsIcon className="mr-3 h-8 w-8" />
            Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your account preferences and application settings.
          </p>
        </motion.div>

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Privacy
              </TabsTrigger>
            </TabsList>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize how the application looks and feels.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Theme</h4>
                    <div className="space-y-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-4">
                      {['light', 'dark'].map((theme) => (
                        <div key={theme} className="flex items-center">
                          <input
                            id={theme}
                            name="theme"
                            type="radio"
                            checked={userPreferences.theme === theme}
                            onChange={() => updateUserPreferences({ theme: theme as 'light' | 'dark' })}
                            className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <label htmlFor={theme} className="ml-3 block text-sm font-medium text-gray-700 capitalize">
                            {theme}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Search Results</CardTitle>
                  <CardDescription>
                    Configure how search results are displayed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <label htmlFor="result-count" className="block text-sm font-medium text-gray-700 mb-2">
                      Number of results to show
                    </label>
                    <select
                      id="result-count"
                      name="result-count"
                      value={userPreferences.videosPerPage || 10}
                      onChange={(e) => updateUserPreferences({ videosPerPage: Number(e.target.value) })}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Playback Settings</CardTitle>
                  <CardDescription>
                    Control video playback behavior.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="autoplay"
                        name="autoplay"
                        type="checkbox"
                        checked={userPreferences.autoPlayPreviews || false}
                        onChange={(e) => updateUserPreferences({ autoPlayPreviews: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="autoplay" className="font-medium text-gray-700">Autoplay videos</label>
                      <p className="text-gray-500">Videos will automatically play when opened</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-6">
              <CategoryManager />
            </TabsContent>

            {/* Search History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Search History</CardTitle>
                    <CardDescription>
                      View and manage your recent searches.
                    </CardDescription>
                  </div>
                  {searchHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={clearSearchHistory}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </button>
                  )}
                </CardHeader>
                <CardContent>
                  {searchHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No search history</h3>
                      <p className="mt-1 text-sm text-gray-500">Your search history will appear here</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {searchHistory.map((item) => (
                        <li key={item.id} className="py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.query}</p>
                              <div className="mt-1 flex items-center text-sm text-gray-500">
                                <span>{item.resultCount} results</span>
                                <span className="mx-1">•</span>
                                <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                              Search Again
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Security</CardTitle>
                  <CardDescription>
                    Control your privacy settings and data preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="analytics"
                          name="analytics"
                          type="checkbox"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="analytics" className="font-medium text-gray-700">Analytics</label>
                        <p className="text-gray-500">Help improve the app by sharing anonymous usage data</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="cookies"
                          name="cookies"
                          type="checkbox"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="cookies" className="font-medium text-gray-700">Cookies</label>
                        <p className="text-gray-500">Allow cookies for enhanced functionality</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;