import api from './axiosInstance';

export const getPantry = () => api.get('/pantry');

export const addPantryItem = (item) => api.post('/pantry', item);

export const deletePantryItem = (id) => api.delete(`/pantry/${id}`);

export const clearPantry = () => api.delete('/pantry');
