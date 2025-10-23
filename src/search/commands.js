// src/search/commands.js
export const ALL_COMMANDS = [
  // ── Navigation
  {
    id: 'goto-home',
    title: 'Go to Home',
    group: 'Navigation',
    keywords: ['home', 'main', 'feed', 'house'],
    action: (navigate) => navigate('/'),
  },
  {
    id: 'goto-profile',
    title: 'My Profile', // Змінено
    group: 'Navigation',
    keywords: ['profile', 'account', 'me', 'my page'], // Змінено
    action: (navigate) => navigate('/profile'),
  },

  // ── Profile
  {
    id: 'edit-name',
    title: 'Edit Name', // Змінено
    group: 'Profile',
    keywords: ['edit', 'name', 'full', 'rename', 'update name'], // Змінено
    action: (navigate) => navigate('/profile?modal=edit-name'),
  },
  {
    id: 'change-password',
    title: 'Change Password', // Змінено
    group: 'Security',
    keywords: ['password', 'security', 'protection', 'auth', 'update password'], // Змінено
    action: (navigate) => navigate('/profile?modal=change-password'),
  },
  {
    id: 'change-avatar',
    title: 'Change Avatar', // Змінено
    group: 'Profile',
    keywords: ['avatar', 'photo', 'image', 'picture', 'upload', 'profile picture'], // Змінено
    action: (navigate) => navigate('/profile?modal=change-avatar'),
  },

  // ── Auth (useful for the future too)
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