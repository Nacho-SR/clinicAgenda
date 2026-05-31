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

const COLLECTION_NAME = 'specialties';

let specialties = [];
let detailModal = null;

const searchInput = document.getElementById('specialtySearchInput');
const statusFilter = document.getElementById('specialtyStatusFilter');
const tableBody = document.getElementById('specialtiesTableBody');

/**
 * Inicializa eventos y carga la información.
 */
function initSpecialtiesPage() {
  detailModal = new bootstrap.Modal(document.getElementById('specialtyDetailModal'));

  showStoredAlert();

  searchInput.addEventListener('input', renderSpecialties);
  statusFilter.addEventListener('change', renderSpecialties);
  tableBody.addEventListener('click', handleTableClick);

  loadSpecialties();
}

function showStoredAlert() {
  const message = sessionStorage.getItem('clinicAgendaAlert');

  if (!message) return;

  showAlert(message, 'success');
  sessionStorage.removeItem('clinicAgendaAlert');
}

/**
 * Carga especialidades desde Firestore.
 */
async function loadSpecialties() {
  try {
    renderTableLoading(tableBody, 5);
    specialties = await getRecords(COLLECTION_NAME);
    renderSpecialties();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar las especialidades.', 'danger');
    renderTableEmpty(tableBody, 'No se pudieron cargar los registros.', 5);
  }
}

/**
 * Aplica búsqueda y filtro de estado.
 */
function getFilteredSpecialties() {
  const search = normalizeText(searchInput.value);
  const status = statusFilter.value;

  return specialties.filter((specialty) => {
    const matchesSearch =
      normalizeText(specialty.name).includes(search) ||
      normalizeText(specialty.description).includes(search);

    const matchesStatus =
      status === 'all' ||
      (status === 'active' && specialty.active !== false) ||
      (status === 'inactive' && specialty.active === false);

    return matchesSearch && matchesStatus;
  });
}

/**
 * Renderiza la tabla.
 */
function renderSpecialties() {
  const filteredSpecialties = getFilteredSpecialties();

  if (filteredSpecialties.length === 0) {
    renderTableEmpty(tableBody, 'No hay especialidades para mostrar.', 5);
    return;
  }

  tableBody.innerHTML = filteredSpecialties.map((specialty) => {
    const disabledActions = specialty.active === false;

    return `
      <tr>
        <td class="fw-semibold">${escapeHTML(specialty.name)}</td>
        <td>${escapeHTML(specialty.description || '-')}</td>
        <td>${getStatusBadge(specialty.active)}</td>
        <td>${formatTimestamp(specialty.createdAt)}</td>
        <td class="table-actions">
          <div class="btn-group btn-group-sm" role="group" aria-label="Acciones">
            <button
              type="button"
              class="btn btn-outline-primary"
              data-action="detail"
              data-id="${specialty.id}"
            >
              Ver
            </button>

            <button
              type="button"
              class="btn btn-outline-secondary"
              data-action="edit"
              data-id="${specialty.id}"
              ${disabledActions ? 'disabled' : ''}
            >
              Editar
            </button>

            <button
              type="button"
              class="btn btn-outline-danger"
              data-action="deactivate"
              data-id="${specialty.id}"
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
 * Busca una especialidad en memoria.
 */
function findSpecialtyById(id) {
  return specialties.find((specialty) => specialty.id === id);
}

/**
 * Muestra el detalle en modal.
 */
function handleDetail(id) {
  const specialty = findSpecialtyById(id);

  if (!specialty) {
    showAlert('No se encontró la especialidad seleccionada.', 'warning');
    return;
  }

  document.getElementById('detailSpecialtyName').textContent = specialty.name || '-';
  document.getElementById('detailSpecialtyDescription').textContent = specialty.description || '-';
  document.getElementById('detailSpecialtyStatus').innerHTML = getStatusBadge(specialty.active);
  document.getElementById('detailSpecialtyCreatedAt').textContent = formatTimestamp(specialty.createdAt);
  document.getElementById('detailSpecialtyUpdatedAt').textContent = formatTimestamp(specialty.updatedAt);

  detailModal.show();
}

/**
 * Carga los datos en el formulario para editar.
 */
function handleEdit(id) {
  window.location.href = `./specialties-form.html?id=${encodeURIComponent(id)}`;
}

/**
 * Desactiva una especialidad.
 */
async function handleDeactivate(id) {
  const specialty = findSpecialtyById(id);

  if (!specialty) {
    showAlert('No se encontró la especialidad seleccionada.', 'warning');
    return;
  }

  const confirmed = confirm(`¿Deseas desactivar la especialidad "${specialty.name}"?`);

  if (!confirmed) return;

  try {
    await deactivateRecord(COLLECTION_NAME, id);
    showAlert('Especialidad desactivada correctamente.', 'success');
    await loadSpecialties();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible desactivar la especialidad.', 'danger');
  }
}

requireAuth(() => {
  initSpecialtiesPage();
});