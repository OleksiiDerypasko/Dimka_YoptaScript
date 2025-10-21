import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectAuthUser, selectIsAuthed } from '../../features/auth/selectors';
import { logout } from '../../features/auth/actions';
import './Header.css';

function getInitials(user) {
  const src = user?.fullName || user?.login || 'G';
  const parts = String(src).trim().split(/\s+/);
  const a = (parts[0]?.[0] || '').toUpperCase();
  const b = (parts[1]?.[0] || '').toUpperCase();
  return (a + (b || '')).slice(0, 2) || 'G';
}

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector(selectAuthUser);
  const isAuthed = useSelector(selectIsAuthed);

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const showSearch = !isAuthPage;
  const showProfile = !isAuthPage && isAuthed;
  const showAuthButtons = !isAuthPage && !isAuthed;

  const username = user?.login ? `@${user.login}` : '@guest';
  const role = user?.role || 'guest';
  const email = user?.email || 'guest@example.com';
  const initials = getInitials(user);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const toggleMenu = () => setOpen(v => !v);
  const closeMenu = () => setOpen(false);

  // close on outside click & Esc
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      const t = e.target;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onSignOut = () => {
    dispatch(logout());
    setOpen(false);
    navigate('/login');
  };

  return (
    <header className="main-header">
      <div className="header__container">
        {/* LEFT: site name */}
        <div className="header__left">
          <Link to="/" className="brand">USOF</Link>
        </div>

        {/* CENTER: search */}
        <div className={`header__center ${showSearch ? '' : 'is-hidden'}`}>
          <form className="search" onSubmit={(e) => e.preventDefault()}>
            <input
              className="search__input"
              type="search"
              placeholder="Search posts, users…"
              aria-label="Search"
            />
            <button className="search__btn" type="submit" aria-label="Search">🔍</button>
          </form>
        </div>

        {/* RIGHT: profile / auth buttons */}
        <div className="header__right">
          {showProfile && (
            <div
              className="profile"
              ref={triggerRef}
              onClick={toggleMenu}
            >
              <div className="profile__info">
                <div className="profile__username">{username}</div>
                <div className="profile__role">{role}</div>
              </div>

              <div className="profile__avatar">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" />
                ) : (
                  <div className="avatar-fallback" aria-hidden>{initials}</div>
                )}
              </div>

              {/* Dropdown */}
              {open && (
                <div
                  className="account-menu"
                  ref={menuRef}
                  role="dialog"
                  aria-label="Account menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="account-menu__close"
                    aria-label="Close"
                    onClick={(e) => { e.stopPropagation(); closeMenu(); }}
                  >
                    ✕
                  </button>

                  <div className="account-menu__email">{email}</div>

                  <div className="account-menu__avatarWrap">
                    {user?.avatarUrl ? (
                      <img className="account-menu__avatar" src={user.avatarUrl} alt="avatar" />
                    ) : (
                      <div className="account-menu__avatar account-menu__avatar--fallback">
                        {initials}
                      </div>
                    )}
                  </div>

                  <div className="account-menu__hello">
                    Hello, <strong>{user?.fullName || user?.login || 'guest'}</strong>!
                  </div>

                  {/* ---- Google-like list ---- */}
                  <nav className="am-list" aria-label="Account actions">
                    {/* Create post — зверху */}
                    <button
                      type="button"
                      className="am-item am-item--primary"
                      onClick={() => { closeMenu(); navigate('/posts/new'); }}
                    >
                      <span className="am-ic" aria-hidden>➕</span>
                      <span className="am-text">
                        <span className="am-title">Create post</span>
                        <span className="am-sub">Share something great</span>
                      </span>
                    </button>

                    <div className="am-divider" role="separator" aria-hidden />

                    <div className="am-row">
                      <button
                        type="button"
                        className="am-item"
                        onClick={() => { closeMenu(); navigate('/profile'); }}
                      >
                        <span className="am-ic" aria-hidden>👤</span>
                        <span className="am-text">
                          <span className="am-title">Profile</span>
                          <span className="am-sub">View and edit profile</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        className="am-item"
                        onClick={(e) => { e.stopPropagation(); onSignOut(); }}
                      >
                        <span className="am-ic" aria-hidden>🚪</span>
                        <span className="am-text">
                          <span className="am-title">Sign out</span>
                          <span className="am-sub">Log out of account</span>
                        </span>
                      </button>
                    </div>
                  </nav>
                </div>
              )}
            </div>
          )}

          {/* КНОПКИ LOGIN / REGISTER для гостей */}
          {showAuthButtons && (
            <div className="auth-buttons">
              <button
                className="auth-btn"
                onClick={() => navigate('/login')}
              >
                Login
              </button>
              <button
                className="auth-btn auth-btn--primary"
                onClick={() => navigate('/register')}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
