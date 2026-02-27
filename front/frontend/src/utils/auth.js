export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const TOKEN_STORAGE_KEY = 'token_storage';

function getStorage() {
  const mode = localStorage.getItem(TOKEN_STORAGE_KEY) || 'local';
  return mode === 'session' ? sessionStorage : localStorage;
}

export function getAccessToken() {
  return getStorage().getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return getStorage().getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access, refresh, remember = true) {
  clearTokens();
  const storage = remember ? localStorage : sessionStorage;
  localStorage.setItem(TOKEN_STORAGE_KEY, remember ? 'local' : 'session');
  storage.setItem(ACCESS_TOKEN_KEY, access);
  storage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}
