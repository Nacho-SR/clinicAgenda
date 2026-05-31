import { requireAuth } from './auth.js';

import {
  createRecord,
  updateRecord,
  getRecordById,
  recordExists
} from './firestore.js';

import { validateFields } from './validators.js';

import {
  showAlert,
  setButtonLoading,
  normalizeText
} from './ui.js';

const COLLECTION_NAME = 'specialties';

const form = document.getElementById('specialtyForm');
const pageTitle = document.getElementById('pageTitle');
const specialtyIdInput = document.getElementById('specialtyId');
const nameInput = document.getElementById('name');
const descriptionInput = document.getElementById('description');
const saveButton = document.getElementById('saveSpecialtyButton');

/**
 * Obtiene el ID de la URL.
 *
 * Si existe:
 * specialty-form.html?id=abc123
 *
 * Entonces estamos editando.
 *
 * Si no existe:
 * specialty-form.html
 *
 * Entonces estamos creando.
 */
function getSpecialtyIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/**
 * Inicializa la pantalla del formulario.
 */
async function initSpecialtyFormPage() {
  const specialtyId = getSpecialtyIdFromUrl();

  form.addEventListener('submit', handleSubmit);

  if (specialtyId) {
    await loadSpecialtyForEdit(specialtyId);
  }
}

/**
 * Carga una especialidad existente para editarla.
 */
async function loadSpecialtyForEdit(id) {
  try {
    const specialty = await getRecordById(COLLECTION_NAME, id);

    if (!specialty) {
      showAlert('No se encontró la especialidad solicitada.', 'warning');
      return;
    }

    if (specialty.active === false) {
      showAlert('No puedes editar una especialidad inactiva.', 'warning');
      saveButton.disabled = true;
      return;
    }

    pageTitle.textContent = 'Editar especialidad';
    saveButton.textContent = 'Actualizar especialidad';

    specialtyIdInput.value = specialty.id;
    nameInput.value = specialty.name || '';
    descriptionInput.value = specialty.description || '';
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar la especialidad.', 'danger');
  }
}

/**
 * Construye el objeto que se guardará en Firestore.
 */
function buildSpecialtyPayload() {
  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();

  return {
    name,
    nameNormalized: normalizeText(name),
    description
  };
}

/**
 * Crea o actualiza la especialidad.
 */
async function handleSubmit(event) {
  event.preventDefault();

  const editingId = specialtyIdInput.value || null;
  const payload = buildSpecialtyPayload();

  const errors = validateFields([
    {
      label: 'Nombre de la especialidad',
      value: payload.name,
      rules: { required: true, minLength: 3 }
    }
  ]);

  if (errors.length > 0) {
    showAlert(errors.join('<br>'), 'danger');
    return;
  }

  try {
    setButtonLoading(saveButton, true, 'Guardando...');

    const duplicated = await recordExists({
      collectionName: COLLECTION_NAME,
      fieldName: 'nameNormalized',
      value: payload.nameNormalized,
      excludeId: editingId
    });

    if (duplicated) {
      showAlert('Ya existe una especialidad activa con ese nombre.', 'warning');
      return;
    }

    if (editingId) {
      await updateRecord(COLLECTION_NAME, editingId, payload);
      sessionStorage.setItem('clinicAgendaAlert', 'Especialidad actualizada correctamente.');
    } else {
      await createRecord(COLLECTION_NAME, payload);
      sessionStorage.setItem('clinicAgendaAlert', 'Especialidad registrada correctamente.');
    }

    window.location.href = './specialties.html';
  } catch (error) {
    console.error(error);
    showAlert('No fue posible guardar la especialidad.', 'danger');
  } finally {
    setButtonLoading(saveButton, false);
  }
}

requireAuth(() => {
  initSpecialtyFormPage();
});