import api from './axiosInstance';

export const generateShoppingList = (mealPlanId) =>
  api.post(`/shopping-list/generate/${mealPlanId}`);

export const getShoppingList = (id) =>
  api.get(`/shopping-list/${id}`);

export const toggleItem = (itemId) =>
  api.patch(`/shopping-list/items/${itemId}/toggle`);

export const addManualItem = (listId, ingredientName) =>
  api.post(`/shopping-list/${listId}/items`, { ingredientName });

export const getPreferences = () =>
  api.get('/preferences');

export const updatePreferences = (prefs) =>
  api.put('/preferences', prefs);

export const getAnalytics = () =>
  api.get('/analytics');

export const logCookedRecipe = (recipeId, notes) =>
  api.post(`/analytics/log/${recipeId}`, { notes });
