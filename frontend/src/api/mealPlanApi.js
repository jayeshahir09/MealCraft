import api from './axiosInstance';

export const getMealPlan = (weekStart) =>
  api.get(`/mealplans/${weekStart}`);

export const assignRecipe = (weekStart, dayOfWeek, mealType, recipeId) =>
  api.post(`/mealplans/${weekStart}/assign`, { dayOfWeek, mealType, recipeId });

export const removeFromSlot = (weekStart, dayOfWeek, mealType) =>
  api.delete(`/mealplans/${weekStart}/slot`, { params: { dayOfWeek, mealType } });

export const clearWeek = (weekStart) =>
  api.delete(`/mealplans/${weekStart}/clear`);
