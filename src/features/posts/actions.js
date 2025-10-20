// src/features/posts/actions.js
import { fetchPostsApi } from './api';

export const POSTS_FETCH_START   = 'posts/fetchStart';
export const POSTS_FETCH_SUCCESS = 'posts/fetchSuccess';
export const POSTS_FETCH_ERROR   = 'posts/fetchError';

/**
 * params: { page, limit, sort, order, status, categories: number[], match?: 'any'|'all' }
 * - match: 'all' => клієнтський AND (перетин); 'any' або відсутній => звичайний бекендовий OR
 */
export function fetchPosts(params = {}) {
  return async (dispatch) => {
    dispatch({ type: POSTS_FETCH_START });
    try {
      const { categories, match, ...rest } = params || {};

      // Коли немає масиву або 0/1 категорія — один звичайний бек-запит (OR)
      if (!Array.isArray(categories) || categories.length <= 1 || match !== 'all') {
        const data = await fetchPostsApi(params);
        dispatch({ type: POSTS_FETCH_SUCCESS, payload: data });
        return;
      }

      // AND режим: робимо по одному запиту на кожну категорію та перетинаємо
      const base = { ...rest };
      const promises = categories.map((catId) =>
        fetchPostsApi({ ...base, categories: [catId] })
      );
      const results = await Promise.all(promises);

      // рахуємо перетин
      const seenCount = new Map(); // id -> count
      const byId      = new Map(); // id -> пост (перший екземпляр)

      for (const r of results) {
        const idsThisResponse = new Set();
        for (const p of (r?.items || [])) {
          if (idsThisResponse.has(p.id)) continue;
          idsThisResponse.add(p.id);
          seenCount.set(p.id, (seenCount.get(p.id) || 0) + 1);
          if (!byId.has(p.id)) byId.set(p.id, p);
        }
      }

      const need = categories.length;
      let intersect = [];
      for (const [id, cnt] of seenCount.entries()) {
        if (cnt === need) intersect.push(byId.get(id));
      }

      // локальне сортування як на бекенді
      const sort  = base.sort  || 'likes';
      const order = base.order || 'desc';
      const dir = order === 'asc' ? 1 : -1;

      intersect.sort((a, b) => {
        if (sort === 'date') {
          return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
        }
        // likes за замовчуванням
        return ((a.likesCount || 0) - (b.likesCount || 0)) * dir;
      });

      const limit = Math.max(1, Math.min(15, Number(base.limit) || 10));
      const items = intersect.slice(0, limit);

      dispatch({
        type: POSTS_FETCH_SUCCESS,
        payload: { total: intersect.length, page: 1, limit, items },
      });
    } catch (e) {
      dispatch({
        type: POSTS_FETCH_ERROR,
        error: e?.message || 'Failed to load posts',
      });
    }
  };
}
