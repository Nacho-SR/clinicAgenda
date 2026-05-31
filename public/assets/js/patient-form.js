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

const COLLECTION_NAME = 'patients';

const form = document.getElementById('patientForm');
const pageTitle = document.getElementById('pageTitle');
const patientIdInput = document.getElementById('patientId');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const birthDateInput = document.getElementById('birthDate');
const genderInput = document.getElementById('gender');
const addressInput = document.getElementById('address');
const saveButton = document.getElementById('savePatientButton');

/**
 * Obtiene el ID del paciente desde la URL.
 *
 * Alta:
 * patient-form.html
 *
 * Edición:
 * patient-form.html?id=ID_DEL_PACIENTE
 */
function getPatientIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/**
 * Inicializa la pantalla del formulario.
 */
async function initPatientFormPage() {
  const patientId = getPatientIdFromUrl();

  form.addEventListener('submit', handleSubmit);

  if (patientId) {
    await loadPatientForEdit(patientId);
  }
}

/**
 * Carga un paciente existente para edición.
 */
async function loadPatientForEdit(id) {
  try {
    const patient = await getRecordById(COLLECTION_NAME, id);

    if (!patient) {
      showAlert('No se encontró el paciente solicitado.', 'warning');
      saveButton.disabled = true;
      return;
    }

    if (patient.active === false) {
      showAlert('No puedes editar un paciente inactivo.', 'warning');
      saveButton.disabled = true;
      return;
    }

    pageTitle.textContent = 'Editar paciente';
    saveButton.textContent = 'Actualizar paciente';

    patientIdInput.value = patient.id;
    fullNameInput.value = patient.fullName || '';
    emailInput.value = patient.email || '';
    phoneInput.value = patient.phone || '';
    birthDateInput.value = patient.birthDate || '';
    genderInput.value = patient.gender || '';
    addressInput.value = patient.address || '';
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar el paciente.', 'danger');
  }
}

/**
 * Construye el objeto que se guardará en Firestore.
 */
function buildPatientPayload() {
  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const phone = phoneInput.value.trim();
  const birthDate = birthDateInput.value;
  const gender = genderInput.value;
  const address = addressInput.value.trim();

  return {
    fullName,
    fullNameNormalized: normalizeText(fullName),
    email,
    emailNormalized: normalizeText(email),
    phone,
    birthDate,
    gender,
    address
  };
}

/**
 * Crea o actualiza el paciente.
 */
async function handleSubmit(event) {
  event.preventDefault();

  const editingId = patientIdInput.value || null;
  const payload = buildPatientPayload();

  const errors = validateFields([
    {
      label: 'Nombre completo',
      value: payload.fullName,
      rules: { required: true, minLength: 3 }
    },
    {
      label: 'Correo electrónico',
      value: payload.email,
      rules: { required: true, email: true }
    },
    {
      label: 'Teléfono',
      value: payload.phone,
      rules: { required: true, minLength: 10 }
    },
    {
      label: 'Fecha de nacimiento',
      value: payload.birthDate,
      rules: { required: true, date: true }
    },
    {
      label: 'Género',
      value: payload.gender,
      rules: { required: true }
    },
    {
      label: 'Dirección',
      value: payload.address,
      rules: { required: true, minLength: 5 }
    }
  ]);

  if (errors.length > 0) {
    showAlert(errors.join('<br>'), 'danger');
    return;
  }

  if (isFutureDate(payload.birthDate)) {
    showAlert('La fecha de nacimiento no puede ser futura.', 'danger');
    return;
  }

  try {
    setButtonLoading(saveButton, true, 'Guardando...');

    const duplicatedEmail = await recordExists({
      collectionName: COLLECTION_NAME,
      fieldName: 'emailNormalized',
      value: payload.emailNormalized,
      excludeId: editingId
    });

    if (duplicatedEmail) {
      showAlert('Ya existe un paciente activo con ese correo electrónico.', 'warning');
      return;
    }

    if (editingId) {
      await updateRecord(COLLECTION_NAME, editingId, payload);
      sessionStorage.setItem('clinicAgendaAlert', 'Paciente actualizado correctamente.');
    } else {
      await createRecord(COLLECTION_NAME, payload);
      sessionStorage.setItem('clinicAgendaAlert', 'Paciente registrado correctamente.');
    }

    window.location.href = './patients.html';
  } catch (error) {
    console.error(error);
    showAlert('No fue posible guardar el paciente.', 'danger');
  } finally {
    setButtonLoading(saveButton, false);
  }
}

/**
 * Evita registrar fechas de nacimiento futuras.
 */
function isFutureDate(value) {
  if (!value) return false;

  const selectedDate = new Date(`${value}T00:00:00`);
  const today = new Date();

  selectedDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return selectedDate > today;
}

requireAuth(() => {
  initPatientFormPage();
});