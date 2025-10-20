import { apiGet, apiPost, apiDelete } from '../../shared/lib/apiClient';

// POSTS
export const getPostById = (id) => apiGet(`/api/posts/${id}`);
export const getPostCategories = (id) => apiGet(`/api/posts/${id}/categories`);
export const getPostLikesRaw = (id) => apiGet(`/api/posts/${id}/like`); // масив лайків (не обов'язково потрібен)

export const listPostComments = (id) => apiGet(`/api/posts/${id}/comments`);

// likes/dislikes
export async function likePost(id, type, token) {
  // type: 'like' | 'dislike'
  // 1) спробувати створити лайк
  try {
    return await apiPost(`/api/posts/${id}/like`, { body: { type }, token });
  } catch (e) {
    // Якщо вже існує (409) — спробуємо видалити і створити заново (перемикання типу)
    if (String(e.message).includes('409')) {
      try { await apiDelete(`/api/posts/${id}/like`, { token }); } catch {}
      return await apiPost(`/api/posts/${id}/like`, { body: { type }, token });
    }
    throw e;
  }
}

export const unlikePost = (id, token) => apiDelete(`/api/posts/${id}/like`, { token });

// favorites
export const addFavoritePost = (id, token) => apiPost(`/api/posts/${id}/favorite`, { token });
export const removeFavoritePost = (id, token) => apiDelete(`/api/posts/${id}/favorite`, { token });

// user favorites to detect initial favorite state
export const listUserFavorites = (userId, token) => apiGet(`/api/users/${userId}/favorites`, { token });

// COMMENTS
export const createComment = (postId, content, token) =>
  apiPost(`/api/comments`, { body: { postId: Number(postId), content }, token });
