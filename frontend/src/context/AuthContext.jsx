import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.name) parsed.name = parsed.name.trim();
        setToken(storedToken);
        setUser(parsed);
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const loginSuccess = (authResponse) => {
    const cleanName = (authResponse.name || '').trim();
    const cleanEmail = (authResponse.email || '').trim().toLowerCase();
    const userData = {
      id: authResponse.userId,
      name: cleanName,
      email: cleanEmail,
    };
    localStorage.setItem('token', authResponse.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authResponse.token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginSuccess, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
