import axios from 'axios';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../utils/auth';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

const api = axios.create({
  baseURL: apiBaseUrl,
});

const publicEndpoints = ['token/', 'token/refresh/', 'register/'];

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  const isPublicEndpoint = publicEndpoints.some((endpoint) => config.url?.includes(endpoint));

  if (token && !isPublicEndpoint) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthCall =
      originalRequest?.url?.includes('token/') ||
      originalRequest?.url?.includes('token/refresh/');

    if (status === 401 && !originalRequest?._retry && !isAuthCall) {
      originalRequest._retry = true;
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login?reason=expired';
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(`${apiBaseUrl}token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccess = refreshResponse.data.access;
        setTokens(newAccess, refreshToken);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        window.location.href = '/login?reason=expired';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
