import { API_BASE, authHeaders } from './config';

/**
 * Unified fetch wrapper that automatically attaches JSON headers, credentials,
 * Authorization header (if a token is present), and error handling mirroring
 * the logic already used in other API helpers.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers || {}),
    ...authHeaders(),
  } as Record<string, string>;

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  });

  if (!res.ok) {
    let detail: string;
    try {
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/dot-notation
      detail = data?.detail ?? res.statusText;
    } catch {
      detail = res.statusText;
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }

  if (res.status === 204) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

export default request;
