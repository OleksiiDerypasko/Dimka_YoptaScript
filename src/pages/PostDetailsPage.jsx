import React, { useEffect, useMemo, useRef, useState } from 'react';
import './PostDetailsPage.css';
import { useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuthToken, selectAuthUser } from '../features/auth/selectors';
import {
  getPostById,
  getPostCategories,
  listPostComments,
  likePost,
  unlikePost,
  addFavoritePost,
  removeFavoritePost,
  listUserFavorites,
  createComment,
} from '../features/posts/postApi';

export default function PostDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const token = useSelector(selectAuthToken);
  const me = useSelector(selectAuthUser);

  const statePost = location.state?.post;

  const [post, setPost] = useState(statePost || null);
  const [loading, setLoading] = useState(!statePost);
  const [error, setError] = useState(null);

  const [cats, setCats] = useState([]);
  const [catsLoading, setCatsLoading] = useState(false);

  const [likes, setLikes] = useState(statePost?.likesCount ?? 0);
  const [dislikes, setDislikes] = useState(statePost?.dislikesCount ?? 0);

  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const taRef = useRef(null);

  const postId = useMemo(() => Number(id), [id]);

  // auto-grow textarea
  const onTAInput = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  };

  // Load post (if not from state)
  useEffect(() => {
    let abort = false;
    (async () => {
      if (statePost) return;
      try {
        setLoading(true);
        const data = await getPostById(postId);
        if (!abort) {
          setPost(data);
          setLikes(data.likesCount ?? 0);
          setDislikes(data.dislikesCount ?? 0);
        }
      } catch (e) {
        if (!abort) setError(e?.message || 'Failed to load post');
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [postId, statePost]);

  // Load categories
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setCatsLoading(true);
        const list = await getPostCategories(postId);
        if (!abort) setCats(Array.isArray(list) ? list : []);
      } catch {
        if (!abort) setCats([]);
      } finally {
        if (!abort) setCatsLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [postId]);

  // Load initial favorites state (if authed)
  useEffect(() => {
    let abort = false;
    (async () => {
      if (!me?.id || !token) return;
      try {
        const favs = await listUserFavorites(me.id, token);
        if (!abort && Array.isArray(favs)) {
          setIsFav(!!favs.find((p) => p.id === postId));
        }
      } catch { /* ignore */ }
    })();
    return () => { abort = true; };
  }, [me?.id, token, postId]);

  // Load comments
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setCommentsLoading(true);
        const list = await listPostComments(postId);
        if (!abort) setComments(Array.isArray(list) ? list : []);
      } catch {
        if (!abort) setComments([]);
      } finally {
        if (!abort) setCommentsLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [postId]);

  if (loading) return <div className="post-page"><div className="post-state">Loading…</div></div>;
  if (error)   return <div className="post-page"><div className="post-state post-state--err">⚠ {String(error)}</div></div>;
  if (!post)   return <div className="post-page"><div className="post-state">No data.</div></div>;

  const {
    title,
    content,
    authorLogin,
    authorFullName,
    createdAt,
  } = post;

  // Actions
  async function onLike(type) {
    if (!token) { alert('Please login to react'); return; }
    try {
      const prevL = likes;
      const prevD = dislikes;
      // Оптимістично
      if (type === 'like') setLikes((v) => v + 1);
      else setDislikes((v) => v + 1);

      await likePost(postId, type, token);

      // Після успіху можна додатково освіжити з бекенду getPostById(postId) → counts.
      // Але для MVP залишимо оптимістичний апдейт.
    } catch (e) {
      // Відкат оптимістичного
      setLikes((_) => post.likesCount ?? 0);
      setDislikes((_) => post.dislikesCount ?? 0);
      alert(e.message || 'Failed');
    }
  }

  async function onUnlike() {
    if (!token) { alert('Please login to react'); return; }
    try {
      await unlikePost(postId, token);
      // Проста стратегія: перезавантажити пост, щоб синхронізувати лічильники
      const fresh = await getPostById(postId);
      setPost(fresh);
      setLikes(fresh.likesCount ?? 0);
      setDislikes(fresh.dislikesCount ?? 0);
    } catch (e) {
      alert(e.message || 'Failed');
    }
  }

  async function onToggleFavorite() {
    if (!token) { alert('Please login to use favorites'); return; }
    try {
      setFavLoading(true);
      if (isFav) {
        await removeFavoritePost(postId, token);
        setIsFav(false);
      } else {
        await addFavoritePost(postId, token);
        setIsFav(true);
      }
    } catch (e) {
      alert(e.message || 'Failed');
    } finally {
      setFavLoading(false);
    }
  }

  async function onSubmitComment(e) {
    e.preventDefault();
    if (!token) { alert('Please login to comment'); return; }
    const text = newComment.trim();
    if (!text) return;
    try {
      const c = await createComment(postId, text, token);
      setComments((prev) => [c, ...prev]);
      setNewComment('');
      if (taRef.current) { taRef.current.value = ''; onTAInput(); }
    } catch (e) {
      alert(e.message || 'Failed to add comment');
    }
  }

  return (
    <div className="post-page">
      <article className="post-card">
        <header className="post-head">
          <h1 className="post-title">{title}</h1>
          <div className="post-meta">
            <span className="post-author">{authorFullName || authorLogin || 'unknown'}</span>
            <span className="post-dot">•</span>
            <time className="post-date">{createdAt ? new Date(createdAt).toLocaleDateString() : ''}</time>
          </div>
        </header>

        <section className="post-cats">
          {catsLoading && <span className="post-cat post-cat--loading">Loading…</span>}
          {!catsLoading && cats?.map((c) => <span key={c.id} className="post-cat">#{c.title}</span>)}
        </section>

        <section className="post-body">
          {content}
        </section>

        {/* Дії + лічильники праворуч */}
        <section className="post-actions">
          <div className="post-actions__left">
            <button type="button" className="pa-btn" title="Like" onClick={() => onLike('like')}>👍 Like</button>
            <button type="button" className="pa-btn" title="Dislike" onClick={() => onLike('dislike')}>👎 Dislike</button>
            <button type="button" className="pa-btn" title="Remove my reaction" onClick={onUnlike}>↩ Undo reaction</button>
            <button type="button" className="pa-btn" title="Add/Remove Favorite" onClick={onToggleFavorite} disabled={favLoading}>
              {isFav ? '⭐ In favorites' : '☆ Add to favorites'}
            </button>
          </div>
          <div className="post-actions__right">
            <div className="pa-counter" title="Likes">{likes}</div>
            <div className="pa-counter" title="Dislikes">{dislikes}</div>
          </div>
        </section>
      </article>

      {/* Коментарі */}
      <section className="comments">
        <h2 className="comments__title">Comments</h2>

        <form className="comment-form" onSubmit={onSubmitComment}>
          <textarea
            ref={taRef}
            className="comment-input"
            placeholder="Write a comment…"
            rows={1}
            onInput={onTAInput}
            value={newComment}
            onChange={(e)=>setNewComment(e.target.value)}
          />
          <div className="comment-actions">
            <button type="submit" className="comment-submit" disabled={!token || !newComment.trim()}>
              Post
            </button>
          </div>
        </form>

        <div className="comments__list">
          {commentsLoading && <div className="comment-empty">Loading…</div>}
          {!commentsLoading && comments.length === 0 && <div className="comment-empty">No comments yet.</div>}
          {!commentsLoading && comments.length > 0 && comments.map((c) => (
            <div key={c.id} className="comment-item">
              <div className="comment-meta">
                <span className="comment-author">#{c.authorId}</span>
                <span className="comment-dot">•</span>
                <time className="comment-date">{new Date(c.createdAt).toLocaleString()}</time>
              </div>
              <div className="comment-content">{c.content}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
