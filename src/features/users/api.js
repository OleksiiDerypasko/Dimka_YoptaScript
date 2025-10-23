import { apiGet, apiPatch, apiPost, apiDelete, apiUpload } from '../../shared/lib/apiClient';

// ---------- ПУБЛІЧНІ / ЗАГАЛЬНІ ----------
export const getUserById = (id) => apiGet(`/api/users/${id}`);

// PATCH /api/users/{id} — (self або admin)
export function updateUserApi({ id, data /* {fullName?, email?, role?} */ }) {
  return apiPatch(`/api/users/${id}`, data);
}

// PATCH /api/users/avatar (multipart/form-data)
export function updateAvatarApi({ file }) {
  const fd = new FormData();
  fd.append('avatar', file);
  return apiUpload('/api/users/avatar', fd);
}

// DELETE /api/users/{id} — (self або admin)
export function deleteUserApi(id) {
  return apiDelete(`/api/users/${id}`);
}

// ---------- АДМІНСЬКІ ОПЕРАЦІЇ ----------
export function listUsersAdmin() { return apiGet('/api/admin/users'); }

export function createUserAdmin(body) {
  return apiPost('/api/admin/users', body);
}

export function updateUserAdmin(id, body /* {fullName?, email?, role?} */) {
  return apiPatch(`/api/admin/users/${id}`, body);
}

export function deleteUserAdmin(id) {
  return apiDelete(`/api/admin/users/${id}`);
}
