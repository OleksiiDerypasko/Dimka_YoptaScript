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
 *   showDelete?: boolean
 *   adminDelete?: boolean
 *   onDeleted?: (postId, post) => void
 *   onDeleteFailed?: (postId, post) => void
 *   showEdit?: boolean
 */
export default function PostCard({
  post,
  variant = 'card',
  showDelete = false,
  adminDelete = false,
  onDeleted,
  onDeleteFailed,
  showEdit = false,
}) {
  const {
    id,
    title,
    content,
    authorLogin,
    authorFullName,
    createdAt,
    likesCount = 0,
    dislikesCount = 0,
    commentsCount: commentsCountFromServer,
    status,
  } = post || {};

  const navigate = useNavigate();
  const me    = useSelector(selectAuthUser);
  const token = useSelector(selectAuthToken);
  const isOwner = me?.id && post?.authorId === me.id;

  const [cats, setCats] = useState(post?.categories || []);
  const [catsLoading, setCatsLoading] = useState(false);
  const [busyDel, setBusyDel] = useState(false);

  // Коментарі: беремо готове поле або дофетчуємо
  const [commentsCount, setCommentsCount] = useState(
    typeof commentsCountFromServer === 'number' ? commentsCountFromServer : 0
  );

  useEffect(() => {
    let aborted = false;
    async function ensureComments() {
      if (!id) return;
      if (typeof commentsCountFromServer === 'number') {
        setCommentsCount(commentsCountFromServer);
        return;
      }
      try {
        const res = await fetch(`/api/posts/${id}/comments`, {
          headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error();
        const list = await res.json();
        if (!aborted) setCommentsCount(Array.isArray(list) ? list.length : 0);
      } catch {/* ignore */}
    }
    ensureComments();
    return () => { aborted = true; };
  }, [id, commentsCountFromServer]);

  // Довантаження категорій (якщо не прийшли з постом)
  useEffect(() => {
    let abort = false;
    async function loadCats() {
      if (!id || post?.categories) return;
      try {
        setCatsLoading(true);
        const res = await fetch(`/api/posts/${id}/categories`, {
          headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error();
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
    if (!id || !token) return;

    const confirmed = window.confirm(
      adminDelete
        ? `Admin: delete post "${title}"?`
        : `Delete post "${title}"?`
    );
    if (!confirmed) return;

    // оптимістичне видалення
    onDeleted?.(id, post);
    setBusyDel(true);

    try {
      if (adminDelete) {
        await adminDeletePostApi(id, token);
      } else {
        if (!isOwner) { setBusyDel(false); return; }
        await deletePostApi(id, token);
      }
      // все ок
    } catch (err) {
      alert('Failed to delete. Restoring…');
      onDeleteFailed?.(id, post);
    } finally {
      setBusyDel(false);
    }
  }

  function handleEdit(e) {
    e.stopPropagation();
    if (id && isOwner) navigate(`/posts/${id}/edit`);
  }

  const previewText = content || '';

  return (
    <article
      className={[
        'pc',
        variant === 'line' ? 'pc--line' : 'pc--card',
        'pc--clickable',
        status === 'inactive' ? 'pc--inactive' : '',
      ].join(' ')}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKey}
      aria-label={`Open post "${title}"`}
    >
      {/* Верхній ряд: автор + дата */}
      <header className="pc__head" onClick={(e)=>e.stopPropagation()}>
        <div className="pc__meta">
          <span className="pc__author">{authorFullName || authorLogin || 'Unknown'}</span>
          <span className="pc__dot">•</span>
          {createdAt && (() => {
            const dt = new Date(createdAt);
            const label = dt.toLocaleString(undefined, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <time className="pc__date" dateTime={dt.toISOString()} title={dt.toISOString()}>
                {label}
              </time>
            );
          })()}
        </div>
      </header>

      {/* Заголовок + превʼю */}
      <div className="pc__main">
        <h3 className="pc__title">{title}</h3>
        <p className="pc__preview" title={previewText}>{previewText}</p>
      </div>

      {/* Категорії */}
      <div className="pc__cats" onClick={(e)=>e.stopPropagation()}>
        {catsLoading && <span className="pc__cat pc__cat--loading">Loading…</span>}
        {!catsLoading && cats?.length > 0 && cats.map(c => (
          <span key={c.id} className="pc__cat">#{c.title}</span>
        ))}
        {!catsLoading && (!cats || cats.length === 0) && (
          <span className="pc__cat pc__cat--empty">no categories</span>
        )}
      </div>

      {/* Футер */}
      <footer className="pc__foot" onClick={(e)=>e.stopPropagation()}>
        <div className="pc__badges" aria-label="Post stats">
          <span className="pc-badge" title="Likes"><span className="pc-badge__icon">👍</span><span className="pc-badge__val">{likesCount}</span></span>
          <span className="pc-badge" title="Dislikes"><span className="pc-badge__icon">👎</span><span className="pc-badge__val">{dislikesCount}</span></span>
          <span className="pc-badge" title="Comments"><span className="pc-badge__icon">💬</span><span className="pc-badge__val">{commentsCount}</span></span>
        </div>

        <div className="pc__actions">
          {showEdit && isOwner && (
            <button type="button" className="pc__btn pc__btn--edit" onClick={handleEdit}>
              Edit
            </button>
          )}
          {showDelete && (
            <button
              type="button"
              className="pc__btn pc__btn--danger"
              onClick={handleDelete}
              disabled={busyDel}
              title={adminDelete ? 'Admin: delete post' : 'Delete my post'}
            >
              {busyDel ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
