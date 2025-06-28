// Derive base URL from env but ensure the protocol matches the current page to avoid mixed-content errors
let _base = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000';

// If the site is served over HTTPS but the API URL is HTTP, upgrade it to HTTPS to prevent blocked requests.
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && _base.startsWith('http://')) {
  _base = _base.replace(/^http:\/\//, 'https://');
}

export const API_BASE = _base;

export const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
