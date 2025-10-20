import { apiPatch, apiUpload } from '../../shared/lib/apiClient';

// PATCH /api/users/{id}
export function updateUserApi({ id, data, token }) {
  return apiPatch(`/api/users/${id}`, data, token);
}

// PATCH /api/users/avatar (multipart/form-data)
export function updateAvatarApi({ file, token }) {
  const fd = new FormData();
  fd.append('avatar', file);
  return apiUpload('/api/users/avatar', fd, token);
}
