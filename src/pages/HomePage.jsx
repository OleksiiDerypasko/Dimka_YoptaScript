import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import PostCard from '../shared/PostCard';
import Pagination from '../shared/Pagination';
import { fetchCategoriesApi } from '../features/categories/api';
import { selectAuthToken, selectAuthUser } from '../features/auth/selectors';
import './HomePage.css';

/* ===== buildQuery (як у ProfileBottom) ===== */
function buildQuery(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.append(k, String(v));
  });
  return sp.toString();
}

/* ===== Публічний фід (/api/posts) ===== */
async function fetchPublicPosts(q, { token } = {}) {
  const qs = buildQuery(q);
  const res = await fetch(`/api/posts${qs ? `?${qs}` : ''}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return res.json(); // { total, page, limit, items }
}

/* ===== Адмінський фід (/api/admin/posts) ===== */
async function fetchAdminPosts(q, { token }) {
  const { page = 1, limit = 12, sort = 'likes', order = 'desc', status } = q || {};
  const qs = buildQuery({ page, limit, sort, order, ...(status ? { status } : {}) });
  const res = await fetch(`/api/admin/posts${qs ? `?${qs}` : ''}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) {
    const e = (data && typeof data === 'object') ? data : { error: res.statusText };
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  if (Array.isArray(data)) {
    return { total: data.length, page: 1, limit: data.length, items: data };
  }
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    total: Number(data?.total ?? items.length),
    page: Number(data?.page ?? page),
    limit: Number(data?.limit ?? limit),
    items,
  };
}

/* Підтягнути категорії одного поста (для клієнтського фільтра адміна) */
async function fetchPostCategories(postId, { token } = {}) {
  const res = await fetch(`/api/posts/${postId}/categories`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) return [];
  return res.json(); // [{id,title}]
}

/* Профіль користувача (щоб взяти fullName для адміна) */
async function fetchUserById(userId, { token }) {
  const res = await fetch(`/api/users/${userId}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) return null;
  return res.json(); // { id, fullName, login, ... }
}

const SORT_OPTIONS  = [
  { value: 'likes', label: 'By likes' },
  { value: 'date',  label: 'By date'  },
];
const ORDER_OPTIONS = [
  { value: 'desc', label: 'Desc' },
  { value: 'asc',  label: 'Asc'  },
];
const STATUS_OPTIONS = [
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all',      label: 'All' },
];

export default function HomePage() {
  const token = useSelector(selectAuthToken);
  const me    = useSelector(selectAuthUser);
  const isAdmin = me?.role === 'admin';

  // ===== Фільтри =====
  const [categories, setCategories] = useState([]); // [{id,title}]
  const [checked, setChecked]       = useState([]); // ids
  const [sort, setSort]             = useState('likes');
  const [order, setOrder]           = useState('desc');
  const [limit, setLimit]           = useState(12);
  const [status, setStatus]         = useState('active'); // тільки для адміна

  // ===== Дані =====
  const [items, setItems]   = useState([]);
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(null);

  // Кеш імен для адміна: userId -> fullName
  const [namesCache, setNamesCache] = useState({}); // { [id]: string|null }

  // Снапшот для оптимістичного видалення (останній елемент)
  const lastRemovedRef = useRef(null);

  const catDDRef = useRef(null);

  // Категорії
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchCategoriesApi();
        if (mounted) setCategories(Array.isArray(list) ? list : []);
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, []);

  // Summary для details
  const selectedSummary = useMemo(() => {
    if (!checked.length) return 'Categories';
    const names = checked
      .map((id) => categories.find((c) => c.id === id)?.title)
      .filter(Boolean);
    if (names.length > 2) return `${names.slice(0, 2).join(', ')}… (+${names.length - 2})`;
    return names.join(', ');
  }, [checked, categories]);

  function toggleCat(id) {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // ===== Головний фетч =====
  async function applyAtPage(targetPage) {
    setLoading(true);
    setErr(null);
    try {
      const baseCommon = { page: targetPage, limit, sort, order };

      // --- Користувач (не адмін) ---
      if (!isAdmin) {
        const data = await fetchPublicPosts(
          { ...baseCommon, status: 'active' },
          { token }
        );

        let posts = Array.isArray(data?.items) ? data.items : [];

        // клієнтська фільтрація за категоріями
        if (checked.length) {
          const catsByPost = await Promise.all(
            posts.map(async (p) => {
              const list = await fetchPostCategories(p.id, { token });
              const ids = (Array.isArray(list) ? list : []).map((c) => c.id);
              return { id: p.id, catIds: ids };
            })
          );
          const picked = new Set(checked);
          posts = posts.filter((p) => {
            const rec = catsByPost.find((x) => x.id === p.id);
            return rec && rec.catIds.some((cid) => picked.has(cid));
          });
        }

        setItems(posts);
        setTotal(posts.length);
        setPage(Number(data?.page ?? targetPage));
        if (Number.isFinite(data?.limit)) setLimit(Number(data.limit));
        return;
      }

      // --- Адмін ---
      const data = await fetchAdminPosts({ ...baseCommon, status }, { token });
      let pageItems = Array.isArray(data?.items) ? data.items : [];

      if (status === 'inactive') {
        pageItems = pageItems.filter((p) => (p.status ?? 'active') === 'inactive');
      }

      // клієнтська фільтрація за категоріями
      if (checked.length) {
        const catsByPost = await Promise.all(
          pageItems.map(async (p) => {
            const list = await fetchPostCategories(p.id, { token });
            const ids = (Array.isArray(list) ? list : []).map((c) => c.id);
            return { id: p.id, catIds: ids };
          })
        );
        const picked = new Set(checked);
        pageItems = pageItems.filter((p) => {
          const rec = catsByPost.find((x) => x.id === p.id);
          return rec && rec.catIds.some((cid) => picked.has(cid));
        });
      }

      setItems(pageItems);
      setTotal(Number(data?.total ?? pageItems.length));
      setPage(Number(data?.page ?? targetPage));
      if (Number.isFinite(data?.limit)) setLimit(Number(data.limit));
    } catch (e) {
      setItems([]);
      setTotal(0);
      setErr(e?.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }

  // Стартовий фетч + при зміні ролі
  useEffect(() => {
    applyAtPage(1);
    // eslint-disable-next-line
  }, [isAdmin]);

  function handleApply() {
    if (page !== 1) setPage(1);
    applyAtPage(1);
    // закрити дропдаун
    try {
      const el = catDDRef.current;
      if (el) el.removeAttribute('open');
    } catch {}
  }

  function handlePageChange(newPage) {
    applyAtPage(newPage);
  }

  // ====== Для адміна: підтягнути fullName авторів, якщо бракує ======
  useEffect(() => {
    if (!isAdmin || !items.length) return;
    const needIds = Array.from(
      new Set(
        items
          .filter((p) => !p.authorFullName && Number.isFinite(Number(p.authorId)))
          .map((p) => p.authorId)
      )
    ).filter((uid) => namesCache[uid] === undefined);

    if (!needIds.length) return;

    (async () => {
      const pairs = await Promise.all(
        needIds.map(async (uid) => {
          try {
            const u = await fetchUserById(uid, { token });
            return [uid, u?.fullName || null];
          } catch {
            return [uid, null];
          }
        })
      );
      setNamesCache((prev) => {
        const next = { ...prev };
        pairs.forEach(([uid, name]) => { next[uid] = name; });
        return next;
      });
    })();
  }, [isAdmin, items, namesCache, token]);

  // ====== Обробники оптимістичного видалення (для PostCard) ======
  function handleCardDeleted(id, post) {
    lastRemovedRef.current = { id, post, index: items.findIndex(p => p.id === id) };
    setItems(prev => prev.filter(p => p.id !== id));
    setTotal(t => Math.max(0, t - 1));
  }

  function handleDeleteFailed(id, post) {
    const snap = lastRemovedRef.current;
    if (!snap || snap.id !== id) {
      setItems(prev => [post, ...prev]);
      setTotal(t => t + 1);
      return;
    }
    setItems(prev => {
      const next = prev.slice();
      const idx = Math.max(0, Math.min(snap.index, next.length));
      next.splice(idx, 0, snap.post);
      return next;
    });
    setTotal(t => t + 1);
    lastRemovedRef.current = null;
  }

  return (
    <div className="home">
      <section className="home__panel">
        {/* ===== ФІЛЬТРИ ===== */}
        <div className="filters" role="region" aria-label="Feed filters">
          {/* Categories */}
          <details className="filters__dd" ref={catDDRef}>
            <summary className="filters__dd-btn">{selectedSummary}</summary>
            <div className="filters__dd-menu">
              {categories.length === 0 ? (
                <div className="filters__dd-empty">No categories.</div>
              ) : (
                categories.map((c) => (
                  <label key={c.id} className="filters__dd-item">
                    <input
                      type="checkbox"
                      checked={checked.includes(c.id)}
                      onChange={() => toggleCat(c.id)}
                    />
                    <span>#{c.title}</span>
                  </label>
                ))
              )}
            </div>
          </details>

          {/* Sort */}
          <div className="filters__group">
            <select
              className="filters__select"
              value={sort}
              onChange={(e)=>{ setSort(e.target.value); }}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Order */}
          <div className="filters__group">
            <select
              className="filters__select"
              value={order}
              onChange={(e)=>{ setOrder(e.target.value); }}
            >
              {ORDER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Limit */}
          <div className="filters__group">
            <input
              className="filters__number"
              type="number"
              min={3}
              max={30}
              value={limit}
              onChange={(e)=>{
                const v = Math.max(3, Math.min(30, Number(e.target.value) || 3));
                setLimit(v);
              }}
            />
          </div>

          {/* Status (адмін) */}
          {isAdmin && (
            <div className="filters__group">
              <select
                className="filters__select"
                value={status}
                onChange={(e)=>{ setStatus(e.target.value); }}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Apply */}
          <div className="filters__actions">
            <button type="button" className="filters__apply" onClick={handleApply} disabled={loading}>
              {loading ? '…' : 'Apply'}
            </button>
          </div>
        </div>

        {/* ===== СПИСОК ===== */}
        <div className="home__list">
          {loading && <div className="home__state">Loading…</div>}
          {err && !loading && <div className="home__state home__state--err">⚠ {err}</div>}
          {!loading && !err && items.length === 0 && <div className="home__state">No posts.</div>}

          {!loading && !err && items.length > 0 && (
            <div className="home__col">
              {items.map(p => {
                const displayName =
                  p.authorFullName ||
                  (Number.isFinite(Number(p.authorId)) && namesCache[p.authorId]) ||
                  null;
                const patched = displayName ? { ...p, authorFullName: displayName } : p;

                return (
                  <div
                    className={`home__item ${p.status === 'inactive' ? 'home__item--inactive' : ''}`}
                    key={p.id}
                  >
                    <PostCard
                      post={patched}
                      variant="line"
                      showDelete={isAdmin}
                      adminDelete={true}
                      onDeleted={handleCardDeleted}
                      onDeleteFailed={handleDeleteFailed}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Pagination
          page={page}
          total={total}
          limit={limit}
          onPageChange={handlePageChange}
        />
      </section>
    </div>
  );
}
