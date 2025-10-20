// src/search/commands.js
export const ALL_COMMANDS = [
  // ── Навігація
  {
    id: 'goto-home',
    title: 'Go to Home',
    group: 'Navigation',
    keywords: ['home', 'main', 'feed', 'house'],
    action: (navigate) => navigate('/'),
  },
  {
    id: 'goto-profile',
    title: 'Мій Профіль',
    group: 'Navigation',
    keywords: ['акаунт', 'я', 'моя сторінка', 'profile', 'account'],
    action: (navigate) => navigate('/profile'),
  },

  // ── Профіль
  {
    id: 'edit-name',
    title: 'Змінити Ім’я',
    group: 'Profile',
    keywords: ['редагувати', 'імя', 'повне', 'name', 'edit'],
    action: (navigate) => navigate('/profile?modal=edit-name'),
  },
  {
    id: 'change-password',
    title: 'Змінити Пароль',
    group: 'Security',
    keywords: ['пароль', 'безпека', 'захист', 'password', 'security'],
    action: (navigate) => navigate('/profile?modal=change-password'),
  },
  {
    id: 'change-avatar',
    title: 'Змінити Аватар',
    group: 'Profile',
    keywords: ['avatar', 'photo', 'зображення', 'картинка', 'picture'],
    action: (navigate) => navigate('/profile?modal=change-avatar'),
  },

  // ── Auth (на майбутнє теж корисно)
  {
    id: 'goto-login',
    title: 'Login page',
    group: 'Navigation',
    keywords: ['login', 'sign in', 'auth'],
    action: (navigate) => navigate('/login'),
  },
  {
    id: 'goto-register',
    title: 'Register page',
    group: 'Navigation',
    keywords: ['register', 'sign up', 'auth'],
    action: (navigate) => navigate('/register'),
  },
];
