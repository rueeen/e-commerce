import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

export const AuthContext = createContext(null);

const getStoredUser = () => {
  const rawUser = localStorage.getItem('authUser');

  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem('authUser');
    return null;
  }
};

const getUserRole = (user) => {
  if (!user) return null;

  if (user.role) return user.role;

  if (user.is_staff || user.is_superuser) return 'admin';

  return 'customer';
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [refreshToken, setRefreshToken] = useState(() =>
    localStorage.getItem('refreshToken')
  );
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(Boolean(token && !user));

  const persistSession = useCallback(({ access, refresh, profile }) => {
    if (access) {
      localStorage.setItem('authToken', access);
      setToken(access);
    }

    if (refresh) {
      localStorage.setItem('refreshToken', refresh);
      setRefreshToken(refresh);
    }

    if (profile) {
      localStorage.setItem('authUser', JSON.stringify(profile));
      setUser(profile);
    }
  }, []);

  const logout = useCallback(({ silent = false } = {}) => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);

    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authUser');

    if (!silent) {
      notyf.success('Sesión cerrada.');
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setInitializing(false);
      return;
    }

    if (user) {
      setInitializing(false);
      return;
    }

    let alive = true;

    const loadUser = async () => {
      setInitializing(true);

      try {
        const { data } = await api.me();

        if (!alive) return;

        setUser(data);
        localStorage.setItem('authUser', JSON.stringify(data));
      } catch {
        if (alive) {
          logout({ silent: true });
        }
      } finally {
        if (alive) {
          setInitializing(false);
        }
      }
    };

    loadUser();

    return () => {
      alive = false;
    };
  }, [token, user, logout]);

  const login = useCallback(
    async (credentials) => {
      setLoading(true);

      try {
        const { data } = await api.login(credentials);

        const access = data.access;
        const refresh = data.refresh;

        if (!access) {
          notyf.error('El servidor no devolvió token de acceso.');
          return false;
        }

        localStorage.setItem('authToken', access);
        setToken(access);

        if (refresh) {
          localStorage.setItem('refreshToken', refresh);
          setRefreshToken(refresh);
        }

        const profile = data.user || (await api.me()).data;

        persistSession({
          access,
          refresh,
          profile,
        });

        notyf.success('Login correcto.');
        return true;
      } catch {
        return false;
      } finally {
        setLoading(false);
      }
    },
    [persistSession]
  );

  const register = useCallback(async (payload) => {
    setLoading(true);

    try {
      await api.register(payload);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const role = getUserRole(user);

  const value = useMemo(
    () => ({
      user,
      token,
      refreshToken,
      loading,
      initializing,

      isAuthenticated: Boolean(token),
      role,

      isAdmin: role === 'admin',
      isWorker: role === 'worker' || role === 'admin',
      isCustomer: role === 'customer',

      login,
      register,
      logout,
    }),
    [
      user,
      token,
      refreshToken,
      loading,
      initializing,
      role,
      login,
      register,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}