import api from './axiosInstance';

export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const register = (name, email, password) =>
  api.post('/auth/register', { name, email, password });

export const verifyOtp = (email, otp) =>
  api.post('/auth/verify-otp', { email, otp });

export const resendOtp = (email) =>
  api.post('/auth/resend-otp', { email });

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email });

export const verifyResetOtp = (email, otp) =>
  api.post('/auth/verify-reset-otp', { email, otp });

export const resetPassword = (resetToken, newPassword) =>
  api.post('/auth/reset-password', { resetToken, newPassword });
