import api from './axiosInstance';

export const suggestRecipes = (payload) =>
  api.post('/recipes/suggest', payload);

export const getSavedRecipes = (params) =>
  api.get('/recipes', { params });

export const getRecipe = (id) =>
  api.get(`/recipes/${id}`);

export const getAiCredits = () =>
  api.get('/recipes/ai-credits');

export const saveRecipe = (recipe) =>
  api.post('/recipes', recipe);

export const deleteRecipe = (id) =>
  api.delete(`/recipes/${id}`);
