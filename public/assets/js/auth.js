import { auth, db, serverTimestamp } from './firebase.js';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

import {
  doc,
  getDoc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

import { validateFields } from './validators.js';
import { showAlert, setButtonLoading, formatFirebaseError } from './ui.js';

const SYSTEM_ROLE = 'admin';
let currentSession = null;

function redirectToLogin() {
  window.location.href = './login.html';
}

function saveAuthMessage(message) {
  sessionStorage.setItem('clinicAgendaAuthMessage', message);
}

function showPendingAuthMessage() {
  const message = sessionStorage.getItem('clinicAgendaAuthMessage');
  if (!message) return;

  sessionStorage.removeItem('clinicAgendaAuthMessage');
  showAlert(message, 'warning');
}

async function getUserProfile(user) {
  const snapshot = await getDoc(doc(db, 'users', user.uid));

  if (!snapshot.exists()) {
    throw new Error('No existe un perfil para el usuario autenticado.');
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

async function buildSession(user) {
  const [token, tokenResult, profile] = await Promise.all([
    user.getIdToken(),
    user.getIdTokenResult(),
    getUserProfile(user)
  ]);

  currentSession = {
    user,
    token,
    tokenResult,
    profile,
    role: profile.role,
    isActive: profile.active !== false
  };

  return currentSession;
}

function paintCurrentUser(session) {
  const userEmailElement = document.getElementById('currentUserEmail');
  if (!userEmailElement) return;

  const displayName = session.profile.fullName || session.user.email;
  userEmailElement.textContent = `${displayName} · Admin`;
}

function isValidSystemSession(session) {
  return session.isActive && session.role === SYSTEM_ROLE;
}

export function getCurrentSession() {
  return currentSession;
}

export async function getCurrentToken(forceRefresh = false) {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken(forceRefresh);
}

export function setupRegisterForm() {
  showPendingAuthMessage();

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
        label: 'Correo electronico',
        value: email,
        rules: { required: true, email: true }
      },
      {
        label: 'Contrasena',
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
        role: SYSTEM_ROLE,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: credential.user.uid
      });

      window.location.href = './dashboard.html';
    } catch (error) {
      showAlert(formatFirebaseError(error), 'danger');
    } finally {
      setButtonLoading(button, false);
    }
  });
}

export function setupLoginForm() {
  showPendingAuthMessage();

  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = document.getElementById('loginButton');
    const email = form.email.value.trim();
    const password = form.password.value;

    const errors = validateFields([
      {
        label: 'Correo electronico',
        value: email,
        rules: { required: true, email: true }
      },
      {
        label: 'Contrasena',
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
    currentSession = null;
    await signOut(auth);
    window.location.href = './login.html';
  });
}

export function requireAuth(callback = null) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      redirectToLogin();
      return;
    }

    try {
      const session = await buildSession(user);

      if (!isValidSystemSession(session)) {
        currentSession = null;
        await signOut(auth);
        saveAuthMessage('Tu usuario no esta activo o no tiene permisos de administrador.');
        redirectToLogin();
        return;
      }

      paintCurrentUser(session);

      if (typeof callback === 'function') {
        callback(session);
      }
    } catch (error) {
      console.error(error);
      currentSession = null;
      await signOut(auth);
      saveAuthMessage('No fue posible cargar tu sesion. Revisa el perfil del usuario en Firestore.');
      redirectToLogin();
    }
  });
}

export function redirectIfAuthenticated() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      const session = await buildSession(user);

      if (!isValidSystemSession(session)) {
        currentSession = null;
        await signOut(auth);
        saveAuthMessage('Tu usuario no esta activo o no tiene permisos de administrador.');
        return;
      }

      window.location.href = './dashboard.html';
    } catch (error) {
      console.error(error);
      currentSession = null;
      await signOut(auth);
      saveAuthMessage('No fue posible cargar tu sesion. Revisa el perfil del usuario en Firestore.');
    }
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
