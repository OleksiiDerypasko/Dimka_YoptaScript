// src/features/posts/api.js

// ======================== helpers ========================
// Будуємо query string із масиву/примітивів (масив -> повторювані ключі)
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

// Загальні опції fetch для API (вимикаємо кеш)
const baseOpts = {
  headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
  cache: 'no-store',
};

// ========================= Posts =========================

/**
 * Список постів із серверним фільтром/сортуванням/пагінацією.
 * params: { page, limit, sort, order, status, categories, match? }
 * Swagger: GET /api/posts?categories=1&categories=2&sort=likes&order=desc&page=1&limit=10&status=active
 * Response: { total, page, limit, items }
 */
export async function fetchPostsApi(params = {}) {
  const { match, ...rest } = params; // match — лише для фронт-логіки

  // Нормалізація
  const page   = Number(rest.page) >= 1 ? Number(rest.page) : 1;
  const limit  = Math.max(1, Math.min(100, Number(rest.limit) || 10));
  const sort   = rest.sort === 'date' ? 'date' : 'likes';
  const order  = rest.order === 'asc' ? 'asc' : 'desc';
  const status = (rest.status === 'inactive' || rest.status === 'all') ? rest.status : 'active';

  const q = { page, limit, sort, order, status };

  // Категорії: масив id -> повторювані ключі; або string — пошук по назві
  if (Array.isArray(rest.categories)) {
    const arr = rest.categories.map(Number).filter(Number.isFinite);
    if (arr.length) q.categories = arr;
  } else if (typeof rest.categories === 'string' && rest.categories.trim()) {
    q.categories = rest.categories.trim();
  }

  // Додаткові (якщо є не конфліктні)
  Object.entries(rest).forEach(([k, v]) => {
    if (k in q) return;
    if (v === undefined || v === null || v === '') return;
    q[k] = v;
  });

  const qs = toQuery(q);

  const res = await fetch(`/api/posts${qs}`, { ...baseOpts });
  if (res.status === 304) {
    // повтор з cache-busting
    const bust = toQuery({ ...q, _: Date.now() });
    const res2 = await fetch(`/api/posts${bust}`, { ...baseOpts });
    if (!res2.ok) {
      const err2 = await res2.json().catch(() => ({}));
      throw new Error(err2?.error || `HTTP ${res2.status}`);
    }
    return res2.json();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return res.json(); // { total, page, limit, items }
}

// Деталі поста
export async function getPostByIdApi(id) {
  const res = await fetch(`/api/posts/${id}`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Категорії поста
export async function getPostCategoriesApi(id) {
  const res = await fetch(`/api/posts/${id}/categories`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // Category[]
}

// Коментарі поста
export async function getPostCommentsApi(id) {
  const res = await fetch(`/api/posts/${id}/comments`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // Comment[]
}

// Реакції поста (список)
export async function getPostReactionsApi(id) {
  const res = await fetch(`/api/posts/${id}/like`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // Like[]
}

// Поставити реакцію
export async function setPostReactionApi(id, type, token) {
  const res = await fetch(`/api/posts/${id}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
    body: JSON.stringify({ type }), // "like" | "dislike"
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Прибрати мою реакцію
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

// Список категорій
export async function listCategoriesApi() {
  const res = await fetch(`/api/categories`, { ...baseOpts });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json(); // Array<Category> { id, title, ... }
}

// Пости конкретної категорії (Swagger: GET /api/categories/{id}/posts)
export async function getCategoryPostsApi(categoryId) {
  const res = await fetch(`/api/categories/${categoryId}/posts`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // Array<Post>
}

/* ============ Створення / Оновлення поста ============ */

// Створити (опублікувати) пост
// body: { title: string, content: string, categories: number[] }
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
  return res.json(); // -> Post
}

// Оновити пост (тільки власник: title/content/categories)
export async function updatePostApi(id, body, token) {
  const res = await fetch(`/api/posts/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
    // очікує PostUpdate: { title?, content?, categories?, status? }
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json(); // -> Post
}
