import { requireAuth } from './auth.js';

import {
  deactivateRecord,
  getRecords
} from './firestore.js';

import {
  showAlert,
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

  showStoredAlert();

  searchInput.addEventListener('input', renderPatients);
  statusFilter.addEventListener('change', renderPatients);
  genderFilter.addEventListener('change', renderPatients);
  tableBody.addEventListener('click', handleTableClick);

  loadPatients();
}

function showStoredAlert() {
  const message = sessionStorage.getItem('clinicAgendaAlert');

  if (!message) return;

  showAlert(message, 'success');
  sessionStorage.removeItem('clinicAgendaAlert');
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
  window.location.href = `./patient-form.html?id=${encodeURIComponent(id)}`;
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
 * Traduce el valor interno de género a texto legible.
 */
function getGenderLabel(gender) {
  return genderLabels[gender] || '-';
}

requireAuth(() => {
  initPatientsPage();
});