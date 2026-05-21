/**
 * Muestra una alerta Bootstrap en el contenedor indicado.
 */
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

/**
 * Limpia el contenedor de alertas.
 */
export function clearAlert(containerId = 'alertContainer') {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

/**
 * Cambia el estado visual de un botón mientras se ejecuta una acción async.
 */
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

/**
 * Traduce errores comunes de Firebase a mensajes entendibles.
 */
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

  return messages[code] || `Ocurrió un error: ${code || 'desconocido'}`;
}

/**
 * Coloca texto en un elemento por ID.
 */
export function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

/**
 * Devuelve la fecha actual en formato YYYY-MM-DD.
 */
export function getTodayISODate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Evita inyección accidental de HTML al renderizar datos escritos por el usuario.
 */
export function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Normaliza texto para búsquedas o validaciones de duplicados.
 */
export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Formatea fechas YYYY-MM-DD a un formato legible.
 */
export function formatDate(value) {
  if (!value) return '-';

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Formatea timestamps de Firestore.
 */
export function formatTimestamp(value) {
  if (!value) return '-';

  let date = null;

  if (typeof value.toDate === 'function') {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  }

  if (!date || Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Genera una etiqueta visual para el estado activo/inactivo.
 */
export function getStatusBadge(active) {
  if (active === false) {
    return '<span class="badge text-bg-secondary">Inactivo</span>';
  }

  return '<span class="badge text-bg-success">Activo</span>';
}

/**
 * Muestra una fila de carga dentro de una tabla.
 */
export function renderTableLoading(tbody, colspan = 5) {
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="${colspan}" class="text-center py-4 text-muted">
        Cargando información...
      </td>
    </tr>
  `;
}

/**
 * Muestra una fila vacía dentro de una tabla.
 */
export function renderTableEmpty(tbody, message, colspan = 5) {
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="${colspan}" class="text-center py-4 text-muted">
        ${escapeHTML(message)}
      </td>
    </tr>
  `;
}