import { createContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const rawUser = localStorage.getItem('authUser');
    return rawUser ? JSON.parse(rawUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || user) return;

    const loadUser = async () => {
      try {
        const { data } = await api.me();
        setUser(data);
        localStorage.setItem('authUser', JSON.stringify(data));
      } catch {
        logout();
      }
    };

    loadUser();
  }, [token]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const { data } = await api.login(credentials);
      localStorage.setItem('authToken', data.access);
      setToken(data.access);
      const profile = data.user || (await api.me()).data;
      setUser(profile);
      localStorage.setItem('authUser', JSON.stringify(profile));
      notyf.success('Login correcto');
      return true;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      await api.register(payload);
      notyf.success('Registro exitoso');
      return true;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    notyf.success('Sesión cerrada');
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token),
      isAdmin: Boolean(user?.is_staff || user?.is_superuser || user?.role === 'admin'),
      login,
      register,
      logout,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
