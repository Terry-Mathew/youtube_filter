import React, { useState } from 'react';
import { CategoryForm } from './ui/CategoryForm';
import { Button } from './ui/button';
import { Category } from '@/types';

export function CategoryFormTest() {
  const [isOpen, setIsOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | undefined>();

  const handleSuccess = (category: Category) => {
    console.log('Category saved:', category);
  };

  const openCreateForm = () => {
    setEditCategory(undefined);
    setIsOpen(true);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">CategoryForm Test</h1>
      
      <Button onClick={openCreateForm}>
        Create New Category
      </Button>

      <CategoryForm
        category={editCategory}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
} 