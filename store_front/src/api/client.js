// Cliente HTTP único del proyecto: centraliza auth, manejo de errores y notificaciones.
// No duplicar clientes HTTP paralelos (por ejemplo con fetch nativo).
import axios from 'axios';
import { notyf } from './notifier';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

const getAuthToken = () => localStorage.getItem('authToken');

export const setAuthSession = ({ token, user }) => {
  if (token) {
    localStorage.setItem('authToken', token);
  }

  if (user) {
    localStorage.setItem('authUser', JSON.stringify(user));
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
};

const extractErrorMessage = (error) => {
  const data = error.response?.data;

  if (!data) {
    return 'No se pudo conectar con el servidor.';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.join(', ');
  }

  if (data.detail) {
    return Array.isArray(data.detail) ? data.detail.join(', ') : data.detail;
  }

  if (data.message) {
    return Array.isArray(data.message) ? data.message.join(', ') : data.message;
  }

  const fieldErrors = Object.entries(data)
    .map(([field, messages]) => {
      if (Array.isArray(messages)) {
        return `${field}: ${messages.join(', ')}`;
      }

      if (typeof messages === 'object' && messages !== null) {
        return `${field}: ${JSON.stringify(messages)}`;
      }

      return `${field}: ${messages}`;
    })
    .join(' | ');

  return fieldErrors || 'La solicitud falló.';
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Variable de control para evitar loops infinitos de refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const silent = error.config?.silent === true;
    const originalRequest = error.config;

    // Intentar renovar el token antes de cerrar sesión
    if (status === 401 && !originalRequest._retry) {
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (storedRefreshToken) {
        if (isRefreshing) {
          // Encolar requests mientras se renueva
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const response = await axios.post(
            `${API_BASE_URL}/api/accounts/token/refresh/`,
            { refresh: storedRefreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const newAccessToken = response.data.access;
          const newRefreshToken = response.data.refresh;

          // Guardar el nuevo access token
          localStorage.setItem('authToken', newAccessToken);
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          // Guardar el nuevo refresh token (ROTATE_REFRESH_TOKENS=True)
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);

          // El refresh falló — sesión realmente expirada
          clearAuthSession();
          localStorage.removeItem('refreshToken');

          if (!silent) {
            notyf.error('Tu sesión expiró. Inicia sesión nuevamente.');
          }

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // No hay refresh token — cerrar sesión directamente
      clearAuthSession();

      if (!silent) {
        notyf.error('Tu sesión expiró. Inicia sesión nuevamente.');
      }

      return Promise.reject(error);
    }

    if (status === 429) {
      if (!silent) {
        notyf.error('Demasiadas solicitudes. Espera un momento antes de intentar de nuevo.');
      }

      return Promise.reject(error);
    }

    if (!silent) {
      notyf.error(extractErrorMessage(error));
    }

    return Promise.reject(error);
  }
);

export default apiClient;