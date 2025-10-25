import React from 'react';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="nf">
      {/* фонове відео */}
      <video
        className="nf__video"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/videos/404_5.mp4" type="video/mp4" />
      </video>

      {/* затемнення поверх відео */}
      <div className="nf__overlay" />

      {/* контент */}
      <div className="nf__content">
        <h1 className="nf__code">404</h1>
        <p className="nf__text">Page not found</p>
        <a className="nf__btn" href="/">Go Home</a>
      </div>
    </div>
  );
}
