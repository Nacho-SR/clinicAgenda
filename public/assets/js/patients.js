import { requireAuth } from './auth.js';

import {
  createRecord,
  updateRecord,
  deactivateRecord,
  getRecords,
  recordExists
} from './firestore.js';

import { validateFields } from './validators.js';

import {
  showAlert,
  setButtonLoading,
  escapeHTML,
  normalizeText,
  formatDate,
  formatTimestamp,
  getStatusBadge,
  renderTableLoading,
  renderTableEmpty
} from './ui.js';

const COLLECTION_NAME = 'patients';

let patients = [];
let detailModal = null;

const form = document.getElementById('patientForm');
const formTitle = document.getElementById('patientFormTitle');
const patientIdInput = document.getElementById('patientId');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const birthDateInput = document.getElementById('birthDate');
const genderInput = document.getElementById('gender');
const addressInput = document.getElementById('address');
const saveButton = document.getElementById('savePatientButton');
const cancelEditButton = document.getElementById('cancelEditPatientButton');
const searchInput = document.getElementById('patientSearchInput');
const statusFilter = document.getElementById('patientStatusFilter');
const genderFilter = document.getElementById('patientGenderFilter');
const tableBody = document.getElementById('patientsTableBody');

/**
 * Catálogo local para mostrar el género en español.
 */
const genderLabels = {
  female: 'Femenino',
  male: 'Masculino',
  other: 'Otro',
  not_specified: 'Prefiere no decirlo'
};

/**
 * Inicializa eventos y carga pacientes.
 */
function initPatientsPage() {
  detailModal = new bootstrap.Modal(document.getElementById('patientDetailModal'));

  form.addEventListener('submit', handleSubmit);
  cancelEditButton.addEventListener('click', resetForm);
  searchInput.addEventListener('input', renderPatients);
  statusFilter.addEventListener('change', renderPatients);
  genderFilter.addEventListener('change', renderPatients);
  tableBody.addEventListener('click', handleTableClick);

  loadPatients();
}

/**
 * Carga pacientes desde Firestore.
 */
async function loadPatients() {
  try {
    renderTableLoading(tableBody, 6);
    patients = await getRecords(COLLECTION_NAME);
    renderPatients();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar los pacientes.', 'danger');
    renderTableEmpty(tableBody, 'No se pudieron cargar los registros.', 6);
  }
}

/**
 * Aplica búsqueda, filtro por estado y filtro por género.
 */
function getFilteredPatients() {
  const search = normalizeText(searchInput.value);
  const status = statusFilter.value;
  const gender = genderFilter.value;

  return patients.filter((patient) => {
    const matchesSearch =
      normalizeText(patient.fullName).includes(search) ||
      normalizeText(patient.email).includes(search) ||
      normalizeText(patient.phone).includes(search);

    const matchesStatus =
      status === 'all' ||
      (status === 'active' && patient.active !== false) ||
      (status === 'inactive' && patient.active === false);

    const matchesGender =
      gender === 'all' || patient.gender === gender;

    return matchesSearch && matchesStatus && matchesGender;
  });
}

/**
 * Renderiza pacientes en la tabla.
 */
function renderPatients() {
  const filteredPatients = getFilteredPatients();

  if (filteredPatients.length === 0) {
    renderTableEmpty(tableBody, 'No hay pacientes para mostrar.', 6);
    return;
  }

  tableBody.innerHTML = filteredPatients.map((patient) => {
    const disabledActions = patient.active === false;

    return `
      <tr>
        <td>
          <div class="fw-semibold">${escapeHTML(patient.fullName)}</div>
          <div class="small text-muted">${escapeHTML(patient.email)}</div>
        </td>

        <td>
          <div>${escapeHTML(patient.phone)}</div>
          <div class="small text-muted">${escapeHTML(patient.address || '-')}</div>
        </td>

        <td>${formatDate(patient.birthDate)}</td>
        <td>${escapeHTML(getGenderLabel(patient.gender))}</td>
        <td>${getStatusBadge(patient.active)}</td>

        <td class="table-actions">
          <div class="btn-group btn-group-sm" role="group" aria-label="Acciones">
            <button
              type="button"
              class="btn btn-outline-primary"
              data-action="detail"
              data-id="${patient.id}"
            >
              Ver
            </button>

            <button
              type="button"
              class="btn btn-outline-secondary"
              data-action="edit"
              data-id="${patient.id}"
              ${disabledActions ? 'disabled' : ''}
            >
              Editar
            </button>

            <button
              type="button"
              class="btn btn-outline-danger"
              data-action="deactivate"
              data-id="${patient.id}"
              ${disabledActions ? 'disabled' : ''}
            >
              Desactivar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Construye el objeto que se enviará a Firestore.
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
 * Crea o actualiza pacientes.
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
      showAlert('Paciente actualizado correctamente.', 'success');
    } else {
      await createRecord(COLLECTION_NAME, payload);
      showAlert('Paciente registrado correctamente.', 'success');
    }

    resetForm();
    await loadPatients();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible guardar el paciente.', 'danger');
  } finally {
    setButtonLoading(saveButton, false);
  }
}

/**
 * Controla los botones de la tabla.
 */
function handleTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === 'detail') {
    handleDetail(id);
  }

  if (action === 'edit') {
    handleEdit(id);
  }

  if (action === 'deactivate') {
    handleDeactivate(id);
  }
}

/**
 * Busca un paciente en memoria.
 */
function findPatientById(id) {
  return patients.find((patient) => patient.id === id);
}

/**
 * Muestra detalle del paciente.
 */
function handleDetail(id) {
  const patient = findPatientById(id);

  if (!patient) {
    showAlert('No se encontró el paciente seleccionado.', 'warning');
    return;
  }

  document.getElementById('detailPatientFullName').textContent = patient.fullName || '-';
  document.getElementById('detailPatientEmail').textContent = patient.email || '-';
  document.getElementById('detailPatientPhone').textContent = patient.phone || '-';
  document.getElementById('detailPatientBirthDate').textContent = formatDate(patient.birthDate);
  document.getElementById('detailPatientGender').textContent = getGenderLabel(patient.gender);
  document.getElementById('detailPatientAddress').textContent = patient.address || '-';
  document.getElementById('detailPatientStatus').innerHTML = getStatusBadge(patient.active);
  document.getElementById('detailPatientCreatedAt').textContent = formatTimestamp(patient.createdAt);
  document.getElementById('detailPatientUpdatedAt').textContent = formatTimestamp(patient.updatedAt);

  detailModal.show();
}

/**
 * Carga el paciente en el formulario para editar.
 */
function handleEdit(id) {
  const patient = findPatientById(id);

  if (!patient) {
    showAlert('No se encontró el paciente seleccionado.', 'warning');
    return;
  }

  patientIdInput.value = patient.id;
  fullNameInput.value = patient.fullName || '';
  emailInput.value = patient.email || '';
  phoneInput.value = patient.phone || '';
  birthDateInput.value = patient.birthDate || '';
  genderInput.value = patient.gender || '';
  addressInput.value = patient.address || '';

  formTitle.textContent = 'Editar paciente';
  saveButton.textContent = 'Actualizar paciente';
  cancelEditButton.classList.remove('d-none');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

/**
 * Desactiva un paciente.
 */
async function handleDeactivate(id) {
  const patient = findPatientById(id);

  if (!patient) {
    showAlert('No se encontró el paciente seleccionado.', 'warning');
    return;
  }

  const confirmed = confirm(`¿Deseas desactivar al paciente "${patient.fullName}"?`);

  if (!confirmed) return;

  try {
    await deactivateRecord(COLLECTION_NAME, id);
    showAlert('Paciente desactivado correctamente.', 'success');
    await loadPatients();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible desactivar el paciente.', 'danger');
  }
}

/**
 * Limpia el formulario y vuelve al modo creación.
 */
function resetForm() {
  form.reset();
  patientIdInput.value = '';

  formTitle.textContent = 'Nuevo paciente';
  saveButton.textContent = 'Guardar paciente';
  cancelEditButton.classList.add('d-none');
}

/**
 * Traduce el valor interno de género a texto legible.
 */
function getGenderLabel(gender) {
  return genderLabels[gender] || '-';
}

/**
 * Valida que la fecha de nacimiento no sea futura.
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
  initPatientsPage();
});