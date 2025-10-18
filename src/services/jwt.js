export function parseJwt(token){
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}
export function getUserIdFromToken(token){
  const p = parseJwt(token);
  // Спробуємо популярні поля
  return p?.id || p?.userId || p?.uid || p?.sub || null;
}
