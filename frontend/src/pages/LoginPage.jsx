import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { login } from '../api/authApi';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight, Sun, Moon, ChefHat, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });
  const { loginSuccess } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = { email: '', password: '', general: '' };
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

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (errors.email || errors.general) {
      setErrors(prev => ({ ...prev, email: '', general: '' }));
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errors.password || errors.general) {
      setErrors(prev => ({ ...prev, password: '', general: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    const cleanEmail = email.trim();
    setLoading(true);
    setErrors({ email: '', password: '', general: '' });

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
        const fieldErrors = { email: '', password: '', general: data.message || 'Please correct the highlighted fields' };
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
        maxWidth: '440px',
        borderRadius: '1.5rem',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-ambient-lg)',
        margin: '1rem'
      }}>
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

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                onChange={handleEmailChange}
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
            <label htmlFor="login-password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: errors.password ? 'var(--error)' : 'var(--text-muted)' }} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'is-invalid' : ''}`}
                style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
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
      </div>
    </div>
  );
}
