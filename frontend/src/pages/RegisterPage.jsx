import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { register, verifyOtp, resendOtp } from '../api/authApi';
import toast from 'react-hot-toast';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Sun,
  Moon,
  ChefHat,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  RotateCw
} from 'lucide-react';

export default function RegisterPage() {
  const [step, setStep] = useState('REGISTER'); // 'REGISTER' | 'OTP'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [errors, setErrors] = useState({ name: '', email: '', password: '', confirmPassword: '', otp: '', general: '' });

  const otpInputsRef = useRef([]);
  const { loginSuccess } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Cooldown timer for OTP resend
  useEffect(() => {
    let timer;
    if (step === 'OTP' && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, cooldown]);

  // Focus the first OTP box when transitioning to OTP step
  useEffect(() => {
    if (step === 'OTP' && otpInputsRef.current[0]) {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  const validateRegistration = () => {
    const newErrors = { name: '', email: '', password: '', confirmPassword: '', otp: '', general: '' };
    let isValid = true;
    const cleanName = form.name.trim();
    const cleanEmail = form.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanName) {
      newErrors.name = 'Full name is required';
      isValid = false;
    } else if (cleanName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
      isValid = false;
    } else if (cleanName.length > 100) {
      newErrors.name = 'Name cannot exceed 100 characters';
      isValid = false;
    }

    if (!cleanEmail) {
      newErrors.email = 'Email address is required';
      isValid = false;
    } else if (!emailRegex.test(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    } else if (form.password.length > 100) {
      newErrors.password = 'Password cannot exceed 100 characters';
      isValid = false;
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name] || errors.general) {
      setErrors(prev => ({ ...prev, [name]: '', general: '' }));
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!validateRegistration()) {
      return;
    }

    const cleanName = form.name.trim();
    const cleanEmail = form.email.trim();
    setLoading(true);
    setErrors({ name: '', email: '', password: '', confirmPassword: '', otp: '', general: '' });

    try {
      const res = await register(cleanName, cleanEmail, form.password);
      setRegisteredEmail(res.data.email || cleanEmail);
      setStep('OTP');
      setCooldown(60);
      setOtp(['', '', '', '', '', '']);
      toast.success(res.data.message || 'Verification code sent to your email!');
    } catch (err) {
      const data = err.response?.data;
      const errorMsg = data?.message || err.message || 'Registration failed';

      const fieldErrors = {
        name: data?.errors?.name || '',
        email: data?.errors?.email || '',
        password: data?.errors?.password || '',
        confirmPassword: '',
        otp: '',
        general: errorMsg
      };

      if (errorMsg.toLowerCase().includes('email already registered')) {
        fieldErrors.email = errorMsg;
      }

      setErrors(fieldErrors);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue && value !== '') return;

    const newOtp = [...otp];
    newOtp[index] = cleanValue.slice(-1);
    setOtp(newOtp);

    if (errors.otp || errors.general) {
      setErrors(prev => ({ ...prev, otp: '', general: '' }));
    }

    // Move to next input if digit entered
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
      const res = await verifyOtp(registeredEmail, fullOtp);
      loginSuccess(res.data);
      toast.success(`Welcome to MealCraft, ${res.data.name}!`);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      const errorMsg = data?.message || err.message || 'Verification failed. Please check the code and try again.';
      setErrors(prev => ({ ...prev, otp: errorMsg, general: errorMsg }));
      toast.error(errorMsg);

      // If the code was invalidated due to max attempts, clear the inputs
      if (errorMsg.toLowerCase().includes('deactivated') || errorMsg.toLowerCase().includes('new code')) {
        setOtp(['', '', '', '', '', '']);
        otpInputsRef.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setErrors(prev => ({ ...prev, otp: '', general: '' }));

    try {
      const res = await resendOtp(registeredEmail);
      setCooldown(60);
      setOtp(['', '', '', '', '', '']);
      toast.success(res.data.message || 'New verification code sent to your email.');
      otpInputsRef.current[0]?.focus();
    } catch (err) {
      const data = err.response?.data;
      const errorMsg = data?.message || err.message || 'Failed to resend code. Please try again later.';
      setErrors(prev => ({ ...prev, general: errorMsg }));
      toast.error(errorMsg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem', position: 'relative' }}>
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
        maxWidth: '480px',
        borderRadius: '1.5rem',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-ambient-lg)',
        margin: '1rem'
      }}>
        {step === 'REGISTER' ? (
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
                Create Your Account
              </h1>
              <p style={{ fontSize: '0.95rem', color: 'var(--on-surface-variant)', margin: 0 }}>
                Plan your meals and discover recipes with ease
              </p>
            </div>

            {errors.general && (
              <div className="auth-error-banner" role="alert">
                <AlertCircle size={18} />
                <span>{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Full Name */}
              <div className="form-group">
                <label htmlFor="register-name" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: errors.name ? 'var(--error)' : 'var(--text-muted)' }} />
                  <input
                    id="register-name"
                    name="name"
                    type="text"
                    className={`form-input ${errors.name ? 'is-invalid' : ''}`}
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="Jane Doe"
                    value={form.name}
                    onChange={handleFormChange}
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                  />
                </div>
                {errors.name && (
                  <div className="form-field-error">
                    <AlertCircle size={14} />
                    <span>{errors.name}</span>
                  </div>
                )}
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label htmlFor="register-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: errors.email ? 'var(--error)' : 'var(--text-muted)' }} />
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    className={`form-input ${errors.email ? 'is-invalid' : ''}`}
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleFormChange}
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

              {/* Password */}
              <div className="form-group">
                <label htmlFor="register-password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: errors.password ? 'var(--error)' : 'var(--text-muted)' }} />
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input ${errors.password ? 'is-invalid' : ''}`}
                    style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                    placeholder="•••••••• (min 6 characters)"
                    value={form.password}
                    onChange={handleFormChange}
                    autoComplete="new-password"
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
                {errors.password ? (
                  <div className="form-field-error">
                    <AlertCircle size={14} />
                    <span>{errors.password}</span>
                  </div>
                ) : form.password.length >= 6 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--fresh-accent, #34D399)', marginTop: '0.35rem' }}>
                    <CheckCircle2 size={13} />
                    <span>Password length meets requirements</span>
                  </div>
                ) : null}
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label htmlFor="register-confirm-password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: errors.confirmPassword ? 'var(--error)' : 'var(--text-muted)' }} />
                  <input
                    id="register-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`form-input ${errors.confirmPassword ? 'is-invalid' : ''}`}
                    style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={handleFormChange}
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirmPassword}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <div className="form-field-error">
                    <AlertCircle size={14} />
                    <span>{errors.confirmPassword}</span>
                  </div>
                )}
              </div>

              <button
                id="register-submit"
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
                {loading ? 'Creating account...' : (
                  <>Create Account <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '1.75rem', margin: '1.75rem 0 0' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </>
        ) : (
          /* STEP 2: OTP VERIFICATION */
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setStep('REGISTER')}
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
                <ArrowLeft size={16} /> Back to details
              </button>

              <div style={{ textAlign: 'center' }}>
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
                  <KeyRound size={28} strokeWidth={2.2} />
                </div>
                <h1 style={{
                  fontSize: '1.75rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  color: 'var(--on-background)',
                  marginBottom: '0.5rem',
                  letterSpacing: '-0.01em'
                }}>
                  Verify Your Email
                </h1>
                <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', margin: 0, lineHeight: 1.5 }}>
                  We sent a 6-digit verification code to<br />
                  <strong style={{ color: 'var(--on-background)' }}>{registeredEmail}</strong>
                </p>
              </div>
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
                    id={`otp-input-${idx}`}
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
                id="otp-verify-submit"
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
                  <>Verify &amp; Continue <ArrowRight size={18} /></>
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
                    onClick={handleResend}
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

              <p style={{ margin: '1rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Wrong email address?{' '}
                <button
                  type="button"
                  onClick={() => setStep('REGISTER')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                >
                  Change email
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
