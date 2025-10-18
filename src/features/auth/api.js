import { apiSend, apiGet } from '../../shared/lib/apiClient';

// OpenAPI:
// - POST /api/auth/register  (тіло: login, password, passwordConfirm, fullName, email)
// - POST /api/auth/login     (тіло: login, email, password) -> { token }
// - GET  /api/users/{id}     (щоб підтягнути профіль за токеном)

// Реєстрація (201, без токена)
export const registerApi = (payload) =>
  apiSend('/api/auth/register', 'POST', payload);

// Логін (200 -> { token })
export const loginApi = ({ login, email, password }) =>
  apiSend('/api/auth/login', 'POST', { login, email, password });

// Отримати користувача за id (потрібен Bearer)
export const getUserByIdApi = (id) =>
  apiGet(`/api/users/${id}`);
