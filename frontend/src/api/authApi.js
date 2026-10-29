import api from './axiosInstance';

export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const register = (name, email, password) =>
  api.post('/auth/register', { name, email, password });

export const verifyOtp = (email, otp) =>
  api.post('/auth/verify-otp', { email, otp });

export const resendOtp = (email) =>
  api.post('/auth/resend-otp', { email });
