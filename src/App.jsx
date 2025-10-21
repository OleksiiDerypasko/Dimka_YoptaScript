// src/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Header from './app/layout/Header';
import ProfilePage from './pages/ProfilePage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import PostDetailsPage from './pages/PostDetailsPage';
import CreatePostPage from './pages/CreatePostPage'; 
// src/App.jsx
import EditPostPage from './pages/EditPostPage';


import { restoreSession } from './features/auth/actions';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(restoreSession()); // ← один виклик після монтування
  }, [dispatch]);

  return (
    <div className="app">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/posts/:id" element={<PostDetailsPage />} /> 
          <Route path="/post/:id" element={<PostDetailsPage />} />
          <Route path="/profile" element={<ProfilePage />} /> {/* ← додано */}
          <Route path="/posts/new" element={<CreatePostPage />} />
          <Route path="/posts/:id/edit" element={<EditPostPage />} />
        </Routes>
      </main>
    </div>
  );
}
