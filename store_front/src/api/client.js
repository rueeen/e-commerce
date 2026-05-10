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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const silent = error.config?.silent === true;

    if (status === 401) {
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