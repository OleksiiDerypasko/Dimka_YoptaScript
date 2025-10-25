import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuthToken, selectAuthUser } from '../features/auth/selectors';
import {
  getPostByIdApi,
  getPostCategoriesApi,
  listCategoriesApi,
  updatePostApi,
} from '../features/posts/api';
import './EditPostPage.css';

export default function EditPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useSelector(selectAuthToken);
  const me = useSelector(selectAuthUser);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCats, setSelectedCats] = useState([]); // number[]

  const [cats, setCats] = useState([]);
  const [catsLoading, setCatsLoading] = useState(false);
  const [catsErr, setCatsErr] = useState(null);

  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitErr, setSubmitErr] = useState(null);

  // initial load: post + categories
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        // 1) завантажити пост
        const post = await getPostByIdApi(id);
        if (abort) return;

        // Перевірка власника: тільки автор має право редагувати.
        if (!me?.id || post.authorId !== me.id) {
          setErr('You are not allowed to edit this post (owner only).');
          setLoading(false);
          return;
        }

        setTitle(post.title || '');
        setContent(post.content || '');

        // 2) завантажити категорії поста
        try {
          const pc = await getPostCategoriesApi(id);
          if (!abort && Array.isArray(pc)) {
            setSelectedCats(pc.map(c => c.id));
          }
        } catch {}

        // 3) завантажити всі категорії для вибору
        try {
          setCatsLoading(true);
          const list = await listCategoriesApi();
          if (!abort) setCats(Array.isArray(list) ? list : []);
        } catch (e) {
          if (!abort) setCatsErr(e?.message || 'Failed to load categories');
        } finally {
          if (!abort) setCatsLoading(false);
        }
      } catch (e) {
        if (!abort) setErr(e?.message || 'Failed to load post');
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [id, me?.id]);

  function toggleCat(cid) {
    setSelectedCats(prev => (
      prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid]
    ));
  }

  const valid = useMemo(() => {
    const t = title.trim();
    const c = content.trim();
    return t.length >= 3 && c.length >= 3 && selectedCats.length >= 1;
  }, [title, content, selectedCats.length]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!token) { navigate('/login'); return; }
    if (!valid) return;

    try {
      setSubmitBusy(true);
      setSubmitErr(null);

      const body = {
        title: title.trim(),
        content: content.trim(),
        categories: selectedCats,
      };

      const updated = await updatePostApi(id, body, token);

      // 🔧 ГІДРАЦІЯ: гарантуємо наявність автора для миттєвого перегляду
      const hydrated = {
        ...updated,
        authorId: updated.authorId ?? me?.id,
        authorLogin: updated.authorLogin ?? me?.login,
        authorFullName: updated.authorFullName ?? me?.fullName,
      };

      // повертаємося на сторінку поста з повними даними
      navigate(`/posts/${hydrated.id}`, { state: { post: hydrated } });
    } catch (e2) {
      setSubmitErr(e2?.message || 'Failed to update post');
    } finally {
      setSubmitBusy(false);
    }
  }

  if (loading) {
    return <div className="epg"><div className="epg__state">Loading…</div></div>;
  }
  if (err) {
    return (
      <div className="epg">
        <div className="epg__state epg__state--err">⚠ {String(err)}</div>
        <div style={{ marginTop: 10 }}>
          <button className="epg-btn" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="epg">
      <form className="epg__card" onSubmit={onSubmit}>
        <h1 className="epg__title">Edit post</h1>

        <label className="epg__field">
          <span className="epg__label">Title</span>
          <input
            className="epg__input"
            type="text"
            placeholder="Enter title (min 3 chars)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={3}
            required
          />
        </label>

        <label className="epg__field">
          <span className="epg__label">Content</span>
          <textarea
            className="epg__textarea"
            placeholder="Update content (min 3 chars)"
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </label>

        <div className="epg__field">
          <div className="epg__label">Categories</div>
          {catsLoading && <div className="epg__hint">Loading categories…</div>}
          {catsErr && <div className="epg__err">⚠ {catsErr}</div>}

          {!catsLoading && !catsErr && (
            <div className="epg__cats">
              {cats.length === 0 && (
                <div className="epg__hint">No categories yet.</div>
              )}
              {cats.map(cat => (
                <label key={cat.id} className={`epg__chip ${selectedCats.includes(cat.id) ? 'is-active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(cat.id)}
                    onChange={() => toggleCat(cat.id)}
                  />
                  <span>#{cat.title}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {submitErr && <div className="epg__err">⚠ {submitErr}</div>}

        <div className="epg__actions">
          <button type="button" className="epg-btn" onClick={() => navigate(-1)} disabled={submitBusy}>
            ← Back
          </button>
          <button
            type="submit"
            className="epg-btn epg-btn--primary"
            disabled={!valid || submitBusy}
            title={!valid ? 'Fill title, content and choose at least 1 category' : 'Save'}
          >
            {submitBusy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
