import { AIModel } from '../types';

export interface PaginatedModelsResponse {
  total: number;
  page: number;
  page_size: number;
  default_model?: AIModel;
  results: AIModel[];
}

/**
 * Fetch a paginated list of models from the backend `/api/models` endpoint.
 */
export async function listModels(params: {
  page?: number;
  limit?: number;
  q?: string;
} = {}): Promise<PaginatedModelsResponse> {
  const { page = 1, limit = 20, q } = params;

  // If VITE_API_BASE_URL is set (e.g., http://localhost:8000) prepend it, otherwise rely on proxy/relative path.
  const { API_BASE } = await import('./config');
  const url = new URL(`${API_BASE.replace(/\/$/, '')}/models`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  if (q) url.searchParams.set('q', q);

  const res = await fetch(url.toString());
  const contentType = res.headers.get('content-type');
  if (!res.ok) {
    throw new Error(`Backend returned ${res.status}`);
  }
  if (!contentType?.includes('application/json')) {
    // Likely hitting the dev server HTML fallback (wrong proxy config)
    const text = await res.text();
    throw new Error(`Expected JSON but received: ${text.slice(0, 100)}`);
  }
  return res.json();
}
