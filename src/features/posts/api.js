// src/features/posts/api.js

// Будуємо query string із масиву/примітивів
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

// ----- Список постів -----
export async function fetchPostsApi(params = {}) {
  const { match, ...rest } = params; // match — лише для фронт-логіки
  if (Array.isArray(rest.categories) && rest.categories.length === 0) {
    delete rest.categories;
  }
  const qs = toQuery(rest);
  const res = await fetch(`/api/posts${qs}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return res.json(); // { total, page, limit, items }
}

// ----- Деталі поста -----
export async function getPostByIdApi(id) {
  const res = await fetch(`/api/posts/${id}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ----- Категорії поста -----
export async function getPostCategoriesApi(id) {
  const res = await fetch(`/api/posts/${id}/categories`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // Category[]
}

// ----- Коментарі поста -----
export async function getPostCommentsApi(id) {
  const res = await fetch(`/api/posts/${id}/comments`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // Comment[]
}

// ----- Реакції поста (список) -----
export async function getPostReactionsApi(id) {
  const res = await fetch(`/api/posts/${id}/like`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // Like[]
}

// ----- Поставити реакцію -----
export async function setPostReactionApi(id, type, token) {
  const res = await fetch(`/api/posts/${id}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ type }), // "like" | "dislike"
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ----- Прибрати мою реакцію -----
export async function clearPostReactionApi(id, token) {
  const res = await fetch(`/api/posts/${id}/like`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

/* ===================== Категорії ===================== */

// ----- Список категорій -----
export async function listCategoriesApi() {
  const res = await fetch(`/api/categories`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json(); // Array<Category> { id, title, ... }
}

/* ===================== Створення / Оновлення поста ===================== */

// ----- Створити (опублікувати) пост -----
// body: { title: string, content: string, categories: number[] }
export async function createPostApi(body, token) {
  const res = await fetch(`/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json(); // -> Post
}

// ----- Оновити пост (тільки власник: title/content/categories) -----
export async function updatePostApi(id, body, token) {
  const res = await fetch(`/api/posts/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // очікує PostUpdate: { title?, content?, categories?, status? }
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json(); // -> Post
}
