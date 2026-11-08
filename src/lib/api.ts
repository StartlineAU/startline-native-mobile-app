import { config } from '@/config/env';
import { getApiAuthHeaders } from '@/lib/auth/api-auth';
import type { ApiErrorBody } from '@/types/api';

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  auth?: 'none' | 'optional' | 'required';
  headers?: Record<string, string>;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: ApiErrorBody;

  constructor(message: string, status: number, payload?: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.code = payload?.code;
  }
}

function joinUrl(path: string): string {
  if (!config.apiUrl) {
    throw new ApiError('The Startline API URL is not configured.', 0);
  }
  if (!__DEV__ && !config.apiUrl.startsWith('https://')) {
    throw new ApiError('The Startline API URL must use HTTPS.', 0);
  }
  return `${config.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, auth = 'optional', headers = {} } = options;

  if (auth === 'required') {
    const authHeaders = await getApiAuthHeaders();
    if (!authHeaders.Authorization) {
      throw new ApiError('Sign in to continue.', 401);
    }
    Object.assign(headers, authHeaders);
  } else if (auth === 'optional') {
    Object.assign(headers, await getApiAuthHeaders());
  }

  let response: Response;
  try {
    response = await fetch(joinUrl(path), {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError('Could not reach Startline. Check your connection and try again.', 0);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? ((await response.json().catch(() => ({}))) as T & ApiErrorBody)
    : ({} as T & ApiErrorBody);

  if (!response.ok) {
    throw new ApiError(
      payload.error || `Request failed (${response.status}).`,
      response.status,
      payload,
    );
  }

  return payload as T;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function apiErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}
