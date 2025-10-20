import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getPostByIdApi,
  getPostCommentsApi,
  getPostReactionsApi,
  setPostReactionApi,
  clearPostReactionApi,
} from '../features/posts/api';
import { useSelector } from 'react-redux';
import { selectAuthToken, selectAuthUser } from '../features/auth/selectors';
import './PostPage.css';

export default function PostPage() {
  const { id } = useParams();
  const token = useSelector(selectAuthToken);
  const me    = useSelector(selectAuthUser);

  const [post, setPost] = useState(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [errorPost, setErrorPost] = useState(null);

  const [comments, setComments] = useState([]);
  const [loadingCom, setLoadingCom] = useState(true);
  const [errorCom, setErrorCom] = useState(null);

  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [myReaction, setMyReaction] = useState(null); // 'like' | 'dislike' | null
  const [busyReact, setBusyReact] = useState(false);

  // пост
  useEffect(() => {
    let mounted = true;
    setLoadingPost(true);
    setErrorPost(null);
    (async () => {
      try {
        const p = await getPostByIdApi(id);
        if (!mounted) return;
        setPost(p);
      } catch (e) {
        if (mounted) setErrorPost(e.message || 'Failed to load post');
      } finally {
        if (mounted) setLoadingPost(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  // коменти
  useEffect(() => {
    let mounted = true;
    setLoadingCom(true);
    setErrorCom(null);
    (async () => {
      try {
        const list = await getPostCommentsApi(id);
        if (!mounted) return;
        setComments(list || []);
      } catch (e) {
        if (mounted) setErrorCom(e.message || 'Failed to load comments');
      } finally {
        if (mounted) setLoadingCom(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  // реакції
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const reacts = await getPostReactionsApi(id);
        if (!mounted) return;
        const likes = reacts.filter(r => r.type === 'like').length;
        const dislikes = reacts.filter(r => r.type === 'dislike').length;
        setLikeCount(likes);
        setDislikeCount(dislikes);

        const mine = me?.id ? reacts.find(r => r.authorId === me.id) : null;
        setMyReaction(mine?.type || null);
      } catch {
        // не критично
      }
    })();
    return () => { mounted = false; };
  }, [id, me?.id]);

  // часткове “розпізнавання” імен у коментах
  const nameByAuthorId = useMemo(() => {
    const map = new Map();
    if (me?.id) map.set(me.id, me.fullName || me.login || `User #${me.id}`);
    return map;
  }, [me]);

  async function handleLike(type) {
    if (!token) { alert('Sign in to react'); return; }
    if (busyReact) return;
    setBusyReact(true);

    try {
      if (myReaction === type) {
        // натисли вже активну -> зняти реакцію
        await clearPostReactionApi(id, token);
        if (type === 'like') setLikeCount(c => Math.max(0, c - 1));
        else setDislikeCount(c => Math.max(0, c - 1));
        setMyReaction(null);
      } else if (myReaction === null) {
        // не було -> поставити
        await setPostReactionApi(id, type, token);
        if (type === 'like') setLikeCount(c => c + 1);
        else setDislikeCount(c => c + 1);
        setMyReaction(type);
      } else {
        // була протилежна -> переключити
        await setPostReactionApi(id, type, token);
        if (type === 'like') {
          setLikeCount(c => c + 1);
          setDislikeCount(c => Math.max(0, c - 1));
        } else {
          setDislikeCount(c => c + 1);
          setLikeCount(c => Math.max(0, c - 1));
        }
        setMyReaction(type);
      }
    } catch (e) {
      alert(e.message || 'Failed to react');
    } finally {
      setBusyReact(false);
    }
  }

  return (
    <div className="postpage">
      {loadingPost && <div className="postpage__state">Loading post…</div>}
      {errorPost && !loadingPost && <div className="postpage__state postpage__state--err">⚠ {errorPost}</div>}

      {!loadingPost && !errorPost && post && (
        <article className="postpage__card">
          <h1 className="postpage__title">{post.title}</h1>

          <div className="postpage__actions">
            <button
              className={`react-btn ${myReaction === 'like' ? 'is-active' : ''}`}
              onClick={() => handleLike('like')}
              disabled={busyReact}
              title="Like"
            >
              👍 <span className="react-btn__count">{likeCount}</span>
            </button>
            <button
              className={`react-btn ${myReaction === 'dislike' ? 'is-active' : ''}`}
              onClick={() => handleLike('dislike')}
              disabled={busyReact}
              title="Dislike"
            >
              👎 <span className="react-btn__count">{dislikeCount}</span>
            </button>
          </div>

          <div className="postpage__content">{post.content}</div>
        </article>
      )}

      <section className="postpage__comments">
        <h2 className="postpage__h2">Comments</h2>

        {loadingCom && <div className="postpage__state">Loading comments…</div>}
        {errorCom && !loadingCom && <div className="postpage__state postpage__state--err">⚠ {errorCom}</div>}

        {!loadingCom && !errorCom && comments.length === 0 && (
          <div className="postpage__state">No comments yet.</div>
        )}

        {!loadingCom && !errorCom && comments.length > 0 && (
          <ul className="postpage__clist">
            {comments.map((c) => {
              const name =
                nameByAuthorId.get(c.authorId) ||
                c.authorLogin /* якщо бек колись додасть */ ||
                c.authorFullName /* якщо бек колись додасть */ ||
                `User #${c.authorId}`;
              return (
                <li key={c.id} className="comment">
                  <div className="comment__head">
                    <span className="comment__author">{name}</span>
                    <time className="comment__time" dateTime={c.createdAt}>
                      {new Date(c.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <div className="comment__body">{c.content}</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
