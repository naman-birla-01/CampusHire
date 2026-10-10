import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, rehydrate user from localStorage and validate the token
  useEffect(() => {
    const token    = localStorage.getItem('token');
    const cached   = localStorage.getItem('user');

    if (!token) {
      setLoading(false);
      return;
    }

    // Use cached user immediately for fast UX, then validate
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch { /* ignore */ }
    }

    authAPI.me()
      .then((res) => {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      })
      .catch(() => {
        // Token invalid — clear everything
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Login — stores token and fetches user profile
  const login = useCallback(async (email, password) => {
    const res = await authAPI.login(email, password);
    const { access_token } = res.data;
    localStorage.setItem('token', access_token);

    const meRes = await authAPI.me();
    setUser(meRes.data);
    localStorage.setItem('user', JSON.stringify(meRes.data));
    return meRes.data;
  }, []);

  // Logout — clears everything
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // Refresh user from server
  const refreshUser = useCallback(async () => {
    const res = await authAPI.me();
    setUser(res.data);
    localStorage.setItem('user', JSON.stringify(res.data));
    return res.data;
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isStudent: user?.role === 'student',
    isTPO:     user?.role === 'tpo',
    isCompany: user?.role === 'company',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
