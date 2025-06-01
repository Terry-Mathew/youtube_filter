import { z } from "zod";
import { 
  MAX_CATEGORY_NAME_LENGTH, 
  MAX_CATEGORY_DESCRIPTION_LENGTH, 
  MAX_CATEGORY_CRITERIA_LENGTH,
  CategoryColor 
} from "@/types";

export const categoryFormSchema = z.object({
  name: z.string()
    .min(1, "Category name is required")
    .max(MAX_CATEGORY_NAME_LENGTH, `Name must be less than ${MAX_CATEGORY_NAME_LENGTH} characters`)
    .trim(),
  description: z.string()
    .min(1, "Description is required")
    .max(MAX_CATEGORY_DESCRIPTION_LENGTH, `Description must be less than ${MAX_CATEGORY_DESCRIPTION_LENGTH} characters`)
    .trim(),
  criteria: z.string()
    .min(1, "Search criteria is required")
    .max(MAX_CATEGORY_CRITERIA_LENGTH, `Criteria must be less than ${MAX_CATEGORY_CRITERIA_LENGTH} characters`)
    .trim(),
  color: z.enum(["blue", "green", "red", "yellow", "purple", "pink", "indigo", "gray", "orange", "teal"] as const),
  icon: z.string().optional(),
  tags: z.array(z.string().min(1, "Tag cannot be empty")).min(1, "At least one tag is required"),
});

export type CategoryFormData = z.infer<typeof categoryFormSchema>; 