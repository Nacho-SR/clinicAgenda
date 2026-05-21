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
  formatTimestamp,
  getStatusBadge,
  renderTableLoading,
  renderTableEmpty
} from './ui.js';

const COLLECTION_NAME = 'specialties';

let specialties = [];
let detailModal = null;

const form = document.getElementById('specialtyForm');
const formTitle = document.getElementById('specialtyFormTitle');
const specialtyIdInput = document.getElementById('specialtyId');
const nameInput = document.getElementById('name');
const descriptionInput = document.getElementById('description');
const saveButton = document.getElementById('saveSpecialtyButton');
const cancelEditButton = document.getElementById('cancelEditSpecialtyButton');
const searchInput = document.getElementById('specialtySearchInput');
const statusFilter = document.getElementById('specialtyStatusFilter');
const tableBody = document.getElementById('specialtiesTableBody');

/**
 * Inicializa eventos y carga la información.
 */
function initSpecialtiesPage() {
  detailModal = new bootstrap.Modal(document.getElementById('specialtyDetailModal'));

  form.addEventListener('submit', handleSubmit);
  cancelEditButton.addEventListener('click', resetForm);
  searchInput.addEventListener('input', renderSpecialties);
  statusFilter.addEventListener('change', renderSpecialties);
  tableBody.addEventListener('click', handleTableClick);

  loadSpecialties();
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
 * Construye el objeto que se enviará a Firestore.
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
 * Crea o actualiza una especialidad.
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
      showAlert('Especialidad actualizada correctamente.', 'success');
    } else {
      await createRecord(COLLECTION_NAME, payload);
      showAlert('Especialidad registrada correctamente.', 'success');
    }

    resetForm();
    await loadSpecialties();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible guardar la especialidad.', 'danger');
  } finally {
    setButtonLoading(saveButton, false);
  }
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
  const specialty = findSpecialtyById(id);

  if (!specialty) {
    showAlert('No se encontró la especialidad seleccionada.', 'warning');
    return;
  }

  specialtyIdInput.value = specialty.id;
  nameInput.value = specialty.name || '';
  descriptionInput.value = specialty.description || '';

  formTitle.textContent = 'Editar especialidad';
  saveButton.textContent = 'Actualizar especialidad';
  cancelEditButton.classList.remove('d-none');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
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

/**
 * Limpia el formulario y vuelve al modo creación.
 */
function resetForm() {
  form.reset();
  specialtyIdInput.value = '';

  formTitle.textContent = 'Nueva especialidad';
  saveButton.textContent = 'Guardar especialidad';
  cancelEditButton.classList.add('d-none');
}

requireAuth(() => {
  initSpecialtiesPage();
});