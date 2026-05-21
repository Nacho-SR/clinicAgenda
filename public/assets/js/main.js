import { requireAuth, setupLogoutButton } from './auth.js';

const isPrivatePage = document.body.dataset.private === 'true';

if (isPrivatePage) {
  requireAuth();
  setupLogoutButton();
}

const currentPath = window.location.pathname.split('/').pop();
document.querySelectorAll('.nav-link').forEach((link) => {
  const href = link.getAttribute('href')?.replace('./', '');
  if (href === currentPath) link.classList.add('active');
});
