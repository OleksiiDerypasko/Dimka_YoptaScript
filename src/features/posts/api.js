// src/features/posts/api.js

// ======================== helpers ========================
function toQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.append(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

const baseOpts = {
  headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
  cache: 'no-store',
};

// ========================= Posts =========================
export async function fetchPostsApi(params = {}) {
  const { match, ...rest } = params;

  const page   = Number(rest.page) >= 1 ? Number(rest.page) : 1;
  const limit  = Math.max(1, Math.min(100, Number(rest.limit) || 10));
  const sort   = rest.sort === 'date' ? 'date' : 'likes';
  const order  = rest.order === 'asc' ? 'asc' : 'desc';
  const status = (rest.status === 'inactive' || rest.status === 'all') ? rest.status : 'active';

  const q = { page, limit, sort, order, status };

  if (Array.isArray(rest.categories)) {
    const arr = rest.categories.map(Number).filter(Number.isFinite);
    if (arr.length) q.categories = arr;
  } else if (typeof rest.categories === 'string' && rest.categories.trim()) {
    q.categories = rest.categories.trim();
  }

  Object.entries(rest).forEach(([k, v]) => {
    if (k in q) return;
    if (v === undefined || v === null || v === '') return;
    q[k] = v;
  });

  const qs = toQuery(q);

  const res = await fetch(`/api/posts${qs}`, { ...baseOpts });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getPostByIdApi(id) {
  const res = await fetch(`/api/posts/${id}`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getPostCategoriesApi(id) {
  const res = await fetch(`/api/posts/${id}/categories`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getPostCommentsApi(id) {
  const res = await fetch(`/api/posts/${id}/comments`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getPostReactionsApi(id) {
  const res = await fetch(`/api/posts/${id}/like`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function setPostReactionApi(id, type, token) {
  const res = await fetch(`/api/posts/${id}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
    body: JSON.stringify({ type }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function clearPostReactionApi(id, token) {
  const res = await fetch(`/api/posts/${id}/like`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

/* ===================== Категорії ===================== */
export async function listCategoriesApi() {
  const res = await fetch(`/api/categories`, { ...baseOpts });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getCategoryPostsApi(categoryId) {
  const res = await fetch(`/api/categories/${categoryId}/posts`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ============ Створення / Оновлення / Видалення поста ============ */
export async function createPostApi(body, token) {
  const res = await fetch(`/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updatePostApi(id, body, token) {
  const res = await fetch(`/api/posts/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Видалення поста власником */
export async function deletePostApi(id, token) {
  const res = await fetch(`/api/posts/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return true;
}

/** Видалення поста адміністратором */
export async function adminDeletePostApi(id, token) {
  const res = await fetch(`/api/admin/posts/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return true;
}
