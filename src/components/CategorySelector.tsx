import React, { useState } from 'react';
import { ChevronDown, FolderOpen, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCategoriesStore } from '../store/categories';
import { Category, CategoryId } from '../types';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface CategorySelectorProps {
  className?: string;
  variant?: 'header' | 'sidebar' | 'dropdown';
  showVideoCount?: boolean;
  showCreateButton?: boolean;
}

interface CategoryItemProps {
  category: Category;
  isActive: boolean;
  onClick: (category: Category) => void;
  showVideoCount?: boolean;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  isActive,
  onClick,
  showVideoCount = true
}) => {
  return (
    <DropdownMenuItem
      onClick={() => onClick(category)}
      className={cn(
        "flex items-center justify-between cursor-pointer py-2",
        isActive && "bg-primary/10 text-primary"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className={cn(
            "w-3 h-3 rounded-full flex-shrink-0",
            `bg-${category.color}-500`
          )}
          style={{ backgroundColor: category.color }}
        />
        <span className="truncate font-medium">{category.name}</span>
      </div>
      
      {showVideoCount && (
        <Badge 
          variant={isActive ? "default" : "secondary"}
          className="ml-2 text-xs"
        >
          {category.videoCount || 0}
        </Badge>
      )}
    </DropdownMenuItem>
  );
};

const CategorySelector: React.FC<CategorySelectorProps> = ({
  className,
  variant = 'header',
  showVideoCount = true,
  showCreateButton = true
}) => {
  const { 
    categories, 
    selectedCategory,
    selectCategory,
    isLoading: categoriesLoading,
    getCategory
  } = useCategoriesStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const activeCategory = selectedCategory ? getCategory(selectedCategory) : null;

  const handleCategorySelect = (category: Category) => {
    selectCategory(category.id);
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    selectCategory(null);
    setIsOpen(false);
  };

  const handleCreateCategory = () => {
    // TODO: This will trigger the CategoryManager modal when integrated
    setIsOpen(false);
    console.log('Create category clicked - will integrate with CategoryManager');
  };

  if (categoriesLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="animate-pulse">
          <div className="h-9 w-32 bg-gray-200 rounded-md"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-between min-w-[140px]",
              variant === 'header' && "bg-white border-gray-200"
            )}
            disabled={categoriesLoading}
          >
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {activeCategory?.name || 'All Categories'}
              </span>
            </div>
            
            <div className="flex items-center gap-1 ml-2">
              {showVideoCount && activeCategory && (
                <Badge variant="secondary" className="text-xs">
                  {activeCategory.videoCount || 0}
                </Badge>
              )}
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent 
          align="start" 
          className="w-56"
          sideOffset={4}
        >
          <DropdownMenuLabel>Learning Categories</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* All Categories Option */}
          <DropdownMenuItem
            onClick={handleClearSelection}
            className={cn(
              "flex items-center justify-between cursor-pointer py-2",
              !selectedCategory && "bg-primary/10 text-primary"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
              <span className="font-medium">All Categories</span>
            </div>
            {showVideoCount && (
              <Badge 
                variant={!selectedCategory ? "default" : "secondary"}
                className="text-xs"
              >
                {categories.reduce((sum, cat) => sum + (cat.videoCount || 0), 0)}
              </Badge>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Categories List */}
          {categories.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <FolderOpen className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 mb-3">No categories yet</p>
              <p className="text-xs text-gray-400 mb-3">
                Create your first category to organize your learning content
              </p>
              {showCreateButton && (
                <Button
                  onClick={handleCreateCategory}
                  size="sm"
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Create Category
                </Button>
              )}
            </div>
          ) : (
            <>
              {categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  isActive={selectedCategory === category.id}
                  onClick={handleCategorySelect}
                  showVideoCount={showVideoCount}
                />
              ))}
              
              {showCreateButton && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleCreateCategory}
                    className="flex items-center gap-2 cursor-pointer text-primary hover:text-primary"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Category</span>
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default CategorySelector; 