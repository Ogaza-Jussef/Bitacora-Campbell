const TOKEN_KEY = 'bitacora.token';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function readToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = readToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(path, { ...options, headers });
  if (response.status === 204) {
    return undefined as T;
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message ?? 'No se pudo completar la solicitud';
    const code = payload?.error?.code ?? 'internal_error';
    if (response.status === 401 && !path.endsWith('/auth/login')) {
      clearToken();
    }
    throw new ApiError(response.status, code, message);
  }
  return payload as T;
}

export async function openPdf(path: string): Promise<void> {
  const headers = new Headers();
  const token = readToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(path, { headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(response.status, payload?.error?.code ?? 'internal_error', payload?.error?.message ?? 'No se pudo imprimir el PDF');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'noopener');
  if (!opened) {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bitacora.pdf';
    link.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
