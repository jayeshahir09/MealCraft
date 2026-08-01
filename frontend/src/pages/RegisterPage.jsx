import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register } from '../api/authApi';
import toast from 'react-hot-toast';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { loginSuccess } = useAuth();
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
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍳</div>
          <h1 className="auth-title gradient-text">Create account</h1>
          <p className="text-secondary text-sm">Start planning delicious meals with AI</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {fields.map(({ name, label, type, icon: Icon, placeholder }) => (
            <div key={name} className="form-group">
              <label className="form-label">{label}</label>
              <div style={{ position: 'relative' }}>
                <Icon size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id={`register-${name}`}
                  name={name}
                  type={type}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
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
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? 'Creating account...' : (
              <>Create Account <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-secondary" style={{ marginTop: '1.5rem' }}>
          Already have an account?{' '}
          <Link to="/login" className="text-accent" style={{ fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
