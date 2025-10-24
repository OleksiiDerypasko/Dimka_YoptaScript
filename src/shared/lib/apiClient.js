// src/shared/lib/apiClient.js
import { getToken } from '../../services/storage';

const BASE_URL = process.env.REACT_APP_API_URL || '';

function buildUrl(path, params) {
  const url = new URL(path, BASE_URL || window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
  }
  return url.toString();
}

function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function handle(res) {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || res.statusText || 'Request failed';
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// -------- Legacy universal sender (used by auth) --------
export async function apiSend(path, method = 'GET', body, extraHeaders = {}) {
  const isJson = body && !(body instanceof FormData);
  const res = await fetch(buildUrl(path), {
    method,
    // ВИМК: кеш для будь-якого методу
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      ...(isJson ? { 'Content-Type': 'application/json' } : {}),
      ...authHeader(),
      ...extraHeaders,
    },
    body: body ? (isJson ? JSON.stringify(body) : body) : undefined,
  });
  return handle(res);
}

// -------- Convenience wrappers --------
export const apiGet = (path, params) =>
  fetch(buildUrl(path, params), {
    cache: 'no-store', // ключове
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      ...authHeader(),
    },
  }).then(handle);

export const apiPost  = (path, body) => apiSend(path, 'POST', body);
export const apiPatch = (path, body) => apiSend(path, 'PATCH', body);
export const apiDelete = (path) => apiSend(path, 'DELETE');

// PATCH multipart/form-data (avatar, etc.)
export async function apiUpload(url, formDataOrOptions) {
  const fd = formDataOrOptions instanceof FormData ? formDataOrOptions : (() => {
    const fd = new FormData();
    const { file, fileField = 'file', fields = {} } = formDataOrOptions || {};
    if (file) fd.append(fileField, file);
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    return fd;
  })();

  const res = await fetch(buildUrl(url), {
    method: 'PATCH',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      ...authHeader(),
    },
    body: fd,
  });
  return handle(res);
}
