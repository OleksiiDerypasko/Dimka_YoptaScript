import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from '../features/auth/api';

export default function PasswordResetConfirmPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    if (!password || password.length < 6) {
      setErr('Мінімальна довжина пароля — 6 символів.');
      return;
    }
    if (password !== password2) {
      setErr('Паролі не співпадають.');
      return;
    }
    try {
      setBusy(true);
      await confirmPasswordReset(token, password);
      setOk(true);
      // опціонально авто-редірект через кілька секунд:
      // setTimeout(()=>navigate('/login'), 1500);
    } catch (e2) {
      setErr(e2?.message || 'Не вдалося змінити пароль. Посилання могло прострочитись.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{maxWidth: 520, margin: '40px auto', padding: '0 16px', color: '#e7ecf3'}}>
      <div style={{
        background: '#171a22', border: '1px solid #2a3040', borderRadius: 16, padding: 20
      }}>
        <h1 style={{margin: '0 0 10px'}}>Скидання пароля</h1>

        {ok ? (
          <div>
            <p>Пароль успішно змінено. Тепер ви можете увійти з новим паролем.</p>
            <div style={{marginTop: 12}}>
              <Link to="/login" style={{textDecoration: 'underline', color: '#93c5fd'}}>
                Перейти до логіну
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{display: 'grid', gap: 10}}>
            {err && (
              <div style={{color: '#ffb4b4', fontSize: 14}}>{err}</div>
            )}
            <label style={{display: 'grid', gap: 6}}>
              <span>Новий пароль</span>
              <input
                type="password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                placeholder="Введіть новий пароль"
                style={{
                  height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #2a3040',
                  background: '#0f131c', color: '#e7ecf3'
                }}
              />
            </label>
            <label style={{display: 'grid', gap: 6}}>
              <span>Повторіть пароль</span>
              <input
                type="password"
                value={password2}
                onChange={(e)=>setPassword2(e.target.value)}
                placeholder="Повторіть пароль"
                style={{
                  height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #2a3040',
                  background: '#0f131c', color: '#e7ecf3'
                }}
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              style={{
                height: 40, borderRadius: 10, border: '1px solid #2a3040',
                background: '#0f131c', color: '#e7ecf3', fontWeight: 700, cursor: 'pointer'
              }}
              title="Підтвердити новий пароль"
            >
              {busy ? 'Збереження…' : 'Змінити пароль'}
            </button>

            <div style={{marginTop: 8}}>
              <Link to="/" style={{textDecoration: 'underline', color: '#93c5fd'}}>На головну</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
