import React from 'react';
import { useSelector } from 'react-redux';            // ← додай
import { selectIsAuthed } from '../features/auth/selectors'; // ← додай
import { Navigate } from 'react-router-dom';          // ← додай
import LoginForm from '../features/auth/ui/LoginForm';
import '../shared/styles/auth.css';

export default function LoginPage() {
  const isAuthed = useSelector(selectIsAuthed);       // тепер працює

  if (isAuthed) return <Navigate to="/" replace />;   // редірект, якщо вже залогінений

  return (
    <div className="auth">
      <aside className="auth__side auth__side--promo">
        <video className="promo-video" src="/videos/promo.mp4" autoPlay muted loop playsInline />
        <div className="promo-overlay" />
      </aside>

      <main className="auth__side auth__side--form">
        <div className="auth__panel">
          <div className="auth__panelHeader">
            <h2>Sign <span className="accent">In</span></h2>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
