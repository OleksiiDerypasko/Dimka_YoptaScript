// src/features/users/useUsersMap.js
// Публічний фетч користувача за id + простий in-memory кеш.

const _cache = new Map(); // id -> user

async function fetchUserPublic(id) {
  const res = await fetch(`/api/users/${id}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    // 404/400 і т.п. — просто не кидаємо помилку назовні
    return null;
  }
  return res.json();
}

import { useEffect, useMemo, useState } from 'react';

/**
 * Приймає масив userId, повертає map id->user, і lazy-підвантажує відсутніх.
 * Працює БЕЗ токена (бек тепер публічний).
 */
export default function useUsersMap(ids) {
  const uniqIds = useMemo(
    () =>
      Array.from(new Set((ids || []).filter((v) => Number.isFinite(Number(v))))).map((v) =>
        Number(v)
      ),
    [ids]
  );

  // початковий стейт з кешу
  const [map, setMap] = useState(() => {
    const m = new Map();
    uniqIds.forEach((id) => {
      if (_cache.has(id)) m.set(id, _cache.get(id));
    });
    return m;
  });

  useEffect(() => {
    let abort = false;
    (async () => {
      const need = uniqIds.filter((id) => !_cache.has(id));
      if (need.length === 0) return;

      for (const id of need) {
        try {
          const u = await fetchUserPublic(id);
          if (abort) return;
          _cache.set(id, u); // навіть якщо null — кешуємо, щоб не спамити бек
          setMap((prev) => {
            const next = new Map(prev);
            next.set(id, u);
            return next;
          });
        } catch {
          // ігноруємо одиничні збої
        }
      }
    })();
    return () => {
      abort = true;
    };
  }, [uniqIds.join('|')]);

  return map;
}
