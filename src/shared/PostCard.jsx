// src/shared/PostCard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './PostCard.css';
import { adminDeletePostApi, deletePostApi } from '../features/posts/api';
import { useSelector } from 'react-redux';
import { selectAuthUser, selectAuthToken } from '../features/auth/selectors';

/**
 * props:
 *   post: Post
 *   variant: 'card' | 'line'
 *   showDelete?: boolean         // показати кнопку видалення
 *   adminDelete?: boolean        // якщо true — юзати admin API
 *   onDeleted?: (postId) => void // колбек після успіху
 */
export default function PostCard({ post, variant = 'card', showDelete = false, adminDelete = false, onDeleted }) {
  const {
    id,
    title,
    content,
    authorLogin,
    authorFullName,
    createdAt,
    likesCount = 0,
    dislikesCount = 0,
  } = post || {};

  const navigate = useNavigate();
  const me    = useSelector(selectAuthUser);
  const token = useSelector(selectAuthToken);

  const [cats, setCats] = useState(post?.categories || []);
  const [catsLoading, setCatsLoading] = useState(false);
  const [busyDel, setBusyDel] = useState(false);

  useEffect(() => {
    let abort = false;
    async function loadCats() {
      if (!id || post?.categories) return;
      try {
        setCatsLoading(true);
        const res = await fetch(`/api/posts/${id}/categories`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list = await res.json();
        if (!abort) setCats(Array.isArray(list) ? list : []);
      } catch {
        if (!abort) setCats([]);
      } finally {
        if (!abort) setCatsLoading(false);
      }
    }
    loadCats();
    return () => { abort = true; };
  }, [id, post?.categories]);

  const onOpen = useCallback(() => {
    if (!id) return;
    navigate(`/posts/${id}`, { state: { post } });
  }, [id, post, navigate]);

  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  async function handleDelete(e) {
    e.stopPropagation();
    if (!id) return;
    if (!token) { alert('Sign in first'); return; }
    if (!window.confirm('Delete this post permanently?')) return;

    setBusyDel(true);
    try {
      if (adminDelete) {
        await adminDeletePostApi(id, token);
      } else {
        // додатково: підстрахуємось – видаляти дозволимо тільки власнику
        if (me?.id !== post.authorId) {
          alert('You can delete only your own post');
          setBusyDel(false);
          return;
        }
        await deletePostApi(id, token);
      }
      onDeleted?.(id);
    } catch (e2) {
      alert(e2?.message || 'Failed to delete post');
    } finally {
      setBusyDel(false);
    }
  }

  return (
    <article
      className={`pc ${variant === 'line' ? 'pc--line' : ''} pc--clickable`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKey}
      aria-label={`Open post "${title}"`}
    >
      <header className="pc__head">
        <h3 className="pc__title">{title}</h3>
        <div className="pc__author">
          {authorFullName || authorLogin || 'unknown'}
        </div>
      </header>

      <div className="pc__cats">
        {catsLoading && <span className="pc__cat pc__cat--loading">Loading…</span>}
        {!catsLoading && cats?.length > 0 && cats.map(c => (
          <span key={c.id} className="pc__cat">#{c.title}</span>
        ))}
        {!catsLoading && (!cats || cats.length === 0) && (
          <span className="pc__cat pc__cat--empty">no categories</span>
        )}
      </div>

      <div className="pc__preview">{content}</div>

      <footer className="pc__foot">
        <time className="pc__date">
          {createdAt ? new Date(createdAt).toLocaleDateString() : ''}
        </time>

        <div className="pc__badges" aria-label="Post stats">
          <span className="pc-badge" title="Likes">
            <span className="pc-badge__icon" aria-hidden>👍</span>
            <span className="pc-badge__label">likes</span>
            <span className="pc-badge__val">{likesCount}</span>
          </span>
          <span className="pc-badge" title="Dislikes">
            <span className="pc-badge__icon" aria-hidden>👎</span>
            <span className="pc-badge__label">dislikes</span>
            <span className="pc-badge__val">{dislikesCount}</span>
          </span>
        </div>

        {showDelete && (
          <button
            type="button"
            className="pc__delete"
            onClick={handleDelete}
            disabled={busyDel}
            title={adminDelete ? 'Admin: delete post' : 'Delete my post'}
          >
            {busyDel ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </footer>
    </article>
  );
}
