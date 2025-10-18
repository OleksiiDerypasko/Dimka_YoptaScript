import { getToken } from '../../services/storage';

const BASE_URL = process.env.REACT_APP_API_URL || ''; // з CRA proxy в package.json — ок

function buildUrl(path, params) {
  const url = new URL(path, BASE_URL || window.location.origin);
  if (params) Object.entries(params).forEach(([k, v])=>{
    if (v!==undefined && v!==null) url.searchParams.set(k, v);
  });
  return url.toString();
}

async function handle(res){
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw (data || { error: res.statusText, status: res.status });
  return data;
}

export async function apiGet(path, params){
  const token = getToken();
  const res = await fetch(buildUrl(path, params), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return handle(res);
}

export async function apiSend(path, method, body, extraHeaders = {}){
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(buildUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}
