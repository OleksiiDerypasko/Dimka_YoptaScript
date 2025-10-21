// src/features/posts/postApi.js
import { apiGet, apiPost, apiDelete } from '../../shared/lib/apiClient';

// ---- Posts ----
export const getPostById = (id) => apiGet(`/api/posts/${id}`);
export const getPostCategories = (id) => apiGet(`/api/posts/${id}/categories`);
export const listPostComments = (id) => apiGet(`/api/posts/${id}/comments`);

// ---- Reactions (likes/dislikes) ----
// GET список усіх реакцій до поста: [{ authorId, type: 'like'|'dislike', ... }]
export const listPostReactions = (postId) => apiGet(`/api/posts/${postId}/like`);

// Поставити реакцію (type: 'like' | 'dislike')
export const likePost = (postId, type /* 'like'|'dislike' */) =>
  apiPost(`/api/posts/${postId}/like`, { type });

// Зняти свою реакцію
export const unlikePost = (postId) => apiDelete(`/api/posts/${postId}/like`);

// ---- Favorites ----
export const addFavoritePost = (postId) => apiPost(`/api/posts/${postId}/favorite`);
export const removeFavoritePost = (postId) => apiDelete(`/api/posts/${postId}/favorite`);
export const listUserFavorites = (userId) => apiGet(`/api/users/${userId}/favorites`);

// ---- Comments ----
export const createComment = (postId, content) =>
  apiPost(`/api/comments`, { postId, content });

export const deleteComment = (commentId, _tokenIgnored) =>
  apiDelete(`/api/comments/${commentId}`);

// ---- Reactions (comments) ----
export const listCommentReactions = (commentId, _tokenIgnored) =>
  apiGet(`/api/comments/${commentId}/like`); // Array<Like> { authorId, type }

export const likeComment = (commentId, type, _tokenIgnored) =>
  apiPost(`/api/comments/${commentId}/like`, { type }); // {type: 'like'|'dislike'}

export const unlikeComment = (commentId, _tokenIgnored) =>
  apiDelete(`/api/comments/${commentId}/like`);

export async function countPostComments(postId) {
  const list = await listPostComments(postId);
  return Array.isArray(list) ? list.length : 0;
}