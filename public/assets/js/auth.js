import { auth, db, serverTimestamp } from './firebase.js';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

import {
  doc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

import { validateFields } from './validators.js';
import { showAlert, setButtonLoading, formatFirebaseError } from './ui.js';

export function setupRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = document.getElementById('registerButton');
    const fullName = form.fullName.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;

    const errors = validateFields([
      {
        label: 'Nombre completo',
        value: fullName,
        rules: { required: true, minLength: 3 }
      },
      {
        label: 'Correo electrónico',
        value: email,
        rules: { required: true, email: true }
      },
      {
        label: 'Contraseña',
        value: password,
        rules: { required: true, minLength: 6 }
      }
    ]);

    if (errors.length > 0) {
      showAlert(errors.join('<br>'), 'danger');
      return;
    }

    try {
      setButtonLoading(button, true, 'Creando cuenta...');

      const credential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, 'users', credential.user.uid), {
        fullName,
        email,
        role: 'user',
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: credential.user.uid
      });

      window.location.href = './dashboard.html';
    } catch (error) {
      console.error('Error completo:', error);
      console.error('Código Firebase:', error.code);
      console.error('Mensaje Firebase:', error.message);

      showAlert(
        `Error: ${error.code || 'sin-codigo'}<br>${error.message || ''}`,
        'danger'
      );
    } finally {
      setButtonLoading(button, false);
    }
  });
}

export function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = document.getElementById('loginButton');
    const email = form.email.value.trim();
    const password = form.password.value;

    const errors = validateFields([
      {
        label: 'Correo electrónico',
        value: email,
        rules: { required: true, email: true }
      },
      {
        label: 'Contraseña',
        value: password,
        rules: { required: true, minLength: 6 }
      }
    ]);

    if (errors.length > 0) {
      showAlert(errors.join('<br>'), 'danger');
      return;
    }

    try {
      setButtonLoading(button, true, 'Entrando...');
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = './dashboard.html';
    } catch (error) {
      showAlert(formatFirebaseError(error), 'danger');
    } finally {
      setButtonLoading(button, false);
    }
  });
}

export function setupLogoutButton() {
  const button = document.getElementById('logoutButton');
  if (!button) return;

  button.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = './login.html';
  });
}

export function requireAuth(callback = null) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = './login.html';
      return;
    }

    const userEmailElement = document.getElementById('currentUserEmail');
    if (userEmailElement) userEmailElement.textContent = user.email;

    if (typeof callback === 'function') callback(user);
  });
}

export function redirectIfAuthenticated() {
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = './dashboard.html';
  });
}

export function redirectIndexBySession() {
  onAuthStateChanged(auth, (user) => {
    window.location.href = user ? './dashboard.html' : './login.html';
  });
}

export function getCurrentUser() {
  return auth.currentUser;
}