export function showAlert(message, type = 'success', containerId = 'alertContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;
}

export function clearAlert(containerId = 'alertContainer') {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

export function setButtonLoading(button, isLoading, loadingText = 'Procesando...') {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
    return;
  }

  button.disabled = false;
  button.textContent = button.dataset.originalText || 'Guardar';
}

export function formatFirebaseError(error) {
  const code = error?.code || '';

  const messages = {
    'auth/email-already-in-use': 'El correo ya está registrado.',
    'auth/invalid-email': 'El correo no tiene un formato válido.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'La contraseña es incorrecta.',
    'auth/user-not-found': 'No existe una cuenta con este correo.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/missing-password': 'La contraseña es obligatoria.',
    'auth/operation-not-allowed': 'El proveedor Email/Password no está activado en Firebase Authentication.',
    'auth/api-key-not-valid': 'La API Key de Firebase no es válida. Revisa firebase-config.js.',
    'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisa tu conexión o configuración.',
    'auth/too-many-requests': 'Firebase bloqueó temporalmente los intentos por demasiadas solicitudes. Intenta más tarde.',
    'permission-denied': 'No tienes permisos para realizar esta acción.'
  };

  return messages[code] || 'Ocurrió un error. Inténtalo nuevamente.';
}

export function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

export function getTodayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
