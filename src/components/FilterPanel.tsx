// FilterPanel Component - Advanced video filtering and sorting interface
// TASK_008_002: Advanced video filtering and sorting with Supabase integration

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  X,
  ChevronDown,
  RotateCcw,
  Search,
  Calendar,
  Clock,
  Users,
  Star,
  Settings,
  TrendingUp,
  Bookmark,
  SlidersHorizontal,
} from 'lucide-react';

// Available shadcn/ui components
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

// Types and utilities
import type {
  VideoFilters,
  VideoSort,
  FilterPreset,
  DurationPreset,
  DatePreset,
  VideoQualityFilter,
  VideoSortField,
  SortOrder,
  FilterStats,
  FilterValidation,
} from '../types/video-filters';
import {
  DEFAULT_FILTER_PRESETS,
  SORT_OPTIONS,
  DURATION_PRESET_OPTIONS,
  DATE_PRESET_OPTIONS,
  QUALITY_OPTIONS,
  VideoFilterUtils,
} from '../types/video-filters';
import { useAppStore } from '../store';
import { cn } from '../utils/cn';

interface FilterPanelProps {
  className?: string;
  /** Whether to show as mobile overlay or desktop panel */
  variant?: 'overlay' | 'panel';
  /** Callback when filters are applied */
  onFiltersChange?: (filters: VideoFilters, sort: VideoSort) => void;
  /** Current video count for display */
  resultCount?: number;
  /** Filter statistics for insights */
  filterStats?: FilterStats;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  className,
  variant = 'panel',
  onFiltersChange,
  resultCount = 0,
  filterStats,
}) => {
  // Store access
  const { categories, getSelectedCategories, videos } = useAppStore();

  // Filter state
  const [filters, setFilters] = useState<VideoFilters>({});
  const [sort, setSort] = useState<VideoSort>({ field: 'relevance', order: 'desc' });
  const [activePreset, setActivePreset] = useState<string>('most-relevant');

  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['sort', 'categories'])
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState('filters');

  // Validation state
  const validation = useMemo(() => VideoFilterUtils.validateFilters(filters), [filters]);

  // Calculate current result count and stats
  const currentStats = useMemo(() => {
    if (filterStats) return filterStats;
    
    // Calculate from current videos if no stats provided
    return {
      totalVideos: videos.length,
      filteredVideos: resultCount,
      averageRelevanceScore: videos.length > 0 
        ? videos.reduce((sum, v) => sum + v.relevanceScore, 0) / videos.length 
        : 0,
      durationDistribution: {
        any: videos.length,
        short: videos.filter(v => v.duration && parseDuration(v.duration) < 240).length,
        medium: videos.filter(v => v.duration && parseDuration(v.duration) >= 240 && parseDuration(v.duration) < 1200).length,
        long: videos.filter(v => v.duration && parseDuration(v.duration) >= 1200).length,
        custom: 0,
      },
      qualityDistribution: {
        excellent: videos.filter(v => v.quality === 'excellent').length,
        high: videos.filter(v => v.quality === 'high').length,
        medium: videos.filter(v => v.quality === 'medium').length,
        low: videos.filter(v => v.quality === 'low').length,
      },
      dateDistribution: {
        today: 0, // Would need to calculate based on publishedAt
        week: 0,
        month: 0,
        year: 0,
        older: 0,
      },
    };
  }, [videos, resultCount, filterStats]);

  // Helper functions
  const parseDuration = (duration: string): number => {
    // Simple duration parser for "mm:ss" format
    const parts = duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  const applyPreset = useCallback((preset: FilterPreset) => {
    setFilters(preset.filters);
    setSort(preset.sort);
    setActivePreset(preset.id);
    onFiltersChange?.(preset.filters, preset.sort);
  }, [onFiltersChange]);

  const updateFilters = useCallback((newFilters: Partial<VideoFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setActivePreset('custom');
    onFiltersChange?.(updatedFilters, sort);
  }, [filters, sort, onFiltersChange]);

  const updateSort = useCallback((newSort: Partial<VideoSort>) => {
    const updatedSort = { ...sort, ...newSort };
    setSort(updatedSort);
    onFiltersChange?.(filters, updatedSort);
  }, [filters, sort, onFiltersChange]);

  const resetFilters = useCallback(() => {
    const defaultPreset = DEFAULT_FILTER_PRESETS.find(p => p.isDefault) || DEFAULT_FILTER_PRESETS[0];
    applyPreset(defaultPreset);
  }, [applyPreset]);

  const renderFilterSection = (
    title: string,
    icon: React.ReactNode,
    sectionKey: string,
    children: React.ReactNode,
    isAdvanced = false
  ) => {
    if (isAdvanced && !showAdvanced) return null;

    const isExpanded = expandedSections.has(sectionKey);

    return (
      <div className="border rounded-lg">
        <Button 
          variant="ghost" 
          className="w-full justify-between p-3 h-auto"
          onClick={() => toggleSection(sectionKey)}
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{title}</span>
          </div>
          <ChevronDown 
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isExpanded ? "rotate-180" : ""
            )}
          />
        </Button>
        {isExpanded && (
          <div className="p-3 pt-0 space-y-3 border-t">
            {children}
          </div>
        )}
      </div>
    );
  };

  const SelectField: React.FC<{
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
  }> = ({ value, onValueChange, options, placeholder }) => {
    return (
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border rounded-md bg-background"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  const SwitchField: React.FC<{
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }> = ({ checked, onCheckedChange }) => {
    return (
      <button
        type="button"
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-gray-200"
        )}
        onClick={() => onCheckedChange(!checked)}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    );
  };

  const SliderField: React.FC<{
    value: number;
    onValueChange: (value: number) => void;
    min?: number;
    max: number;
    step?: number;
  }> = ({ value, onValueChange, min = 0, max, step = 1 }) => {
    return (
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
    );
  };

  const filterContent = (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="font-semibold">Filters & Sort</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          {variant === 'overlay' && (
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {resultCount.toLocaleString()} videos found
            </span>
            <Badge variant="outline">
              {VideoFilterUtils.describeFilters(filters)}
            </Badge>
          </div>
          {currentStats.filteredVideos !== currentStats.totalVideos && (
            <div className="mt-2 text-xs text-muted-foreground">
              Filtered from {currentStats.totalVideos.toLocaleString()} total videos
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Messages */}
      {!validation.isValid && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <div className="space-y-1">
              {validation.errors.map((error, i) => (
                <p key={i} className="text-sm text-destructive">{error}</p>
              ))}
              {validation.warnings.map((warning, i) => (
                <p key={i} className="text-sm text-yellow-600">{warning}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Presets */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Quick Filters</Label>
        <div className="grid grid-cols-2 gap-2">
          {DEFAULT_FILTER_PRESETS.slice(0, 4).map((preset) => (
            <Button
              key={preset.id}
              variant={activePreset === preset.id ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(preset)}
              className="text-xs h-8"
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="border-t pt-4" />

      {/* Tabs for organization */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="sort">Sort & View</TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="space-y-4 mt-4">
          {/* Categories Filter */}
          {renderFilterSection(
            "Categories",
            <Search className="h-4 w-4" />,
            "categories",
            <div className="space-y-2">
              <Label className="text-sm">Selected Categories</Label>
              <div className="text-sm text-muted-foreground">
                {getSelectedCategories().length > 0 
                  ? `${getSelectedCategories().length} categories selected`
                  : "All categories"}
              </div>
            </div>
          )}

          {/* Duration Filter */}
          {renderFilterSection(
            "Duration",
            <Clock className="h-4 w-4" />,
            "duration",
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Duration Range</Label>
                <SelectField
                  value={filters.duration?.preset || 'any'}
                  onValueChange={(value) => 
                    updateFilters({ 
                      duration: { preset: value as DurationPreset }
                    })
                  }
                  options={DURATION_PRESET_OPTIONS}
                />
              </div>

              {/* Custom duration range */}
              {filters.duration?.preset === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Min (sec)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.duration?.range?.min || ''}
                      onChange={(e) => {
                        const preset = filters.duration?.preset || 'custom';
                        updateFilters({
                          duration: {
                            preset,
                            range: {
                              ...filters.duration?.range,
                              min: parseInt(e.target.value) || 0
                            }
                          }
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max (sec)</Label>
                    <Input
                      type="number"
                      placeholder="Unlimited"
                      value={filters.duration?.range?.max || ''}
                      onChange={(e) => {
                        const preset = filters.duration?.preset || 'custom';
                        updateFilters({
                          duration: {
                            preset,
                            range: {
                              ...filters.duration?.range,
                              max: parseInt(e.target.value) || undefined
                            }
                          }
                        });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date Filter */}
          {renderFilterSection(
            "Publication Date",
            <Calendar className="h-4 w-4" />,
            "date",
            <div className="space-y-2">
              <Label className="text-sm">Published</Label>
              <SelectField
                value={filters.publishedDate?.preset || 'any'}
                onValueChange={(value) => 
                  updateFilters({ 
                    publishedDate: { preset: value as DatePreset }
                  })
                }
                options={DATE_PRESET_OPTIONS}
              />
            </div>
          )}

          {/* Quality Filter */}
          {renderFilterSection(
            "Quality",
            <Star className="h-4 w-4" />,
            "quality",
            <div className="space-y-2">
              <Label className="text-sm">Video Quality</Label>
              <div className="grid grid-cols-2 gap-2">
                {QUALITY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.quality?.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const current = filters.quality || [];
                      const updated = current.includes(option.value)
                        ? current.filter(q => q !== option.value)
                        : [...current, option.value];
                      updateFilters({ quality: updated });
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* View Count Filter */}
          {renderFilterSection(
            "Popularity",
            <TrendingUp className="h-4 w-4" />,
            "views",
            <div className="space-y-3">
              <Label className="text-sm">Minimum Views</Label>
              <div className="px-2">
                <SliderField
                  value={filters.viewCount?.min || 0}
                  onValueChange={(value) => 
                    updateFilters({ 
                      viewCount: { ...filters.viewCount, min: value }
                    })
                  }
                  max={1000000}
                  step={1000}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0</span>
                  <span>{(filters.viewCount?.min || 0).toLocaleString()}</span>
                  <span>1M+</span>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Options Toggle */}
          <div className="flex items-center justify-between py-2">
            <Label className="text-sm">Advanced Options</Label>
            <SwitchField
              checked={showAdvanced}
              onCheckedChange={setShowAdvanced}
            />
          </div>

          {/* Caption Filter */}
          {renderFilterSection(
            "Accessibility",
            <Settings className="h-4 w-4" />,
            "captions",
            <div className="flex items-center justify-between">
              <Label className="text-sm">Has Captions</Label>
              <SwitchField
                checked={filters.hasCaptions || false}
                onCheckedChange={(checked) => 
                  updateFilters({ hasCaptions: checked ? true : undefined })
                }
              />
            </div>,
            true
          )}

          {/* Relevance Score Filter */}
          {renderFilterSection(
            "AI Relevance",
            <SlidersHorizontal className="h-4 w-4" />,
            "relevance",
            <div className="space-y-3">
              <Label className="text-sm">Minimum Relevance Score</Label>
              <div className="px-2">
                <SliderField
                  value={filters.minRelevanceScore || 0}
                  onValueChange={(value) => 
                    updateFilters({ minRelevanceScore: value })
                  }
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span>{filters.minRelevanceScore || 0}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>,
            true
          )}
        </TabsContent>

        <TabsContent value="sort" className="space-y-4 mt-4">
          {/* Sort Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Sort By</Label>
            <SelectField
              value={sort.field}
              onValueChange={(value) => 
                updateSort({ field: value as VideoSortField })
              }
              options={SORT_OPTIONS.map(opt => ({ value: opt.field, label: opt.label }))}
            />
          </div>

          {/* Sort Order */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">Reverse Order</Label>
            <SwitchField
              checked={sort.order === 'asc'}
              onCheckedChange={(checked) => 
                updateSort({ order: checked ? 'asc' : 'desc' })
              }
            />
          </div>

          {/* Filter Statistics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Filter Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Average Relevance:</span>
                <span>{Math.round(currentStats.averageRelevanceScore)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Quality Distribution:</span>
                <span>{Object.values(currentStats.qualityDistribution).reduce((a, b) => a + b, 0)} videos</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (variant === 'overlay') {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {Object.keys(filters).length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {Object.keys(filters).length}
            </Badge>
          )}
        </Button>
        
        {isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end">
            <div className="bg-background w-80 h-full overflow-y-auto shadow-lg">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Video Filters</h2>
                  <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {filterContent}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {filterContent}
      </CardContent>
    </Card>
  );
};

export default FilterPanel;