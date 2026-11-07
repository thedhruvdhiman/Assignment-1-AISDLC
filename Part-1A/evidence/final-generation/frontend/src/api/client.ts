import type { ApiError } from './types';

let csrfToken: string | null = null;

export function setCsrfToken(token: string): void {
  csrfToken = token;
}

export function clearSessionState(): void {
  csrfToken = null;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (init.method && !['GET', 'HEAD', 'OPTIONS'].includes(init.method.toUpperCase())) {
    if (!csrfToken) {
      const state = await api<{ csrf_token: string }>('/auth/session', { method: 'GET' });
      setCsrfToken(state.csrf_token);
    }
    headers.set('X-CSRF-Token', csrfToken as string);
  }
  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
    credentials: 'same-origin',
  });
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      clearSessionState();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('library:unauthorized'));
      }
    }
    const error = body as Partial<ApiError> | null;
    throw new Error(error?.message ?? `Request failed (${response.status})`);
  }
  return body as T;
}

export async function sessionState() {
  const state = await api<{
    authenticated: boolean;
    csrf_token: string;
    librarian?: { id: string; email?: string };
  }>('/auth/session');
  setCsrfToken(state.csrf_token);
  return state;
}
