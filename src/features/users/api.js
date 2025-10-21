import { apiPatch, apiUpload } from '../../shared/lib/apiClient';
import { apiGet } from '../../shared/lib/apiClient';

// PATCH /api/users/{id}
export function updateUserApi({ id, data, token }) {
  return apiPatch(`/api/users/${id}`, data, token);
}
export const getUserById = (id) => apiGet(`/api/users/${id}`);

// PATCH /api/users/avatar (multipart/form-data)
export function updateAvatarApi({ file, token }) {
  const fd = new FormData();
  fd.append('avatar', file);
  return apiUpload('/api/users/avatar', fd, token);
}
