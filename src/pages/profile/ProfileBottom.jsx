import React, { useEffect, useMemo, useState } from 'react';
import './ProfileBottom.css';
import { useSelector } from 'react-redux';
import { selectAuthToken } from '../../features/auth/selectors';
import { fetchCategoriesApi } from '../../features/categories/api';
import PostCard from '../../shared/PostCard';
import Pagination from '../../shared/Pagination';

const SORT_OPTIONS  = [{ value: 'likes', label: 'By likes' }, { value: 'date', label: 'By date' }];
const ORDER_OPTIONS = [{ value: 'desc', label: 'Desc' }, { value: 'asc', label: 'Asc' }];

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
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return res.json(); // { total, page, limit, items }
}

export default function ProfileBottom({ userId, userLogin }) {
  const token = useSelector(selectAuthToken);

  // Фільтри
  const [categories, setCategories] = useState([]); // {id,title}[]
  const [checked, setChecked] = useState([]);       // обрані id
  const [sort, setSort] = useState('likes');
  const [order, setOrder] = useState('desc');
  const [limit, setLimit] = useState(10);

  // Таби
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'fav'

  // Дані
  const [items, setItems] = useState([]);
  const [allMine, setAllMine] = useState([]); // кеш повного списку "my"
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Категорії
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
    if (names.length > 2) return `${names.slice(0, 2).join(', ')}... (+${names.length - 2})`;
    return names.join(', ');
  }, [checked, categories]);

  function toggleCat(id) {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function paginateLocal(source, p, lim) {
    const start = (p - 1) * lim;
    return source.slice(start, start + lim);
  }

  async function applyAtPage(targetPage) {
    setLoading(true);
    setError(null);
    try {
      const base = {
        page: targetPage,
        limit,
        sort,
        order,
        status: 'active',
      };
      if (checked.length) base.categories = checked;

      if (activeTab === 'fav') {
        const data = await fetchPostsRaw({ ...base, favorite: true }, { token });
        setItems(data?.items || []);
        setTotal(data?.total ?? 0);
        setPage(data?.page ?? targetPage);
        if (data?.limit) setLimit(data.limit);
        setAllMine([]);
      } else {
        const bigLimit = Math.max(limit, 100);
        const data = await fetchPostsRaw({ ...base, page: 1, limit: bigLimit });
        const mine = (data?.items || []).filter(
          (p) =>
            (userId && p.authorId === userId) ||
            (userLogin && p.authorLogin === userLogin)
        );
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

  // перше завантаження коли є дані користувача
  useEffect(() => {
    if (userId || userLogin) applyAtPage(1);
  }, [userId, userLogin]);

  // перевантаження при зміні таба — з 1 сторінки
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
      setPage(newPage); // локальна пагінація
      setItems(paginateLocal(allMine, newPage, limit));
    }
  }

  return (
    <section className="pb-panel">
      {/* ФІЛЬТРИ */}
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

      {/* ТАБИ */}
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

      {/* ТІЛО */}
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
                    <PostCard post={p} variant="line" />
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
