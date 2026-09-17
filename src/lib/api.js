const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field-keyed validation messages, ready to drop into a form. */
  get fieldErrors() {
    if (!this.details) return {};
    return Object.fromEntries(this.details.map((d) => [d.path, d.message]));
  }
}

let onUnauthenticated = null;
export function setUnauthenticatedHandler(fn) { onUnauthenticated = fn; }

let refreshing = null;

async function raw(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    // The session cookie is httpOnly, so it must be sent by the browser rather
    // than attached by this code — which is the point: script cannot read it.
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return { success: true, data: null };

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.success === false) {
    const err = payload.error || {};
    throw new ApiError(res.status, err.code || 'SERVER_ERROR', err.message || 'Request failed', err.details);
  }
  return payload;
}

/**
 * Access tokens last fifteen minutes. On the first 401 the client silently
 * refreshes and replays the request once, so an administrator editing an
 * article is never bounced to the login screen mid-sentence. Concurrent 401s
 * share one refresh rather than starting a stampede.
 */
async function request(path, options = {}, isRetry = false) {
  try {
    return await raw(path, options);
  } catch (err) {
    const canRetry = err.status === 401 && !isRetry && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh');
    if (!canRetry) {
      if (err.status === 401 && onUnauthenticated) onUnauthenticated();
      throw err;
    }

    try {
      refreshing = refreshing || raw('/auth/refresh', { method: 'POST' });
      await refreshing;
    } catch (refreshErr) {
      if (onUnauthenticated) onUnauthenticated();
      throw refreshErr;
    } finally {
      refreshing = null;
    }

    return request(path, options, true);
  }
}

/**
 * Fetches a file (such as a CSV export) and hands it to the browser as a
 * download. Uses the same cookie session, refreshing it once if it expired.
 */
async function download(path, filename, isRetry = false) {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
  if (res.status === 401 && !isRetry) {
    await raw('/auth/refresh', { method: 'POST' });
    return download(path, filename, true);
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const err = payload.error || {};
    throw new ApiError(res.status, err.code || 'SERVER_ERROR', err.message || 'Download failed');
  }
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export const api = {
  download,
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export function qs(params = {}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') search.set(k, v);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}
