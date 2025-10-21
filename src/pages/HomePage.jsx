import React, { useEffect, useState } from 'react';
import './HomePage.css';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPosts } from '../features/posts/actions';
import {
  selectPostsItems,
  selectPostsLoading,
  selectPostsError,
  selectPostsPage,
  selectPostsTotal,
} from '../features/posts/selectors';
import PostCard from '../shared/PostCard';
import FiltersBar from './FiltersBar';
import Pagination from '../shared/Pagination';
import { selectAuthUser } from '../features/auth/selectors';

export default function HomePage() {
  const dispatch = useDispatch();
  const me = useSelector(selectAuthUser);

  const items   = useSelector(selectPostsItems);
  const loading = useSelector(selectPostsLoading);
  const error   = useSelector(selectPostsError);
  const page    = useSelector(selectPostsPage);
  const total   = useSelector(selectPostsTotal);

  const [applied, setApplied] = useState({
    page: 1,
    limit: 10,
    sort: 'likes',
    order: 'desc',
    status: 'active',
  });

  // первинне завантаження
  useEffect(() => {
    dispatch(fetchPosts(applied));
  }, []); // виконується один раз

  const handleApply = (next) => {
    const params = {
      page: 1,
      status: 'active',
      sort: next.sort,
      order: next.order,
      limit: next.limit,
    };
    if (next.categories?.length) params.categories = next.categories;
    if (next.match) params.match = next.match;
    setApplied(params);
    dispatch(fetchPosts(params));
  };

  const handlePageChange = (newPage) => {
    const params = { ...applied, page: newPage };
    setApplied(params);
    dispatch(fetchPosts(params));
  };

  const isAdmin = me?.role === 'admin';

  return (
    <div className="feed">
      <section className="feed__filters" role="region" aria-label="Filters">
        <FiltersBar
          initial={{
            categories: applied.categories || [],
            sort: applied.sort,
            order: applied.order,
            limit: applied.limit,
          }}
          onApply={handleApply}
        />
      </section>

      {loading && <div className="feed__state">Loading posts…</div>}
      {error && !loading && <div className="feed__state feed__state--err">⚠ {String(error)}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="feed__state">No posts.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="feed__list">
            {items.map((p) => (
              <div key={p.id} className="feed__item">
                <PostCard
                  post={p}
                  showDelete={isAdmin}
                  adminDelete={isAdmin}
                  onDeleted={() => dispatch(fetchPosts(applied))}
                />
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            total={total}
            limit={applied.limit}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
