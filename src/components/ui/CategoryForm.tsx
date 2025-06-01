"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KeywordInput } from "@/components/ui/KeywordInput";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store";
import { Category, CategoryColor } from "@/types";
import { categoryFormSchema, CategoryFormData } from "@/lib/validations/category";

interface CategoryFormProps {
  category?: Category;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (category: Category) => void;
}

export function CategoryForm({ category, isOpen, onClose, onSuccess }: CategoryFormProps) {
  const { createCategory, updateCategory, getCategoryById } = useAppStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      criteria: "",
      color: "blue",
      icon: "",
      tags: [""],
    },
  });

  const isEditMode = Boolean(category);

  React.useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        description: category.description,
        criteria: category.criteria,
        color: category.color || "blue",
        icon: category.icon || "",
        tags: category.tags ? [...category.tags] : [""],
      });
    } else {
      form.reset({
        name: "",
        description: "",
        criteria: "",
        color: "blue",
        icon: "",
        tags: [""],
      });
    }
    // Clear any previous submit errors when category changes
    setSubmitError(null);
  }, [category, form]);

  const onSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Filter out empty tags
      const filteredData = {
        ...data,
        tags: data.tags.filter(tag => tag.trim() !== ""),
      };

      if (isEditMode && category) {
        await updateCategory({
          id: category.id,
          updates: filteredData,
        });
        onSuccess?.(category);
      } else {
        const newCategoryId = await createCategory(filteredData);
        const newCategory = getCategoryById(newCategoryId);
        if (newCategory) {
          onSuccess?.(newCategory);
        }
      }
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to save category:", error);
      
      // Set specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes("duplicate") || error.message.includes("already exists")) {
          setSubmitError("A category with this name already exists. Please choose a different name.");
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          setSubmitError("Network error. Please check your connection and try again.");
        } else if (error.message.includes("validation")) {
          setSubmitError("Please check your input and try again.");
        } else {
          setSubmitError(error.message);
        }
      } else {
        setSubmitError("An unexpected error occurred. Please try again.");
      }

      // Show error toast as well
      toast({
        title: "Failed to save category",
        description: error instanceof Error 
          ? error.message 
          : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSubmitError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Category" : "Create New Category"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Update the category details below."
              : "Create a new category to organize your learning content."
            }
          </DialogDescription>
        </DialogHeader>
        
        {/* Error Display */}
        {submitError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 mb-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Error saving category</p>
                <p className="mt-1">{submitError}</p>
              </div>
            </div>
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Category Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., React Development"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A clear, descriptive name for your category.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what kind of content this category will contain..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Help others understand what this category is for.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Search Criteria */}
            <FormField
              control={form.control}
              name="criteria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search Criteria</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Keywords and criteria for AI to categorize videos..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Define criteria for AI to automatically categorize videos.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Selection */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full p-2 border border-input bg-background rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="blue">Blue</option>
                      <option value="green">Green</option>
                      <option value="red">Red</option>
                      <option value="yellow">Yellow</option>
                      <option value="purple">Purple</option>
                      <option value="pink">Pink</option>
                      <option value="indigo">Indigo</option>
                      <option value="gray">Gray</option>
                      <option value="orange">Orange</option>
                      <option value="teal">Teal</option>
                    </select>
                  </FormControl>
                  <FormDescription>
                    Choose a color to identify this category.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Icon (Optional) */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., book, code, video"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional icon identifier for visual representation.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags using KeywordInput */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keywords/Tags</FormLabel>
                  <FormControl>
                    <KeywordInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add relevant keywords..."
                      suggestions={["react", "javascript", "tutorial", "frontend", "backend", "programming", "web development", "coding", "software", "technology"]}
                    />
                  </FormControl>
                  <FormDescription>
                    Add keywords to help categorize and find content.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {isEditMode ? (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 