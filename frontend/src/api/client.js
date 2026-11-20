const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'gameya_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// AuthContext registers this so an expired token logs the user out everywhere
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

// Usage: api('/circles/my')
//        api('/auth/login', { method: 'POST', body: {...}, auth: false })
//        api('/payments', { method: 'POST', formData })   (file uploads, later)
export async function api(path, { method = 'GET', body, formData, auth = true } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) {
    payload = formData; // the browser sets the multipart boundary itself
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && auth && onUnauthorized) onUnauthorized();
    throw new ApiError(data?.message || 'Something went wrong', res.status);
  }
  return data;
}

// Fetches a protected file (like a receipt image) and returns a temporary object URL
export async function apiBlobUrl(path) {
  const token = tokenStore.get();

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    throw new ApiError(data?.message || 'Could not load the file', res.status);
  }

  return URL.createObjectURL(await res.blob());
}