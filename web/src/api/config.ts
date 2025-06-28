const envBase = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

// If no env provided default to relative "/api" which is useful behind a reverse proxy during deployment.
// Otherwise, if we are running on an HTTPS page but the provided base URL is HTTP, automatically upgrade
// to HTTPS to avoid mixed-content issues (assuming the backend supports HTTPS, which modern hosts do).
function deriveApiBase(): string {
  if (!envBase) return '/api';
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return envBase.replace(/^http:\/\//, 'https://');
  }
  return envBase;
}

export const API_BASE = deriveApiBase();

export const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
