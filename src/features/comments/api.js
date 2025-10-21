import { apiGet } from '../../shared/lib/apiClient';

// Коментарі до поста (публічні)
export const getPostComments = async (postId) => {
  if (!postId) throw new Error('postId is required');
  return apiGet(`/api/posts/${postId}/comments`);
};

// Один коментар (якщо потрібно)
export const getCommentById = async (id) => apiGet(`/api/comments/${id}`);
