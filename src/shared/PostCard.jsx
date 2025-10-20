import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './PostCard.css';

/**
 * Очікуваний post:
 * {
 *   id, title, content, createdAt,
 *   authorLogin, authorFullName,
 *   likesCount, dislikesCount,
 *   // optional: categories: [{id,title}, ...]
 * }
 */
export default function PostCard({ post, variant = 'card' }) {
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

  // Категорії: беремо з post.categories або довантажуємо по /api/posts/{id}/categories
  const [cats, setCats] = useState(post?.categories || []);
  const [catsLoading, setCatsLoading] = useState(false);

  useEffect(() => {
    let abort = false;
    async function loadCats() {
      if (!id || post?.categories) return;
      try {
        setCatsLoading(true);
        const res = await fetch(`/api/posts/${id}/categories`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list = await res.json(); // [{id,title,...}]
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

  // Тимчасово: к-ть коментарів — заглушка (0)
  const commentsCount = 0;

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

      {/* Категорії (чипси) */}
      <div className="pc__cats">
        {catsLoading && <span className="pc__cat pc__cat--loading">Loading…</span>}
        {!catsLoading && cats?.length > 0 && cats.map(c => (
          <span key={c.id} className="pc__cat">#{c.title}</span>
        ))}
        {!catsLoading && (!cats || cats.length === 0) && (
          <span className="pc__cat pc__cat--empty">no categories</span>
        )}
      </div>

      {/* Короткий текст */}
      <div className="pc__preview">
        {content}
      </div>

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

          <span className="pc-badge" title="Comments">
            <span className="pc-badge__icon" aria-hidden>💬</span>
            <span className="pc-badge__label">comments</span>
            <span className="pc-badge__val">{commentsCount}</span>
          </span>
        </div>
      </footer>
    </article>
  );
}
