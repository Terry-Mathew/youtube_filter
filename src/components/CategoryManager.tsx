"use client";

import React, { useState, useMemo } from "react";
import { Plus, Search, Filter, Download, Upload, Loader2, Trash2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store";
import { CategoryForm } from "@/components/ui/CategoryForm";
import { CategoryListItem } from "@/components/ui/CategoryListItem";
import { Category, CategoryId } from "@/types";
import { cn } from "@/lib/utils";

interface CategoryManagerProps {
  className?: string;
}

interface DeleteConfirmationProps {
  category: Category | undefined;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteConfirmationDialog({
  category,
  isOpen,
  onClose,
  onConfirm,
  isDeleting
}: DeleteConfirmationProps) {
  if (!category) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                Are you sure you want to delete "{category.name}"?
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="my-4 rounded-md bg-amber-50 border border-amber-200 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">This action cannot be undone.</p>
              <ul className="list-disc list-inside space-y-1 text-amber-700">
                <li>The category and all its settings will be permanently removed</li>
                <li>Videos currently assigned to this category will become unassigned</li>
                <li>Category statistics and history will be lost</li>
              </ul>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Category
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CategoryManager({ className }: CategoryManagerProps) {
  const { 
    categories, 
    deleteCategory, 
    searchCategories,
    getFilteredCategories,
    updateCategoryFilters,
    categoryFilters,
    categoriesLoading
  } = useAppStore();

  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    category: Category | undefined;
    isOpen: boolean;
  }>({ category: undefined, isOpen: false });
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!localSearchQuery.trim()) {
      return getFilteredCategories();
    }
    
    const searchResults = searchCategories(localSearchQuery);
    return categories.filter(cat => searchResults.includes(cat.id));
  }, [categories, localSearchQuery, searchCategories, getFilteredCategories]);

  const handleCreateCategory = () => {
    setEditingCategory(undefined);
    setIsFormOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDeleteCategory = (categoryId: CategoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
      setDeleteConfirmation({
        category,
        isOpen: true
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.category) return;

    setIsDeleting(true);
    try {
      await deleteCategory(deleteConfirmation.category.id);
      
      // Success toast
      toast({
        title: "Category deleted",
        description: `"${deleteConfirmation.category.name}" has been successfully deleted.`,
      });

      // Close dialog
      setDeleteConfirmation({ category: undefined, isOpen: false });
    } catch (error) {
      console.error("Failed to delete category:", error);
      
      // Error toast
      toast({
        title: "Failed to delete category",
        description: error instanceof Error 
          ? error.message 
          : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteDialog = () => {
    if (!isDeleting) {
      setDeleteConfirmation({ category: undefined, isOpen: false });
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingCategory(undefined);
  };

  const handleFormSuccess = (category: Category) => {
    setIsFormOpen(false);
    setEditingCategory(undefined);
    
    // Success toast
    toast({
      title: editingCategory ? "Category updated" : "Category created",
      description: `"${category.name}" has been successfully ${editingCategory ? 'updated' : 'created'}.`,
    });
  };

  const handleSearchChange = (value: string) => {
    setLocalSearchQuery(value);
    updateCategoryFilters({ searchQuery: value });
  };

  const isEmptyState = categories.length === 0;
  const hasNoResults = filteredCategories.length === 0 && localSearchQuery.trim();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Section */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Learning Categories</h2>
          <p className="text-gray-600 mt-1">
            Organize your content into categories for better learning experiences.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isEmptyState}
            className="hidden sm:flex"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={handleCreateCategory}>
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
        </div>
      </div>

      {/* Search and Filter Section */}
      {!isEmptyState && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search categories by name, description, or tags..."
                  value={localSearchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
            
            {/* Search Results Summary */}
            {localSearchQuery.trim() && (
              <div className="mt-4 text-sm text-gray-600">
                {hasNoResults 
                  ? `No categories found for "${localSearchQuery}"`
                  : `${filteredCategories.length} category${filteredCategories.length !== 1 ? 'ies' : ''} found for "${localSearchQuery}"`
                }
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {categoriesLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading categories...</span>
        </div>
      )}

      {/* Empty State */}
      {isEmptyState && !categoriesLoading && (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">No Categories Yet</CardTitle>
            <CardDescription className="text-base max-w-md mx-auto">
              Create your first category to start organizing your learning content. 
              Categories help you filter and discover relevant videos more efficiently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateCategory} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Category
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Search Results */}
      {hasNoResults && !categoriesLoading && (
        <Card className="text-center py-8">
          <CardHeader>
            <CardTitle className="text-lg text-gray-600">No Results Found</CardTitle>
            <CardDescription>
              Try adjusting your search terms or create a new category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateCategory} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create Category
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      {!isEmptyState && !hasNoResults && !categoriesLoading && (
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <CategoryListItem
              key={category.id}
              category={category}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
            />
          ))}
        </div>
      )}

      {/* Statistics Footer */}
      {!isEmptyState && !categoriesLoading && (
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
                <div className="text-sm text-gray-600">Total Categories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {categories.filter(cat => cat.isActive).length}
                </div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {categories.reduce((sum, cat) => sum + (cat.videoCount || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Videos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {categories.filter(cat => cat.isAiSuggested).length}
                </div>
                <div className="text-sm text-gray-600">AI Suggested</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Form Modal */}
      <CategoryForm
        category={editingCategory}
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        category={deleteConfirmation.category}
        isOpen={deleteConfirmation.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
} 