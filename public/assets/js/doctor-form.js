import { requireAuth } from './auth.js';

import {
  createRecord,
  updateRecord,
  getRecordById,
  getRecords,
  recordExists
} from './firestore.js';

import { validateFields } from './validators.js';

import {
  showAlert,
  setButtonLoading,
  normalizeText,
  escapeHTML
} from './ui.js';

const COLLECTION_NAME = 'doctors';

let specialties = [];
let activeSpecialties = [];

const form = document.getElementById('doctorForm');
const pageTitle = document.getElementById('pageTitle');
const doctorIdInput = document.getElementById('doctorId');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const specialtyIdInput = document.getElementById('specialtyId');
const professionalLicenseInput = document.getElementById('professionalLicense');
const saveButton = document.getElementById('saveDoctorButton');

/**
 * Obtiene el ID del médico desde la URL.
 *
 * Alta:
 * doctor-form.html
 *
 * Edición:
 * doctor-form.html?id=ID_DEL_MEDICO
 */
function getDoctorIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/**
 * Inicializa el formulario.
 */
async function initDoctorFormPage() {
  form.addEventListener('submit', handleSubmit);

  await loadSpecialties();

  const doctorId = getDoctorIdFromUrl();

  if (doctorId) {
    await loadDoctorForEdit(doctorId);
  }
}

/**
 * Carga especialidades para llenar el select.
 */
async function loadSpecialties() {
  try {
    specialties = await getRecords('specialties');
    activeSpecialties = specialties.filter((specialty) => specialty.active !== false);

    renderSpecialtyOptions();

    if (activeSpecialties.length === 0) {
      showAlert('No hay especialidades activas. Registra una especialidad antes de crear médicos.', 'warning');
      saveButton.disabled = true;
    }
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar las especialidades.', 'danger');
    saveButton.disabled = true;
  }
}

/**
 * Llena el select con especialidades activas.
 */
function renderSpecialtyOptions(selectedSpecialtyId = '') {
  if (activeSpecialties.length === 0) {
    specialtyIdInput.innerHTML = '<option value="">No hay especialidades activas</option>';
    specialtyIdInput.disabled = true;
    return;
  }

  specialtyIdInput.disabled = false;

  const options = activeSpecialties.map((specialty) => {
    const selected = specialty.id === selectedSpecialtyId ? 'selected' : '';

    return `
      <option value="${specialty.id}" ${selected}>
        ${escapeHTML(specialty.name)}
      </option>
    `;
  }).join('');

  specialtyIdInput.innerHTML = `
    <option value="">Selecciona una especialidad</option>
    ${options}
  `;
}

/**
 * Carga un médico existente para edición.
 */
async function loadDoctorForEdit(id) {
  try {
    const doctor = await getRecordById(COLLECTION_NAME, id);

    if (!doctor) {
      showAlert('No se encontró el médico solicitado.', 'warning');
      saveButton.disabled = true;
      return;
    }

    if (doctor.active === false) {
      showAlert('No puedes editar un médico inactivo.', 'warning');
      saveButton.disabled = true;
      return;
    }

    pageTitle.textContent = 'Editar médico';
    saveButton.textContent = 'Actualizar médico';

    doctorIdInput.value = doctor.id;
    fullNameInput.value = doctor.fullName || '';
    emailInput.value = doctor.email || '';
    phoneInput.value = doctor.phone || '';
    professionalLicenseInput.value = doctor.professionalLicense || '';

    if (isActiveSpecialty(doctor.specialtyId)) {
      renderSpecialtyOptions(doctor.specialtyId);
    } else {
      renderSpecialtyOptions();
      showAlert(
        'La especialidad actual de este médico está inactiva. Selecciona una especialidad activa para poder actualizarlo.',
        'warning'
      );
    }
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar el médico.', 'danger');
  }
}

/**
 * Construye el objeto que se guardará en Firestore.
 */
function buildDoctorPayload() {
  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const phone = phoneInput.value.trim();
  const specialtyId = specialtyIdInput.value;
  const professionalLicense = professionalLicenseInput.value.trim();

  return {
    fullName,
    fullNameNormalized: normalizeText(fullName),
    email,
    emailNormalized: normalizeText(email),
    phone,
    specialtyId,
    professionalLicense,
    professionalLicenseNormalized: normalizeText(professionalLicense)
  };
}

/**
 * Crea o actualiza el médico.
 */
async function handleSubmit(event) {
  event.preventDefault();

  const editingId = doctorIdInput.value || null;
  const payload = buildDoctorPayload();

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
      label: 'Especialidad',
      value: payload.specialtyId,
      rules: { required: true }
    },
    {
      label: 'Cédula profesional',
      value: payload.professionalLicense,
      rules: { required: true, minLength: 5 }
    }
  ]);

  if (errors.length > 0) {
    showAlert(errors.join('<br>'), 'danger');
    return;
  }

  if (!isActiveSpecialty(payload.specialtyId)) {
    showAlert('La especialidad seleccionada no existe o está inactiva.', 'danger');
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
      showAlert('Ya existe un médico activo con ese correo electrónico.', 'warning');
      return;
    }

    const duplicatedLicense = await recordExists({
      collectionName: COLLECTION_NAME,
      fieldName: 'professionalLicenseNormalized',
      value: payload.professionalLicenseNormalized,
      excludeId: editingId
    });

    if (duplicatedLicense) {
      showAlert('Ya existe un médico activo con esa cédula profesional.', 'warning');
      return;
    }

    if (editingId) {
      await updateRecord(COLLECTION_NAME, editingId, payload);
      sessionStorage.setItem('clinicAgendaAlert', 'Médico actualizado correctamente.');
    } else {
      await createRecord(COLLECTION_NAME, payload);
      sessionStorage.setItem('clinicAgendaAlert', 'Médico registrado correctamente.');
    }

    window.location.href = './doctors.html';
  } catch (error) {
    console.error(error);
    showAlert('No fue posible guardar el médico.', 'danger');
  } finally {
    setButtonLoading(saveButton, false);
  }
}

/**
 * Verifica si la especialidad existe y está activa.
 */
function isActiveSpecialty(specialtyId) {
  return activeSpecialties.some((specialty) => specialty.id === specialtyId);
}

requireAuth(() => {
  initDoctorFormPage();
});