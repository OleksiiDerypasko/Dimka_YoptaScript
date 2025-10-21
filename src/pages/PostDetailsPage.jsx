import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import './PostDetailsPage.css';
import { useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuthToken, selectAuthUser } from '../features/auth/selectors';
import {
  getPostById,
  getPostCategories,
  listPostComments,
  listPostReactions,
  likePost,
  unlikePost,
  addFavoritePost,
  removeFavoritePost,
  listUserFavorites,
  createComment,
  deleteComment,
  listCommentReactions,
  likeComment,
  unlikeComment,
} from '../features/posts/postApi';

// --- helpers ---
function normReaction(value) {
  if (value == null) return null;
  const s = String(value).trim().toLowerCase();
  if (s === 'like' || s === '+1' || s === 'up' || s === '1') return 'like';
  if (s === 'dislike' || s === '-1' || s === 'down' || s === '0') return 'dislike';
  return null;
}

// Парсер "відповіді": префікс у контенті @<id> <продовження>
function parseReplyAnchor(content = '') {
  const m = content.match(/^@(\d+)\s+/);
  if (!m) return { parentId: null, pure: content };
  const parentId = Number(m[1]);
  const pure = content.slice(m[0].length);
  return { parentId, pure };
}

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

  const [comments, setComments] = useState([]); // сирий список із бекенду
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Дерево коментарів (1 рівень вкладеності)
  const [commentTree, setCommentTree] = useState([]); // [{node, replies: []}]
  const [collapsed, setCollapsed] = useState({}); // { [parentId]: boolean }

  // Відповідь на коментар (тільки 1-й рівень)
  const [replyTo, setReplyTo] = useState(null); // comment obj (top-level)
  const [newComment, setNewComment] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const taRef = useRef(null);

  // моя реакція до поста
  const [myReaction, setMyReaction] = useState(null);
  const [reactionLoading, setReactionLoading] = useState(false);

  // реакції для коментарів: { [commentId]: { likes, dislikes, myReaction, loading } }
  const [cRx, setCRx] = useState({});

  // кеш користувачів (де можливо з /api/users/{id})
  const [userCache, setUserCache] = useState({});

  const postId = useMemo(() => Number(id), [id]);

  // auto-grow textarea
  const onTAInput = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  };

  // --- показ імені автора коментаря ---
  function displayAuthor(c) {
    if (c.authorFullName && c.authorFullName.trim()) return c.authorFullName;
    if (c.authorLogin && c.authorLogin.trim()) return c.authorLogin;
    if (me?.id && c.authorId === me.id) {
      return me.fullName?.trim() || me.login?.trim() || 'You';
    }
    const cached = userCache[c.authorId];
    if (cached) return cached.fullName?.trim() || cached.login?.trim() || `User #${c.authorId ?? '—'}`;
    return `User #${c.authorId ?? '—'}`;
  }

  // ===== Завантаження поста =====
  useEffect(() => {
    let abort = false;
    (async () => {
      if (statePost) return;
      try {
        setLoading(true);
        const data = await getPostById(postId, token);
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
  }, [postId, statePost, token]);

  // ===== Категорії =====
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setCatsLoading(true);
        const list = await getPostCategories(postId, token);
        if (!abort) setCats(Array.isArray(list) ? list : []);
      } catch {
        if (!abort) setCats([]);
      } finally {
        if (!abort) setCatsLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [postId, token]);

  // ===== Фаворити (початковий стан) =====
  useEffect(() => {
    let abort = false;
    (async () => {
      if (!me?.id || !token) return;
      try {
        const favs = await listUserFavorites(me.id, token);
        if (!abort && Array.isArray(favs)) setIsFav(!!favs.find((p) => p.id === postId));
      } catch {}
    })();
    return () => { abort = true; };
  }, [me?.id, token, postId]);

  // ===== Коментарі: завантаження й побудова дерева (1 рівень) =====
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setCommentsLoading(true);
        const list = await listPostComments(postId, token); // Array<Comment>
        if (abort) return;

        const normalized = (Array.isArray(list) ? list : []).map((c) => {
          const { parentId, pure } = parseReplyAnchor(c.content || '');
          return { ...c, parentId: parentId || null, pureContent: pure };
        });

        // побудова дерева: top-level = !parentId або немає такого parent у списку
        const map = new Map(normalized.map((c) => [c.id, c]));
        const roots = [];
        const childrenByParent = new Map();
        normalized.forEach((c) => {
          const p = c.parentId;
          if (p && map.has(p)) {
            if (!childrenByParent.has(p)) childrenByParent.set(p, []);
            childrenByParent.get(p).push(c);
          } else {
            roots.push(c);
          }
        });

        const tree = roots.map((node) => ({
          node,
          replies: (childrenByParent.get(node.id) || []).sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          ),
        }));

        setComments(normalized);
        setCommentTree(tree);
      } catch {
        if (!abort) {
          setComments([]);
          setCommentTree([]);
        }
      } finally {
        if (!abort) setCommentsLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [postId, token]);

  // ===== Реакції поста =====
  const refreshReactions = useCallback(async () => {
    try {
      const list = await listPostReactions(postId, token);
      if (!Array.isArray(list)) return;
      const likeCount = list.filter(x => normReaction(x.type) === 'like').length;
      const dislikeCount = list.filter(x => normReaction(x.type) === 'dislike').length;
      setLikes(likeCount);
      setDislikes(dislikeCount);
      if (me?.id) {
        const mine = list.find(x => x.authorId === me.id);
        setMyReaction(normReaction(mine?.type));
      } else {
        setMyReaction(null);
      }
    } catch {}
  }, [postId, token, me?.id]);

  useEffect(() => { refreshReactions(); }, [refreshReactions]);

  // ===== Початкові лічильники реакцій для коментарів (без N+1 мега-лупа)
  // Вичитуємо з полів likesCount/dislikesCount, myReaction довантажимо ліниво при взаємодії
  useEffect(() => {
    if (!comments.length) return;
    setCRx((prev) => {
      const next = { ...prev };
      for (const c of comments) {
        if (!next[c.id]) {
          next[c.id] = {
            likes: c.likesCount ?? 0,
            dislikes: c.dislikesCount ?? 0,
            myReaction: null,
            loading: false,
            initialized: false, // чи вичитали вже з бекенду myReaction
          };
        }
      }
      return next;
    });
  }, [comments]);

  // ===== Допоміжне: ліниво підтягнути реакцію юзера для коментаря =====
  async function ensureCommentMyReaction(cid) {
    setCRx((prev) => {
      const cell = prev[cid];
      if (!cell || cell.initialized) return prev;
      return { ...prev, [cid]: { ...cell, loading: true } };
    });
    try {
      const list = await listCommentReactions(cid, token); // Array<Like>
      const likeCount = list.filter(x => normReaction(x.type) === 'like').length;
      const dislikeCount = list.filter(x => normReaction(x.type) === 'dislike').length;
      const mine = me?.id ? list.find(x => x.authorId === me.id) : null;
      const myRx = normReaction(mine?.type);

      setCRx((prev) => ({
        ...prev,
        [cid]: {
          likes: likeCount,
          dislikes: dislikeCount,
          myReaction: myRx,
          loading: false,
          initialized: true,
        },
      }));
    } catch {
      setCRx((prev) => {
        const cell = prev[cid]; if (!cell) return prev;
        return { ...prev, [cid]: { ...cell, loading: false, initialized: true } };
      });
    }
  }

  // ===== ДІЇ: Лайк/Дизлайк поста =====
  async function onTogglePostReaction(type) {
    if (!token) { alert('Please login to react'); return; }
    if (reactionLoading) return;

    setReactionLoading(true);
    const prev = { likes, dislikes, myReaction };

    if (myReaction === type) {
      if (type === 'like') setLikes(v => Math.max(0, v - 1));
      else setDislikes(v => Math.max(0, v - 1));
      setMyReaction(null);
      try { await unlikePost(postId, token); }
      catch (e) {
        setLikes(prev.likes); setDislikes(prev.dislikes); setMyReaction(prev.myReaction);
        alert(e?.message || 'Failed to undo reaction');
      } finally { setReactionLoading(false); refreshReactions(); }
      return;
    }

    if (myReaction === null) {
      if (type === 'like') setLikes(v => v + 1); else setDislikes(v => v + 1);
      setMyReaction(type);
      try { await likePost(postId, type, token); }
      catch (e) {
        setLikes(prev.likes); setDislikes(prev.dislikes); setMyReaction(prev.myReaction);
        alert(e?.message || 'Failed to set reaction');
      } finally { setReactionLoading(false); refreshReactions(); }
      return;
    }

    // switch
    if (myReaction === 'like') setLikes(v => Math.max(0, v - 1)); else setDislikes(v => Math.max(0, v - 1));
    if (type === 'like') setLikes(v => v + 1); else setDislikes(v => v + 1);
    setMyReaction(type);
    try { await unlikePost(postId, token); await likePost(postId, type, token); }
    catch (e) {
      setLikes(prev.likes); setDislikes(prev.dislikes); setMyReaction(prev.myReaction);
      alert(e?.message || 'Failed to switch reaction');
    } finally { setReactionLoading(false); refreshReactions(); }
  }

  // ===== ДІЇ: Лайк/Дизлайк коментаря =====
  async function onToggleCommentReaction(cid, type) {
    if (!token) { alert('Please login to react'); return; }
    // ліниво підвантажимо мій стан якщо ще ні
    if (!cRx[cid]?.initialized) {
      await ensureCommentMyReaction(cid);
    }
    setCRx((prev) => {
      const cell = prev[cid]; if (!cell) return prev;
      if (cell.loading) return prev;
      return { ...prev, [cid]: { ...cell, loading: true } };
    });

    const prev = cRx[cid];

    // повторний клік — зняти
    if (prev?.myReaction === type) {
      setCRx((p) => {
        const cell = p[cid];
        const likes = type === 'like' ? Math.max(0, cell.likes - 1) : cell.likes;
        const dislikes = type === 'dislike' ? Math.max(0, cell.dislikes - 1) : cell.dislikes;
        return { ...p, [cid]: { ...cell, likes, dislikes, myReaction: null } };
      });
      try { await unlikeComment(cid, token); }
      catch (e) {
        setCRx((p) => ({ ...p, [cid]: prev })); alert(e?.message || 'Failed to undo reaction');
      } finally { await ensureCommentMyReaction(cid); }
      return;
    }

    // не було — ставимо
    if (!prev?.myReaction) {
      setCRx((p) => {
        const cell = p[cid];
        const likes = type === 'like' ? cell.likes + 1 : cell.likes;
        const dislikes = type === 'dislike' ? cell.dislikes + 1 : cell.dislikes;
        return { ...p, [cid]: { ...cell, likes, dislikes, myReaction: type } };
      });
      try { await likeComment(cid, type, token); }
      catch (e) {
        setCRx((p) => ({ ...p, [cid]: prev })); alert(e?.message || 'Failed to set reaction');
      } finally { await ensureCommentMyReaction(cid); }
      return;
    }

    // switch
    setCRx((p) => {
      const cell = p[cid];
      const likes = cell.myReaction === 'like' ? Math.max(0, cell.likes - 1) : cell.likes;
      const dislikes = cell.myReaction === 'dislike' ? Math.max(0, cell.dislikes - 1) : cell.dislikes;
      const likes2 = type === 'like' ? likes + 1 : likes;
      const dislikes2 = type === 'dislike' ? dislikes + 1 : dislikes;
      return { ...p, [cid]: { ...cell, likes: likes2, dislikes: dislikes2, myReaction: type } };
    });
    try { await unlikeComment(cid, token); await likeComment(cid, type, token); }
    catch (e) {
      setCRx((p) => ({ ...p, [cid]: prev })); alert(e?.message || 'Failed to switch reaction');
    } finally { await ensureCommentMyReaction(cid); }
  }

  // ===== ДІЇ: Фаворити =====
  async function onToggleFavorite() {
    if (!token) { alert('Please login to use favorites'); return; }
    try {
      setFavLoading(true);
      if (isFav) { await removeFavoritePost(postId, token); setIsFav(false); }
      else { await addFavoritePost(postId, token); setIsFav(true); }
    } catch (e) { alert(e.message || 'Failed'); }
    finally { setFavLoading(false); }
  }

  // ===== ДІЇ: Відправка коментаря / Відповіді (1 рівень) =====
  async function onSubmitComment(e) {
    e.preventDefault();
    if (!token) { alert('Please login to comment'); return; }
    const text = newComment.trim();
    if (!text) return;

    try {
      setCommentSending(true); setCommentError(null);

      const payloadContent = replyTo ? `@${replyTo.id} ${text}` : text;
      const created = await createComment(postId, payloadContent, token);

      // обчислити parentId/pureContent
      const { parentId, pure } = parseReplyAnchor(created.content || '');
      const createdExt = { ...created, parentId: parentId || null, pureContent: pure };

      // оновити список і дерево
      setComments((prev) => [createdExt, ...prev]);
      setCommentTree((prev) => {
        if (createdExt.parentId && prev.some(x => x.node.id === createdExt.parentId)) {
          // додати як відповідь
          return prev.map((group) => {
            if (group.node.id !== createdExt.parentId) return group;
            return { ...group, replies: [createdExt, ...group.replies] };
          });
        } else {
          // новий кореневий
          return [{ node: createdExt, replies: [] }, ...prev];
        }
      });

      setNewComment('');
      setReplyTo(null);
      if (taRef.current) { taRef.current.value = ''; taRef.current.style.height = 'auto'; }
    } catch (e2) {
      setCommentError(e2?.message || 'Failed to add comment');
    } finally {
      setCommentSending(false);
    }
  }

  // Ctrl/⌘ + Enter -> сабміт
  function onCommentKeyDown(e) {
    const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';
    if (isCtrlEnter) onSubmitComment(e);
  }

  // ===== ДІЇ: Видалення коментаря =====
  async function onDeleteComment(c) {
    if (!token) { alert('Please login'); return; }
    const canDelete = (me?.id && c.authorId === me.id) || (me?.role === 'admin');
    if (!canDelete) { alert('You cannot delete this comment'); return; }
    if (!window.confirm('Delete this comment?')) return;

    // оптимістично
    const prevTree = commentTree;
    const prevList = comments;

    const filteredList = prevList.filter(x => x.id !== c.id);
    const filteredTree = prevTree
      .map(group => {
        if (group.node.id === c.id) return null; // видалили кореневий — зносимо весь блок разом із replies
        const replies = group.replies.filter(r => r.id !== c.id);
        return { ...group, replies };
      })
      .filter(Boolean);

    setComments(filteredList);
    setCommentTree(filteredTree);

    try {
      await deleteComment(c.id, token);
    } catch (e) {
      // відкат
      setComments(prevList);
      setCommentTree(prevTree);
      alert(e?.message || 'Failed to delete comment');
    }
  }

  // ===== UI helpers =====
  function toggleCollapsed(parentId) {
    setCollapsed((p) => ({ ...p, [parentId]: !p[parentId] }));
  }

  if (loading) return <div className="post-page"><div className="post-state">Loading…</div></div>;
  if (error)   return <div className="post-page"><div className="post-state post-state--err">⚠ {String(error)}</div></div>;
  if (!post)   return <div className="post-page"><div className="post-state">No data.</div></div>;

  const { title, content, authorLogin, authorFullName, createdAt } = post;

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

        <section className="post-body">{content}</section>

        {/* Дії (пост) */}
        <section className="post-actions">
          <div className="post-actions__left">
            <button
              type="button"
              className={`pa-btn pa-btn--rxn ${myReaction === 'like' ? 'is-active' : ''}`}
              title="Like"
              onClick={() => onTogglePostReaction('like')}
              disabled={reactionLoading}
            >
              👍 {likes}
            </button>
            <button
              type="button"
              className={`pa-btn pa-btn--rxn ${myReaction === 'dislike' ? 'is-active' : ''}`}
              title="Dislike"
              onClick={() => onTogglePostReaction('dislike')}
              disabled={reactionLoading}
            >
              👎 {dislikes}
            </button>
            <button
              type="button"
              className={`pa-btn ${isFav ? 'is-fav' : ''}`}
              title="Add/Remove Favorite"
              onClick={onToggleFavorite}
              disabled={favLoading}
            >
              {isFav ? '⭐ In favorites' : '☆ Add to favorites'}
            </button>
          </div>
        </section>
      </article>

      {/* Коментарі */}
      <section className="comments">
        <h2 className="comments__title">Comments</h2>

        {/* Форма нового коментаря або відповіді */}
        <form className="comment-form" onSubmit={onSubmitComment}>
          {replyTo && (
            <div className="reply-banner">
              Replying to <strong>#{replyTo.id}</strong>{' '}
              <button type="button" className="reply-cancel" onClick={() => setReplyTo(null)}>Cancel</button>
            </div>
          )}
          <textarea
            ref={taRef}
            className="comment-input"
            placeholder={
              token
                ? (replyTo ? `Reply to #${replyTo.id}… (Ctrl/⌘+Enter)` : "Write a comment… (Ctrl/⌘+Enter)")
                : "Please login to comment"
            }
            rows={1}
            onInput={onTAInput}
            onKeyDown={onCommentKeyDown}
            value={newComment}
            onChange={(e)=>setNewComment(e.target.value)}
            disabled={!token || commentSending}
          />
          <div className="comment-actions" style={{ gap: 8, alignItems: 'center' }}>
            {commentError && (
              <span style={{ color: '#ef4444', fontSize: 12 }}>{String(commentError)}</span>
            )}
            <button
              type="submit"
              className="comment-submit"
              disabled={!token || !newComment.trim() || commentSending}
              title={token ? "Post comment" : "Login required"}
            >
              {commentSending ? 'Posting…' : (replyTo ? 'Reply' : 'Post')}
            </button>
          </div>
        </form>

        {/* Список: 1-й рівень + згортані відповіді */}
        <div className="comments__list">
          {commentsLoading && <div className="comment-empty">Loading…</div>}
          {!commentsLoading && commentTree.length === 0 && <div className="comment-empty">No comments yet.</div>}
          {!commentsLoading && commentTree.length > 0 && commentTree.map(({ node, replies }) => {
            const canDeleteRoot = (me?.id && node.authorId === me.id) || (me?.role === 'admin');
            const cell = cRx[node.id] || { likes: node.likesCount ?? 0, dislikes: node.dislikesCount ?? 0, myReaction: null, loading: false };
            const isCollapsed = !!collapsed[node.id];

            return (
              <div key={node.id} className="comment-item">
                <div className="comment-meta">
                  <span className="comment-author">{displayAuthor(node)}</span>
                  <span className="comment-dot">•</span>
                  <time className="comment-date">{new Date(node.createdAt).toLocaleString()}</time>
                  <span className="comment-dot">•</span>
                  <button
                    type="button"
                    className={`c-rxn ${cell.myReaction === 'like' ? 'is-active' : ''}`}
                    onClick={() => onToggleCommentReaction(node.id, 'like')}
                    disabled={cell.loading}
                    title="Like"
                  >👍 {cell.likes}</button>
                  <button
                    type="button"
                    className={`c-rxn ${cell.myReaction === 'dislike' ? 'is-active' : ''}`}
                    onClick={() => onToggleCommentReaction(node.id, 'dislike')}
                    disabled={cell.loading}
                    title="Dislike"
                  >👎 {cell.dislikes}</button>
                  <span className="comment-dot">•</span>
                  <button
                    type="button"
                    className="comment-action"
                    onClick={() => setReplyTo(node)}
                    title="Reply"
                  >Reply</button>
                  {canDeleteRoot && (
                    <>
                      <span className="comment-dot">•</span>
                      <button
                        type="button"
                        className="comment-delete"
                        onClick={() => onDeleteComment(node)}
                        title="Delete comment"
                      >Delete</button>
                    </>
                  )}
                </div>
                <div className="comment-content">
                  {node.pureContent ?? node.content}
                </div>

                {/* Replies (2-й рівень): collapsible, без можливості відповісти */}
                {!!replies.length && (
                  <div className="replies">
                    <button
                      type="button"
                      className="replies-toggle"
                      onClick={() => toggleCollapsed(node.id)}
                    >
                      {isCollapsed ? `Show ${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}` : 'Hide replies'}
                    </button>

                    {!isCollapsed && (
                      <div className="replies-list">
                        {replies.map((r) => {
                          const canDelete = (me?.id && r.authorId === me.id) || (me?.role === 'admin');
                          const rCell = cRx[r.id] || { likes: r.likesCount ?? 0, dislikes: r.dislikesCount ?? 0, myReaction: null, loading: false };
                          return (
                            <div key={r.id} className="reply-item">
                              <div className="comment-meta">
                                <span className="comment-author">{displayAuthor(r)}</span>
                                <span className="comment-dot">•</span>
                                <time className="comment-date">{new Date(r.createdAt).toLocaleString()}</time>
                                <span className="comment-dot">•</span>
                                <button
                                  type="button"
                                  className={`c-rxn ${rCell.myReaction === 'like' ? 'is-active' : ''}`}
                                  onClick={() => onToggleCommentReaction(r.id, 'like')}
                                  disabled={rCell.loading}
                                  title="Like"
                                >👍 {rCell.likes}</button>
                                <button
                                  type="button"
                                  className={`c-rxn ${rCell.myReaction === 'dislike' ? 'is-active' : ''}`}
                                  onClick={() => onToggleCommentReaction(r.id, 'dislike')}
                                  disabled={rCell.loading}
                                  title="Dislike"
                                >👎 {rCell.dislikes}</button>
                                {canDelete && (
                                  <>
                                    <span className="comment-dot">•</span>
                                    <button
                                      type="button"
                                      className="comment-delete"
                                      onClick={() => onDeleteComment(r)}
                                      title="Delete comment"
                                    >Delete</button>
                                  </>
                                )}
                              </div>
                              <div className="comment-content">
                                {r.pureContent ?? r.content}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
