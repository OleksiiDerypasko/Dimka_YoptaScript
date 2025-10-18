import { registerApi, loginApi, getUserByIdApi } from './api';
import { setToken, clearToken, getToken } from '../../services/storage';
import { getUserIdFromToken } from '../../services/jwt';

export const AUTH_START   = 'auth/start';
export const AUTH_SUCCESS = 'auth/success';
export const AUTH_ERROR   = 'auth/error';
export const AUTH_LOGOUT  = 'auth/logout';

// Реєстрація: бек НЕ повертає token за OpenAPI, лише {id, login, email}
export function registerUser({ login, password, passwordConfirm, fullName, email }) {
  return async (dispatch) => {
    dispatch({ type: AUTH_START });
    try {
      const res = await registerApi({ login, password, passwordConfirm, fullName, email });
      // Можеш показати тост "Перевірте email для підтвердження", якщо це твоя UX-логіка.
      dispatch({ type: AUTH_SUCCESS, payload: { user: null, token: null, meta: { registered: true, echo: res } } });
      return true;
    } catch (e) {
      dispatch({ type: AUTH_ERROR, error: e?.error || 'Registration failed' });
      return false;
    }
  };
}

// Логін: зберігаємо токен, пробуємо підтягнути user через /api/users/{id} якщо JWT містить id
export function loginUser({ login, email, password }) {
  return async (dispatch) => {
    dispatch({ type: AUTH_START });
    try {
      const { token } = await loginApi({ login, email, password });
      if (token) setToken(token);

      let user = null;
      const uid = getUserIdFromToken(token);
      if (uid) {
        try { user = await getUserByIdApi(uid); } catch { /* токен валідний, але профіль не підтягнувся — не критично */ }
      }

      dispatch({ type: AUTH_SUCCESS, payload: { user, token } });
      return true;
    } catch (e) {
      dispatch({ type: AUTH_ERROR, error: e?.error || 'Login failed' });
      return false;
    }
  };
}

// Відновлення сесії на старті додатку (якщо токен вже збережений)
export function restoreSession() {
  return async (dispatch) => {
    const token = getToken();
    if (!token) return;

    dispatch({ type: AUTH_START });
    const uid = getUserIdFromToken(token);
    if (!uid) {
      dispatch({ type: AUTH_SUCCESS, payload: { user: null, token } });
      return;
    }
    try {
      const user = await getUserByIdApi(uid);
      dispatch({ type: AUTH_SUCCESS, payload: { user, token } });
    } catch {
      // якщо токен не підійшов — просто залишаємо токен (або можна скинути)
      dispatch({ type: AUTH_SUCCESS, payload: { user: null, token } });
    }
  };
}

export function logout() {
  return (dispatch) => { clearToken(); dispatch({ type: AUTH_LOGOUT }); };
}
