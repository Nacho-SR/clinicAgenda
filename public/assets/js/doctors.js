import { requireAuth } from './auth.js';

import {
  deactivateRecord,
  getRecords
} from './firestore.js';

import {
  showAlert,
  escapeHTML,
  normalizeText,
  formatTimestamp,
  getStatusBadge,
  renderTableLoading,
  renderTableEmpty
} from './ui.js';

const COLLECTION_NAME = 'doctors';

let doctors = [];
let specialties = [];
let activeSpecialties = [];
let detailModal = null;

const searchInput = document.getElementById('doctorSearchInput');
const statusFilter = document.getElementById('doctorStatusFilter');
const specialtyFilter = document.getElementById('doctorSpecialtyFilter');
const tableBody = document.getElementById('doctorsTableBody');

/**
 * Inicializa el módulo de médicos.
 *
 * Aquí se conectan los eventos del formulario, buscador, filtros
 * y botones de la tabla.
 */
function initDoctorsPage() {
  detailModal = new bootstrap.Modal(document.getElementById('doctorDetailModal'));

  showStoredAlert();

  searchInput.addEventListener('input', renderDoctors);
  statusFilter.addEventListener('change', renderDoctors);
  specialtyFilter.addEventListener('change', renderDoctors);
  tableBody.addEventListener('click', handleTableClick);

  loadInitialData();
}

function showStoredAlert() {
  const message = sessionStorage.getItem('clinicAgendaAlert');

  if (!message) return;

  showAlert(message, 'success');
  sessionStorage.removeItem('clinicAgendaAlert');
}

/**
 * Carga médicos y especialidades desde Firestore.
 *
 * Las especialidades son necesarias porque cada médico debe estar relacionado
 * con una especialidad mediante specialtyId.
 */
async function loadInitialData() {
  try {
    renderTableLoading(tableBody, 6);

    const [doctorsResult, specialtiesResult] = await Promise.all([
      getRecords(COLLECTION_NAME),
      getRecords('specialties')
    ]);

    doctors = doctorsResult;
    specialties = specialtiesResult;

    renderDoctorFilterOptions();
    renderDoctors();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar el módulo de médicos.', 'danger');
    renderTableEmpty(tableBody, 'No se pudieron cargar los registros.', 6);
  }
}

  specialtyIdInput.disabled = false;
  saveButton.disabled = false;

  const options = activeSpecialties.map((specialty) => {
    return `
      <option value="${specialty.id}">
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
 * Llena el filtro de especialidad.
 *
 * Aquí usamos todas las especialidades, incluso inactivas, para que sea posible
 * filtrar médicos antiguos asociados a especialidades que después se desactivaron.
 */
function renderSpecialtyFilterOptions() {
  if (specialties.length === 0) {
    specialtyFilter.innerHTML = '<option value="all">Todas las especialidades</option>';
    return;
  }

  const options = specialties.map((specialty) => {
    const inactiveLabel = specialty.active === false ? ' (inactiva)' : '';

    return `
      <option value="${specialty.id}">
        ${escapeHTML(specialty.name)}${inactiveLabel}
      </option>
    `;
  }).join('');

  specialtyFilter.innerHTML = `
    <option value="all">Todas las especialidades</option>
    ${options}
  `;
}

/**
 * Aplica búsqueda, filtro por estado y filtro por especialidad.
 */
function getFilteredDoctors() {
  const search = normalizeText(searchInput.value);
  const status = statusFilter.value;
  const specialtyId = specialtyFilter.value;

  return doctors.filter((doctor) => {
    const specialtyName = getSpecialtyName(doctor.specialtyId);

    const matchesSearch =
      normalizeText(doctor.fullName).includes(search) ||
      normalizeText(doctor.email).includes(search) ||
      normalizeText(doctor.phone).includes(search) ||
      normalizeText(doctor.professionalLicense).includes(search) ||
      normalizeText(specialtyName).includes(search);

    const matchesStatus =
      status === 'all' ||
      (status === 'active' && doctor.active !== false) ||
      (status === 'inactive' && doctor.active === false);

    const matchesSpecialty =
      specialtyId === 'all' || doctor.specialtyId === specialtyId;

    return matchesSearch && matchesStatus && matchesSpecialty;
  });
}

/**
 * Renderiza los médicos dentro de la tabla.
 */
function renderDoctors() {
  const filteredDoctors = getFilteredDoctors();

  if (filteredDoctors.length === 0) {
    renderTableEmpty(tableBody, 'No hay médicos para mostrar.', 6);
    return;
  }

  tableBody.innerHTML = filteredDoctors.map((doctor) => {
    const disabledActions = doctor.active === false;

    return `
      <tr>
        <td>
          <div class="fw-semibold">${escapeHTML(doctor.fullName)}</div>
          <div class="small text-muted">${escapeHTML(doctor.email)}</div>
        </td>

        <td>
          <div>${escapeHTML(doctor.phone)}</div>
        </td>

        <td>${escapeHTML(getSpecialtyName(doctor.specialtyId))}</td>

        <td>${escapeHTML(doctor.professionalLicense)}</td>

        <td>${getStatusBadge(doctor.active)}</td>

        <td class="table-actions">
          <div class="btn-group btn-group-sm" role="group" aria-label="Acciones">
            <button
              type="button"
              class="btn btn-outline-primary"
              data-action="detail"
              data-id="${doctor.id}"
            >
              Ver
            </button>

            <button
              type="button"
              class="btn btn-outline-secondary"
              data-action="edit"
              data-id="${doctor.id}"
              ${disabledActions ? 'disabled' : ''}
            >
              Editar
            </button>

            <button
              type="button"
              class="btn btn-outline-danger"
              data-action="deactivate"
              data-id="${doctor.id}"
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
 * Controla los botones de la tabla mediante delegación de eventos.
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
 * Busca un médico en el arreglo local.
 */
function findDoctorById(id) {
  return doctors.find((doctor) => doctor.id === id);
}

/**
 * Muestra el detalle del médico en modal.
 */
function handleDetail(id) {
  const doctor = findDoctorById(id);

  if (!doctor) {
    showAlert('No se encontró el médico seleccionado.', 'warning');
    return;
  }

  document.getElementById('detailDoctorFullName').textContent = doctor.fullName || '-';
  document.getElementById('detailDoctorEmail').textContent = doctor.email || '-';
  document.getElementById('detailDoctorPhone').textContent = doctor.phone || '-';
  document.getElementById('detailDoctorSpecialty').textContent = getSpecialtyName(doctor.specialtyId);
  document.getElementById('detailDoctorProfessionalLicense').textContent = doctor.professionalLicense || '-';
  document.getElementById('detailDoctorStatus').innerHTML = getStatusBadge(doctor.active);
  document.getElementById('detailDoctorCreatedAt').textContent = formatTimestamp(doctor.createdAt);
  document.getElementById('detailDoctorUpdatedAt').textContent = formatTimestamp(doctor.updatedAt);

  detailModal.show();
}

/**
 * Carga datos del médico en el formulario para editar.
 */
function handleEdit(id) {
  window.location.href = `./doctor-form.html?id=${encodeURIComponent(id)}`;
}

/**
 * Desactiva un médico.
 *
 * No borra físicamente el documento, solo actualiza active a false.
 */
async function handleDeactivate(id) {
  const doctor = findDoctorById(id);

  if (!doctor) {
    showAlert('No se encontró el médico seleccionado.', 'warning');
    return;
  }

  const confirmed = confirm(`¿Deseas desactivar al médico "${doctor.fullName}"?`);

  if (!confirmed) return;

  try {
    await deactivateRecord(COLLECTION_NAME, id);
    showAlert('Médico desactivado correctamente.', 'success');
    await loadInitialData();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible desactivar el médico.', 'danger');
  }
}

/**
 * Obtiene el nombre de una especialidad por ID.
 */
function getSpecialtyName(specialtyId) {
  const specialty = specialties.find((item) => item.id === specialtyId);

  if (!specialty) {
    return 'Especialidad no encontrada';
  }

  if (specialty.active === false) {
    return `${specialty.name} (inactiva)`;
  }

  return specialty.name;
}

requireAuth(() => {
  initDoctorsPage();
});