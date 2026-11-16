import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { login, forgotPassword, verifyResetOtp, resetPassword } from '../api/authApi';
import toast from 'react-hot-toast';
import {
  Mail,
  Lock,
  ArrowRight,
  Sun,
  Moon,
  ChefHat,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  RotateCw,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

export default function LoginPage() {
  // Mode: 'LOGIN' | 'FORGOT_EMAIL' | 'FORGOT_OTP' | 'FORGOT_NEW_PASSWORD'
  const [mode, setMode] = useState('LOGIN');

  // Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password Flow State
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    forgotEmail: '',
    otp: '',
    newPassword: '',
    confirmNewPassword: '',
    general: ''
  });

  const otpInputsRef = useRef([]);
  const { loginSuccess } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Cooldown timer for OTP resend
  useEffect(() => {
    let timer;
    if (mode === 'FORGOT_OTP' && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, cooldown]);

  // Focus the first OTP box when entering FORGOT_OTP mode
  useEffect(() => {
    if (mode === 'FORGOT_OTP' && otpInputsRef.current[0]) {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    }
  }, [mode]);

  // ----------------------------------------------------
  // LOGIN HANDLERS
  // ----------------------------------------------------
  const validateLogin = () => {
    const newErrors = { ...errors, email: '', password: '', general: '' };
    let isValid = true;
    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail) {
      newErrors.email = 'Email address is required';
      isValid = false;
    } else if (!emailRegex.test(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;

    const cleanEmail = email.trim();
    setLoading(true);
    setErrors(prev => ({ ...prev, email: '', password: '', general: '' }));

    try {
      const res = await login(cleanEmail, password);
      loginSuccess(res.data);
      toast.success(`Welcome back, ${res.data.name}`);
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 401) {
        const errorMsg = data?.message || 'Invalid email or password. Please check your credentials and try again.';
        setErrors(prev => ({
          ...prev,
          general: errorMsg,
          password: 'Incorrect password or unverified account'
        }));
        toast.error(errorMsg);
      } else if (data?.errors && typeof data.errors === 'object') {
        const fieldErrors = { ...errors, general: data.message || 'Please correct the highlighted fields' };
        if (data.errors.email) fieldErrors.email = data.errors.email;
        if (data.errors.password) fieldErrors.password = data.errors.password;
        setErrors(fieldErrors);
        toast.error(fieldErrors.general);
      } else {
        const errorMsg = data?.message || err.message || 'Unable to sign in. Please try again.';
        setErrors(prev => ({ ...prev, general: errorMsg }));
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // STEP 1: REQUEST OTP (FORGOT_EMAIL)
  // ----------------------------------------------------
  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail) {
      setErrors(prev => ({ ...prev, forgotEmail: 'Email address is required' }));
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setErrors(prev => ({ ...prev, forgotEmail: 'Please enter a valid email address' }));
      return;
    }

    setLoading(true);
    setErrors(prev => ({ ...prev, forgotEmail: '', general: '' }));

    try {
      const res = await forgotPassword(cleanEmail);
      toast.success(res.data?.message || 'Verification code sent to your email.');
      setMode('FORGOT_OTP');
      setCooldown(60);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || err.message || 'Failed to send reset code. Please try again.';
      setErrors(prev => ({ ...prev, general: msg, forgotEmail: msg }));
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // STEP 2: VERIFY OTP (FORGOT_OTP)
  // ----------------------------------------------------
  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue && value !== '') return;

    const newOtp = [...otp];
    newOtp[index] = cleanValue.slice(-1);
    setOtp(newOtp);

    if (errors.otp || errors.general) {
      setErrors(prev => ({ ...prev, otp: '', general: '' }));
    }

    if (cleanValue && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasteData.length; i++) {
      newOtp[i] = pasteData[i];
    }
    setOtp(newOtp);

    if (errors.otp || errors.general) {
      setErrors(prev => ({ ...prev, otp: '', general: '' }));
    }

    const nextIndex = Math.min(pasteData.length, 5);
    otpInputsRef.current[nextIndex]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const fullOtp = otp.join('');

    if (fullOtp.length !== 6) {
      setErrors(prev => ({ ...prev, otp: 'Please enter all 6 digits of the verification code.' }));
      return;
    }

    setLoading(true);
    setErrors(prev => ({ ...prev, otp: '', general: '' }));

    try {
      const res = await verifyResetOtp(forgotEmail.trim(), fullOtp);
      const token = res.data?.resetToken;
      if (!token) {
        throw new Error('No reset session token received. Please try again.');
      }
      setResetToken(token);
      toast.success('Code verified! Please create your new password.');
      setMode('FORGOT_NEW_PASSWORD');
    } catch (err) {
      const data = err.response?.data;
      const errorMsg = data?.message || err.message || 'Invalid or expired verification code.';
      setErrors(prev => ({ ...prev, otp: errorMsg, general: errorMsg }));
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const res = await forgotPassword(forgotEmail.trim());
      toast.success(res.data?.message || 'A new verification code has been sent.');
      setCooldown(60);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      const data = err.response?.data;
      toast.error(data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // ----------------------------------------------------
  // STEP 3: SET NEW PASSWORD (FORGOT_NEW_PASSWORD)
  // PASTE IS STRICTLY PROHIBITED AS REQUESTED
  // ----------------------------------------------------
  const handlePasteForbidden = (e) => {
    e.preventDefault();
    toast.error('Pasting is disabled for security. Please type your password manually.');
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const newErrors = { ...errors, newPassword: '', confirmNewPassword: '', general: '' };
    let isValid = true;

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
      isValid = false;
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
      isValid = false;
    } else if (newPassword.length > 100) {
      newErrors.newPassword = 'Password cannot exceed 100 characters';
      isValid = false;
    }

    if (!confirmNewPassword) {
      newErrors.confirmNewPassword = 'Please confirm your new password';
      isValid = false;
    } else if (newPassword !== confirmNewPassword) {
      newErrors.confirmNewPassword = 'Passwords do not match';
      isValid = false;
    }

    if (!isValid) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors(prev => ({ ...prev, newPassword: '', confirmNewPassword: '', general: '' }));

    try {
      const res = await resetPassword(resetToken, newPassword);
      toast.success(res.data?.message || 'Password successfully reset! Please sign in.');
      // Pre-fill login email with the recovered email
      setEmail(forgotEmail);
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetToken('');
      setMode('LOGIN');
    } catch (err) {
      const data = err.response?.data;
      const errorMsg = data?.message || err.message || 'Failed to reset password. Please try again.';
      setErrors(prev => ({ ...prev, general: errorMsg }));
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem', position: 'relative' }}>
      {/* Theme Toggle Button */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10 }}>
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          {isDark ? <Sun size={17} className="sun-icon" /> : <Moon size={17} className="moon-icon" />}
          <span className="theme-toggle-label">{isDark ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '440px',
        borderRadius: '1.5rem',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-ambient-lg)',
        margin: '1rem'
      }}>
        {/* ======================================================== */}
        {/* VIEW 1: LOGIN FORM                                       */}
        {/* ======================================================== */}
        {mode === 'LOGIN' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 1.25rem',
                borderRadius: '1rem',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 16px rgba(255, 120, 84, 0.3)'
              }}>
                <ChefHat size={32} strokeWidth={2.2} />
              </div>
              <h1 style={{
                fontSize: '1.85rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--on-background)',
                marginBottom: '0.4rem',
                letterSpacing: '-0.01em'
              }}>
                Welcome Back
              </h1>
              <p style={{ fontSize: '0.95rem', color: 'var(--on-surface-variant)', margin: 0 }}>
                Sign in to your MealCraft account
              </p>
            </div>

            {errors.general && (
              <div className="auth-error-banner" role="alert">
                <AlertCircle size={18} />
                <span>{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label htmlFor="login-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: errors.email ? 'var(--error)' : 'var(--text-muted)' }} />
                  <input
                    id="login-email"
                    type="email"
                    className={`form-input ${errors.email ? 'is-invalid' : ''}`}
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email || errors.general) setErrors(prev => ({ ...prev, email: '', general: '' }));
                    }}
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                  />
                </div>
                {errors.email && (
                  <div className="form-field-error">
                    <AlertCircle size={14} />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label htmlFor="login-password" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setErrors({ email: '', password: '', forgotEmail: '', otp: '', newPassword: '', confirmNewPassword: '', general: '' });
                      setMode('FORGOT_EMAIL');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      color: 'var(--primary)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: errors.password ? 'var(--error)' : 'var(--text-muted)' }} />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input ${errors.password ? 'is-invalid' : ''}`}
                    style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password || errors.general) setErrors(prev => ({ ...prev, password: '', general: '' }));
                    }}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(prev => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <div className="form-field-error">
                    <AlertCircle size={14} />
                    <span>{errors.password}</span>
                  </div>
                )}
              </div>

              <button
                id="login-submit"
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  padding: '0.85rem',
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? 'Signing in...' : (
                  <>Sign In <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '1.75rem', margin: '1.75rem 0 0' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Create account</Link>
            </p>
          </>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: FORGOT PASSWORD - STEP 1 (ENTER EMAIL)           */}
        {/* ======================================================== */}
        {mode === 'FORGOT_EMAIL' && (
          <div>
            <button
              type="button"
              onClick={() => {
                setErrors(prev => ({ ...prev, general: '', forgotEmail: '' }));
                setMode('LOGIN');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                padding: 0,
                marginBottom: '1.5rem',
                fontWeight: 500
              }}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 1.25rem',
                borderRadius: '1rem',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 16px rgba(255, 120, 84, 0.3)'
              }}>
                <KeyRound size={30} strokeWidth={2.2} />
              </div>
              <h1 style={{
                fontSize: '1.75rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--on-background)',
                marginBottom: '0.4rem',
                letterSpacing: '-0.01em'
              }}>
                Forgot Password?
              </h1>
              <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', margin: 0, lineHeight: 1.5 }}>
                Enter your registered email and we'll send you a 6-digit verification code.
              </p>
            </div>

            {errors.general && (
              <div className="auth-error-banner" role="alert" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={18} />
                <span>{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleSendResetOtp} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label htmlFor="forgot-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Registered Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: errors.forgotEmail ? 'var(--error)' : 'var(--text-muted)' }} />
                  <input
                    id="forgot-email"
                    type="email"
                    className={`form-input ${errors.forgotEmail ? 'is-invalid' : ''}`}
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (errors.forgotEmail || errors.general) setErrors(prev => ({ ...prev, forgotEmail: '', general: '' }));
                    }}
                    autoComplete="email"
                    autoFocus
                    aria-invalid={!!errors.forgotEmail}
                  />
                </div>
                {errors.forgotEmail && (
                  <div className="form-field-error">
                    <AlertCircle size={14} />
                    <span>{errors.forgotEmail}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  padding: '0.85rem',
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? 'Sending code...' : (
                  <>Send Verification Code <ArrowRight size={18} /></>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: FORGOT PASSWORD - STEP 2 (ENTER OTP)             */}
        {/* ======================================================== */}
        {mode === 'FORGOT_OTP' && (
          <div>
            <button
              type="button"
              onClick={() => {
                setErrors(prev => ({ ...prev, general: '', otp: '' }));
                setMode('FORGOT_EMAIL');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                padding: 0,
                marginBottom: '1.25rem',
                fontWeight: 500
              }}
            >
              <ArrowLeft size={16} /> Back to email
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 1.25rem',
                borderRadius: '1rem',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 16px rgba(255, 120, 84, 0.3)'
              }}>
                <ShieldCheck size={28} strokeWidth={2.2} />
              </div>
              <h1 style={{
                fontSize: '1.75rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--on-background)',
                marginBottom: '0.5rem',
                letterSpacing: '-0.01em'
              }}>
                Enter Verification Code
              </h1>
              <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', margin: 0, lineHeight: 1.5 }}>
                We sent a 6-digit code to<br />
                <strong style={{ color: 'var(--on-background)' }}>{forgotEmail}</strong>
              </p>
            </div>

            {errors.general && (
              <div className="auth-error-banner" role="alert" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={18} />
                <span>{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* 6 Digit Input Boxes */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '0.5rem 0' }} onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => (otpInputsRef.current[idx] = el)}
                    id={`forgot-otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    className="form-input"
                    style={{
                      width: '48px',
                      height: '56px',
                      textAlign: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      borderRadius: '0.75rem',
                      border: errors.otp ? '2px solid var(--error, #ef4444)' : '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--on-surface)'
                    }}
                    autoComplete="off"
                    aria-label={`Digit ${idx + 1}`}
                  />
                ))}
              </div>

              {errors.otp && (
                <div className="form-field-error" style={{ justifyContent: 'center', marginTop: '-0.75rem' }}>
                  <AlertCircle size={14} />
                  <span>{errors.otp}</span>
                </div>
              )}

              <button
                id="reset-otp-verify-submit"
                type="submit"
                className="btn btn-primary"
                disabled={loading || otp.join('').length !== 6}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: otp.join('').length !== 6 ? 0.6 : 1
                }}
              >
                {loading ? 'Verifying...' : (
                  <>Verify Code <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            {/* Cooldown Timer & Resend Action */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {cooldown > 0 ? (
                <p style={{ margin: 0 }}>
                  Resend code in <strong style={{ color: 'var(--primary)' }}>{String(cooldown).padStart(2, '0')}s</strong>
                </p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>Didn't receive the email?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    <RotateCw size={14} className={resending ? 'spin' : ''} />
                    {resending ? 'Sending...' : 'Resend code'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: FORGOT PASSWORD - STEP 3 (NEW PASSWORD)          */}
        {/* ======================================================== */}
        {mode === 'FORGOT_NEW_PASSWORD' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 1.25rem',
                borderRadius: '1rem',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 16px rgba(255, 120, 84, 0.3)'
              }}>
                <Lock size={28} strokeWidth={2.2} />
              </div>
              <h1 style={{
                fontSize: '1.75rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--on-background)',
                marginBottom: '0.4rem',
                letterSpacing: '-0.01em'
              }}>
                Set New Password
              </h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--on-surface-variant)', margin: 0, lineHeight: 1.4 }}>
                For security reasons, paste is disabled. Please type your new password manually.
              </p>
            </div>

            {errors.general && (
              <div className="auth-error-banner" role="alert" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={18} />
                <span>{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* New Password */}
              <div className="form-group">
                <label htmlFor="reset-new-password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: errors.newPassword ? 'var(--error)' : 'var(--text-muted)' }} />
                  <input
                    id="reset-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className={`form-input ${errors.newPassword ? 'is-invalid' : ''}`}
                    style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                    placeholder="•••••••• (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.newPassword || errors.general) setErrors(prev => ({ ...prev, newPassword: '', general: '' }));
                    }}
                    onPaste={handlePasteForbidden}
                    onCopy={(e) => e.preventDefault()}
                    autoComplete="new-password"
                    autoFocus
                    aria-invalid={!!errors.newPassword}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPassword(prev => !prev)}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.newPassword ? (
                  <div className="form-field-error">
                    <AlertCircle size={14} />
                    <span>{errors.newPassword}</span>
                  </div>
                ) : newPassword.length >= 6 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--fresh-accent, #34D399)', marginTop: '0.35rem' }}>
                    <CheckCircle2 size={13} />
                    <span>Password length meets requirements</span>
                  </div>
                ) : null}
              </div>

              {/* Confirm New Password */}
              <div className="form-group">
                <label htmlFor="reset-confirm-password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: errors.confirmNewPassword ? 'var(--error)' : 'var(--text-muted)' }} />
                  <input
                    id="reset-confirm-password"
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    className={`form-input ${errors.confirmNewPassword ? 'is-invalid' : ''}`}
                    style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      if (errors.confirmNewPassword || errors.general) setErrors(prev => ({ ...prev, confirmNewPassword: '', general: '' }));
                    }}
                    onPaste={handlePasteForbidden}
                    onCopy={(e) => e.preventDefault()}
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirmNewPassword}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmNewPassword(prev => !prev)}
                    title={showConfirmNewPassword ? 'Hide confirm password' : 'Show confirm password'}
                    aria-label={showConfirmNewPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmNewPassword && (
                  <div className="form-field-error">
                    <AlertCircle size={14} />
                    <span>{errors.confirmNewPassword}</span>
                  </div>
                )}
              </div>

              <button
                id="reset-new-password-submit"
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  padding: '0.85rem',
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? 'Updating password...' : (
                  <>Set New Password <ArrowRight size={18} /></>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
