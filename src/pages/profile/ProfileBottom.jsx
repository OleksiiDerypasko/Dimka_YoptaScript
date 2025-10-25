import React, { useEffect, useMemo, useState } from 'react';
import './ProfileBottom.css';
import { useSelector } from 'react-redux';
import { selectAuthToken } from '../../features/auth/selectors';
import { fetchCategoriesApi } from '../../features/categories/api';
import PostCard from '../../shared/PostCard';
import Pagination from '../../shared/Pagination';

/* ====== Константи ====== */
const SORT_OPTIONS  = [{ value: 'likes', label: 'By likes' }, { value: 'date', label: 'By date' }];
const ORDER_OPTIONS = [{ value: 'desc', label: 'Desc' }, { value: 'asc', label: 'Asc' }];

/* ====== Хелпери ====== */
function buildQuery(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.append(k, String(v));
  });
  return sp.toString();
}

async function fetchPostsRaw(q, { token } = {}) {
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

async function fetchPostCategories(postId, { token } = {}) {
  const res = await fetch(`/api/posts/${postId}/categories`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json(); // [{id,title}]
}

/* ====== Компонент ====== */
export default function ProfileBottom({ userId, userLogin }) {
  const token = useSelector(selectAuthToken);

  // Фільтри
  const [categories, setCategories] = useState([]);
  const [checked, setChecked] = useState([]);
  const [sort, setSort] = useState('likes');
  const [order, setOrder] = useState('desc');
  const [limit, setLimit] = useState(10);

  // Таби
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'fav'

  // Дані
  const [items, setItems] = useState([]);
  const [allMine, setAllMine] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ====== Категорії ====== */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchCategoriesApi();
        if (mounted) setCategories(list || []);
      } catch {
        /* ignore */
      }
    })();
    return () => { mounted = false; };
  }, []);

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

  function paginateLocal(source, p, lim) {
    const start = (p - 1) * lim;
    return source.slice(start, start + lim);
  }

  /* ====== Головний фетч ====== */
  async function applyAtPage(targetPage) {
    setLoading(true);
    setError(null);
    try {
      const base = { page: targetPage, limit, sort, order, status: 'active' };

      if (activeTab === 'fav') {
        const data = await fetchPostsRaw({ ...base, favorite: true }, { token });
        let favs = data?.items || [];

        // клієнтська фільтрація по категоріях
        if (checked.length) {
          const catsByPost = await Promise.all(
            favs.map(async (p) => {
              const list = await fetchPostCategories(p.id, { token });
              const ids = (Array.isArray(list) ? list : []).map((c) => c.id);
              return { id: p.id, catIds: ids };
            })
          );
          const picked = new Set(checked);
          favs = favs.filter((p) => {
            const rec = catsByPost.find((x) => x.id === p.id);
            return rec && rec.catIds.some((cid) => picked.has(cid));
          });
        }

        setItems(favs);
        setTotal(favs.length);
        setPage(targetPage);
        setAllMine([]);
      } else {
        const bigLimit = Math.max(limit, 100);
        const data = await fetchPostsRaw({ ...base, page: 1, limit: bigLimit }, { token });
        let mine = (data?.items || []).filter(
          (p) =>
            (userId && p.authorId === userId) ||
            (userLogin && p.authorLogin === userLogin)
        );

        // клієнтська фільтрація по категоріях
        if (checked.length) {
          const catsByPost = await Promise.all(
            mine.map(async (p) => {
              const list = await fetchPostCategories(p.id, { token });
              const ids = (Array.isArray(list) ? list : []).map((c) => c.id);
              return { id: p.id, catIds: ids };
            })
          );
          const picked = new Set(checked);
          mine = mine.filter((p) => {
            const rec = catsByPost.find((x) => x.id === p.id);
            return rec && rec.catIds.some((cid) => picked.has(cid));
          });
        }

        setAllMine(mine);
        setTotal(mine.length);
        setPage(targetPage);
        setItems(paginateLocal(mine, targetPage, limit));
      }
    } catch (e) {
      setError(e?.message || 'Failed to fetch posts');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  /* ====== Ефекти ====== */
  useEffect(() => {
    if (userId || userLogin) applyAtPage(1);
  }, [userId, userLogin]);

  useEffect(() => {
    if (userId || userLogin) {
      setPage(1);
      applyAtPage(1);
    }
  }, [activeTab, userId, userLogin]);

  function handleApply() {
    setPage(1);
    applyAtPage(1);
  }

  function handlePageChange(newPage) {
    if (activeTab === 'fav') {
      applyAtPage(newPage); // бек-пагінація
    } else {
      setPage(newPage);
      setItems(paginateLocal(allMine, newPage, limit));
    }
  }

  // ✅ МІТТЄВЕ видалення на клієнті (optimistic): картка зникає одразу
  function handlePostDeletedOptimistic(postId) {
    if (activeTab !== 'my') return; // видаляти можемо лише у "My posts"
    setAllMine(prevAll => {
      const nextAll = prevAll.filter(p => p.id !== postId);
      const nextTotal = nextAll.length;
      const maxPage = Math.max(1, Math.ceil(nextTotal / limit));
      const nextPage = Math.min(page, maxPage);

      setTotal(nextTotal);
      setPage(nextPage);
      setItems(paginateLocal(nextAll, nextPage, limit));

      return nextAll;
    });
  }

  /* ====== Рендер ====== */
  return (
    <section className="pb-panel">
      {/* --- ФІЛЬТРИ --- */}
      <div className="pb-filters" role="region" aria-label="Filters & sorting">
        <details className="pb-dd">
          <summary className="pb-dd__button">{selectedSummary || 'Categories'}</summary>
          <div className="pb-dd__menu">
            {categories.length === 0 ? (
              <div className="pb-dd__empty">No categories.</div>
            ) : (
              categories.map((c) => (
                <label key={c.id} className="pb-dd__item">
                  <input
                    type="checkbox"
                    checked={checked.includes(c.id)}
                    onChange={() => toggleCat(c.id)}
                  />
                  <span>{c.title}</span>
                </label>
              ))
            )}
          </div>
        </details>

        <select className="pb-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select className="pb-select" value={order} onChange={(e) => setOrder(e.target.value)}>
          {ORDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <input
          className="pb-number"
          type="number"
          min={1}
          max={15}
          value={limit}
          onChange={(e) => {
            const v = Math.max(1, Math.min(15, Number(e.target.value) || 1));
            setLimit(v);
          }}
        />

        <div className="pb-actions">
          <button type="button" className="pb-apply" onClick={handleApply} disabled={loading}>
            {loading ? '...' : 'Apply'}
          </button>
        </div>
      </div>

      {/* --- ТАБИ --- */}
      <div className="pb-tabs" role="tablist" aria-label="Profile posts">
        <button
          role="tab"
          aria-selected={activeTab === 'my'}
          className={`pb-tab ${activeTab === 'my' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          My posts
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'fav'}
          className={`pb-tab ${activeTab === 'fav' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('fav')}
        >
          Favorites
        </button>
      </div>

      {/* --- ТІЛО --- */}
      <div className="pb-body">
        <div className="pb-list">
          {loading && <div className="pb-state">Loading posts…</div>}
          {error && !loading && <div className="pb-state pb-state--err">⚠ {String(error)}</div>}

          {!loading && !error && items.length === 0 && (
            <div className="pb-state">No posts.</div>
          )}

          {!loading && !error && items.length > 0 && (
            <>
              <div className="pb-col">
                {items.map((p) => (
                  <div key={p.id} className="pb-item">
                    <PostCard
                      post={p}
                      variant="line"
                      showEdit={activeTab === 'my'}
                      showDelete={activeTab === 'my'}
                      adminDelete={false}
                      onDeleted={handlePostDeletedOptimistic}  
                    />
                  </div>
                ))}
              </div>

              <Pagination
                page={page}
                total={total}
                limit={limit}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
