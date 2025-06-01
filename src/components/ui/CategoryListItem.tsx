"use client";

import React from "react";
import { Edit, Trash2, Calendar, FileVideo, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Category, CategoryId } from "@/types";

interface CategoryListItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: CategoryId) => void;
  isLoading?: boolean;
}

const colorVariants = {
  blue: "bg-blue-100 border-blue-200 text-blue-800",
  green: "bg-green-100 border-green-200 text-green-800",
  red: "bg-red-100 border-red-200 text-red-800",
  yellow: "bg-yellow-100 border-yellow-200 text-yellow-800",
  purple: "bg-purple-100 border-purple-200 text-purple-800",
  pink: "bg-pink-100 border-pink-200 text-pink-800",
  indigo: "bg-indigo-100 border-indigo-200 text-indigo-800",
  gray: "bg-gray-100 border-gray-200 text-gray-800",
  orange: "bg-orange-100 border-orange-200 text-orange-800",
  teal: "bg-teal-100 border-teal-200 text-teal-800",
} as const;

export function CategoryListItem({ 
  category, 
  onEdit, 
  onDelete, 
  isLoading = false 
}: CategoryListItemProps) {
  const handleEdit = () => {
    onEdit(category);
  };

  const handleDelete = () => {
    onDelete(category.id);
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Color Indicator */}
            <div 
              className={cn(
                "w-4 h-4 rounded-full border-2 flex-shrink-0",
                colorVariants[category.color || "blue"]
              )}
              aria-label={`Category color: ${category.color}`}
            />
            
            {/* Category Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 truncate">
                {category.name}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                {category.description}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 flex-shrink-0 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              disabled={isLoading}
              className="h-8 w-8 p-0"
              aria-label="Edit category"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              aria-label="Delete category"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Category Criteria */}
        <div className="mb-4">
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
            <span className="font-medium">Search Criteria:</span> {category.criteria}
          </p>
        </div>

        {/* Tags */}
        {category.tags && category.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-3 w-3 text-gray-500" />
              {category.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {category.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{category.tags.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <FileVideo className="h-4 w-4" />
            <span>
              {category.videoCount || 0} video{(category.videoCount || 0) !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>
              Updated {formatDistanceToNow(category.updatedAt, { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Active Status */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div 
              className={cn(
                "w-2 h-2 rounded-full",
                category.isActive ? "bg-green-500" : "bg-gray-400"
              )}
            />
            <span className="text-xs text-gray-600">
              {category.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {category.isAiSuggested && (
            <Badge variant="outline" className="text-xs">
              AI Suggested
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 