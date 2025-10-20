// src/shared/CommandSearch.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_COMMANDS } from '../search/commands';
import './CommandSearch.css';

function normalize(s) {
  return String(s || '').toLowerCase().trim();
}

function matchScore(cmd, q) {
  // Дуже простий скорер: +2 якщо в title, +1 за кожне попадання в keywords
  const nq = normalize(q);
  if (!nq) return 0;

  let score = 0;
  if (normalize(cmd.title).includes(nq)) score += 2;
  for (const k of cmd.keywords || []) {
    if (normalize(k).includes(nq)) score += 1;
  }
  return score;
}

export default function CommandSearch({ placeholder = 'Search commands…' }) {
  const nav = useNavigate();
  const [value, setValue] = useState('');
  const [open, setOpen]   = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const inputRef = useRef(null);
  const boxRef   = useRef(null);

  // Фільтрація та сортування результатів
  const results = useMemo(() => {
    const q = value.trim();
    if (!q) return [];
    const withScore = ALL_COMMANDS
      .map(c => ({ c, s: matchScore(c, q) }))
      .filter(x => x.s > 0)
      .sort((a,b) => b.s - a.s);
    return withScore.map(x => x.c).slice(0, 8);
  }, [value]);

  // Клік поза — закриваємо
  useEffect(() => {
    function onDoc(e) {
      const t = e.target;
      if (!boxRef.current) return;
      if (!boxRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    // коли з’явились результати — відкрити список
    setOpen(results.length > 0);
    setActiveIdx(0);
  }, [results.length]);

  function runAction(cmd) {
    try { cmd.action(nav); } finally {
      setOpen(false);
      setValue('');
      // повертаємо фокус, щоб UX був гладкий
      inputRef.current?.blur();
    }
  }

  function onKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = results[activeIdx];
      if (chosen) runAction(chosen);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="cmd" ref={boxRef}>
      <input
        ref={inputRef}
        className="cmd__input"
        type="search"
        value={value}
        onChange={(e)=>setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label="Command search"
      />
      <button
        className="cmd__btn"
        type="button"
        aria-label="Search"
        onClick={() => inputRef.current?.focus()}
      >🔍</button>

      {open && (
        <div className="cmd__menu" role="listbox" aria-label="Commands">
          {results.map((r, i) => (
            <button
              key={r.id}
              className={`cmd__item ${i === activeIdx ? 'is-active' : ''}`}
              role="option"
              onClick={() => runAction(r)}
            >
              <div className="cmd__title">{r.title}</div>
              <div className="cmd__group">{r.group}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
