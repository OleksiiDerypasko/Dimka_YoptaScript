import { apiGet } from '../../shared/lib/apiClient';

// Повертає масив категорій: [{ id, title, ... }]
export async function fetchCategoriesApi() {
  const res = await fetch('/api/categories');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}