// Unified API client with backward compatibility for both call styles.
//
// Supported exports:
// - apiGet(path, params)
// - apiSend(path, method, body, extraHeaders)              // legacy style used in auth
// - apiPost(path, body)                                     // convenience
// - apiPatch(path, body)                                    // convenience (JSON)
// - apiDelete(path)                                         // convenience
// - apiUpload(url, formDataOrOptions, tokenIgnored)         // accepts FormData OR {file, fileField, fields}; method PATCH
//
// All functions automatically attach Bearer token from services/storage.

import { getToken } from '../../services/storage';

const BASE_URL = process.env.REACT_APP_API_URL || '';

function buildUrl(path, params) {
  const url = new URL(path, BASE_URL || window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  return url.toString();
}

async function handle(res) {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) {
    const err = (data && typeof data === 'object') ? data : { error: res.statusText, status: res.status, data };
    throw err;
  }
  return data;
}

function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path, params) {
  const res = await fetch(buildUrl(path, params), {
    method: 'GET',
    headers: { ...authHeader() },
  });
  return handle(res);
}

// ---- Legacy: apiSend(path, method, body, extraHeaders) ----
export async function apiSend(path, method, body, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders, ...authHeader() };
  const res = await fetch(buildUrl(path), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

// ---- Convenience wrappers (compatible with existing call sites) ----
export async function apiPost(path, body /*, tokenIgnored */) {
  return apiSend(path, 'POST', body);
}

export async function apiPatch(path, body /*, tokenIgnored */) {
  return apiSend(path, 'PATCH', body);
}

export async function apiDelete(path /*, tokenIgnored */) {
  const res = await fetch(buildUrl(path), {
    method: 'DELETE',
    headers: { 'Accept': 'application/json', ...authHeader() },
  });
  return handle(res);
}

// ---- Upload: accepts either FormData or options object ----
// Usage 1 (existing): apiUpload('/api/users/avatar', formData, token?)
// Usage 2 (options):  apiUpload('/api/users/avatar', { file, fileField: 'avatar', fields: {...} })
export async function apiUpload(url, formDataOrOptions /*, tokenIgnored */) {
  let fd;
  if (formDataOrOptions instanceof FormData) {
    fd = formDataOrOptions;
  } else {
    const { file, fileField = 'avatar', fields = {} } = formDataOrOptions || {};
    fd = new FormData();
    if (file) fd.append(fileField, file);
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, v);
    });
  }

  const res = await fetch(buildUrl(url), {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      ...authHeader(),
      // DO NOT set Content-Type for FormData; browser will set boundary
    },
    body: fd,
  });
  return handle(res);
}
