export const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000';

export const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
