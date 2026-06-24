export type Recipe = {
  id: string;
  userId?: string;
  title: string;
  cookTime: string;
  servings: string;
  source: string;
  sourceText?: string | null;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  color: string;
  ingredients: string[];
  steps: string[];
};