// src/features/posts/postApi.js
import { apiGet, apiPost, apiDelete, apiPatch } from '../../shared/lib/apiClient';

// ---- Posts ----
export const getPostById = (id) => apiGet(`/api/posts/${id}`);
export const getPostCategories = (id) => apiGet(`/api/posts/${id}/categories`);
export const listPostComments = (id) => apiGet(`/api/posts/${id}/comments`);

// --- Admin/Author: оновити статус поста (ми дозволяємо тільки адмінам у UI)
export const updatePostStatus = (postId, status) =>
  apiPatch(`/api/posts/${postId}`, { status }); // status: 'active' | 'inactive'

// ---- Reactions (likes/dislikes) ----
// Додаємо cache-buster як дублер до no-store
export const listPostReactions = (postId) =>
  apiGet(`/api/posts/${postId}/like`, { _: Date.now() });

// Поставити реакцію (type: 'like' | 'dislike')
export const likePost = (postId, type /* 'like'|'dislike' */) =>
  apiPost(`/api/posts/${postId}/like`, { type });

// Зняти свою реакцію
export const unlikePost = (postId) => apiDelete(`/api/posts/${postId}/like`);

// ---- Favorites ----
export const addFavoritePost = (postId) => apiPost(`/api/posts/${postId}/favorite`);
export const removeFavoritePost = (postId) => apiDelete(`/api/posts/${postId}/favorite`);
export const listUserFavorites = (userId) => apiGet(`/api/users/${userId}/favorites`, { _: Date.now() });

// ---- Comments ----
export const createComment = (postId, content) =>
  apiPost(`/api/comments`, { postId, content });

export const deleteComment = (commentId) =>
  apiDelete(`/api/comments/${commentId}`);

// ---- Reactions (comments) ----
export const listCommentReactions = (commentId) =>
  apiGet(`/api/comments/${commentId}/like`, { _: Date.now() }); // Array<Like> { authorId, type }

export const likeComment = (commentId, type) =>
  apiPost(`/api/comments/${commentId}/like`, { type }); // {type: 'like'|'dislike'}

export const unlikeComment = (commentId) =>
  apiDelete(`/api/comments/${commentId}/like`);

export async function countPostComments(postId) {
  const list = await listPostComments(postId);
  return Array.isArray(list) ? list.length : 0;
}

// --- Admin: comments by post (всі статуси) ---
export const adminListCommentsByPost = (postId) =>
  apiGet(`/api/admin/comments`, { postId, _: Date.now() });

// --- Admin: змінити статус коментаря ---
export const adminSetCommentStatus = (commentId, status) =>
  apiPatch(`/api/admin/comments/${commentId}/status`, { status });

// --- User: змінити статус СВОГО коментаря ---
export const setMyCommentStatus = (commentId, status) =>
  apiPatch(`/api/comments/${commentId}`, { status });
