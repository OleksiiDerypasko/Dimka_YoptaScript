// src/pages/RegisterPage.jsx
import React from 'react';
import RegisterForm from '../features/auth/ui/RegisterForm';
import '../shared/styles/auth.css';
import { useSelector } from 'react-redux';
import { selectIsAuthed } from '../features/auth/selectors';
import { Navigate } from 'react-router-dom';

export default function RegisterPage() {
  const isAuthed = useSelector(selectIsAuthed);
  if (isAuthed) return <Navigate to="/" replace />;
  return (
    <div className="auth">
      {/* LEFT: відео + затемнення */}
      <aside className="auth__side auth__side--promo">
        <video
          className="promo-video"
          src="/videos/video.mp4" // шлях від public/
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="promo-overlay" />
      </aside>

      {/* RIGHT: форма */}
      <main className="auth__side auth__side--form">
        <div className="auth__panel">
          <div className="auth__panelHeader">
            <h2>Sign <span className="accent">Up</span></h2>
          </div>
          <RegisterForm />
        </div>
      </main>
    </div>
  );
}
