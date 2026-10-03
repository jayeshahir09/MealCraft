import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { register } from '../api/authApi';
import toast from 'react-hot-toast';
import { User, Mail, Lock, ArrowRight, Sun, Moon } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { loginSuccess } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Please fill in all fields');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      const res = await register(form.name, form.email, form.password);
      loginSuccess(res.data);
      toast.success(`Welcome to MealCraft, ${res.data.name}! 🎉`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'name', label: 'Full Name', type: 'text', icon: User, placeholder: 'Jane Doe' },
    { name: 'email', label: 'Email', type: 'email', icon: Mail, placeholder: 'you@example.com' },
    { name: 'password', label: 'Password', type: 'password', icon: Lock, placeholder: '••••••••' },
  ];

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
        maxWidth: '460px',
        borderRadius: '1.5rem',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-ambient-lg)',
        margin: '1rem'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
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
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>skillet</span>
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
            Start crafting gourmet meals with AI today
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {fields.map(({ name, label, type, icon: Icon, placeholder }) => (
            <div key={name} className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                {label}
              </label>
              <div style={{ position: 'relative' }}>
                <Icon size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id={`register-${name}`}
                  name={name}
                  type={type}
                  className="form-input"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder={placeholder}
                  value={form[name]}
                  onChange={handleChange}
                />
              </div>
            </div>
          ))}

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
      </div>
    </div>
  );
}
