// src/features/users/api.js
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

// ---------- АДМІНСЬКІ ОПЕРАЦІЇ ----------
// Swagger: GET /api/admin/users
export function listUsersAdmin() {
  return apiGet('/api/admin/users');
}

// Swagger: POST /api/admin/users
// body: {login, email, fullName, password, role='user'}
export function createUserAdmin(body) {
  return apiPost('/api/admin/users', body);
}

// Swagger: PATCH /api/admin/users/{id}
export function updateUserAdmin(id, body /* {fullName?, email?, role?} */) {
  return apiPatch(`/api/admin/users/${id}`, body);
}

// Swagger: DELETE /api/admin/users/{id}
export function deleteUserAdmin(id) {
  return apiDelete(`/api/admin/users/${id}`);
}
