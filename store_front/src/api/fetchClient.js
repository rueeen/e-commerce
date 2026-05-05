import { notyf } from './notifier';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export const getAuthToken = () => localStorage.getItem('authToken');

export const setAuthSession = ({ token, refreshToken, user }) => {
  if (token) {
    localStorage.setItem('authToken', token);
  }

  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }

  if (user) {
    localStorage.setItem('authUser', JSON.stringify(user));
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('authUser');
};

const buildUrl = (path) => {
  if (!path) {
    return API_BASE_URL;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
};

const extractErrorMessage = (data) => {
  if (!data) {
    return 'No se pudo conectar con el servidor.';
  }

  if (typeof data === 'string') {
    return data || 'La solicitud falló.';
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

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (response.status === 204) {
    return null;
  }

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

export async function apiClient(path, options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const silent = options.silent === true;

  const fetchOptions = {
    ...options,
    headers,
  };

  delete fetchOptions.silent;

  const response = await fetch(buildUrl(path), fetchOptions);
  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();

      if (!silent) {
        notyf.error('Tu sesión expiró. Inicia sesión nuevamente.');
      }

      const error = new Error('No autorizado.');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    const message = extractErrorMessage(data);

    if (!silent) {
      notyf.error(message);
    }

    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const apiGet = (path, options = {}) =>
  apiClient(path, {
    ...options,
    method: 'GET',
  });

export const apiPost = (path, body, options = {}) =>
  apiClient(path, {
    ...options,
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });

export const apiPut = (path, body, options = {}) =>
  apiClient(path, {
    ...options,
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });

export const apiPatch = (path, body, options = {}) =>
  apiClient(path, {
    ...options,
    method: 'PATCH',
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });

export const apiDelete = (path, options = {}) =>
  apiClient(path, {
    ...options,
    method: 'DELETE',
  });