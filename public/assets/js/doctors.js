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

const COLLECTION_NAME = 'doctors';

let doctors = [];
let specialties = [];
let activeSpecialties = [];
let detailModal = null;

const form = document.getElementById('doctorForm');
const formTitle = document.getElementById('doctorFormTitle');
const doctorIdInput = document.getElementById('doctorId');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const specialtyIdInput = document.getElementById('specialtyId');
const professionalLicenseInput = document.getElementById('professionalLicense');
const saveButton = document.getElementById('saveDoctorButton');
const cancelEditButton = document.getElementById('cancelEditDoctorButton');
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

  form.addEventListener('submit', handleSubmit);
  cancelEditButton.addEventListener('click', resetForm);
  searchInput.addEventListener('input', renderDoctors);
  statusFilter.addEventListener('change', renderDoctors);
  specialtyFilter.addEventListener('change', renderDoctors);
  tableBody.addEventListener('click', handleTableClick);

  loadInitialData();
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
    activeSpecialties = specialties.filter((specialty) => specialty.active !== false);

    renderSpecialtyOptions();
    renderDoctors();

    if (activeSpecialties.length === 0) {
      showAlert(
        'No hay especialidades activas. Registra al menos una especialidad antes de crear médicos.',
        'warning'
      );
    }
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar el módulo de médicos.', 'danger');
    renderTableEmpty(tableBody, 'No se pudieron cargar los registros.', 6);
  }
}

/**
 * Llena el select del formulario y el filtro de especialidad.
 */
function renderSpecialtyOptions() {
  renderSpecialtyFormOptions();
  renderSpecialtyFilterOptions();
}

/**
 * Llena el select del formulario con especialidades activas.
 */
function renderSpecialtyFormOptions() {
  if (activeSpecialties.length === 0) {
    specialtyIdInput.innerHTML = '<option value="">No hay especialidades activas</option>';
    specialtyIdInput.disabled = true;
    saveButton.disabled = true;
    return;
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
 * Crea o actualiza médicos.
 *
 * Antes de guardar valida:
 * - Campos obligatorios.
 * - Correo válido.
 * - Teléfono mínimo.
 * - Especialidad seleccionada.
 * - Cédula mínima.
 * - Correo duplicado.
 * - Cédula duplicada.
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
      showAlert('Médico actualizado correctamente.', 'success');
    } else {
      await createRecord(COLLECTION_NAME, payload);
      showAlert('Médico registrado correctamente.', 'success');
    }

    resetForm();
    await loadInitialData();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible guardar el médico.', 'danger');
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
  const doctor = findDoctorById(id);

  if (!doctor) {
    showAlert('No se encontró el médico seleccionado.', 'warning');
    return;
  }

  if (!isActiveSpecialty(doctor.specialtyId)) {
    showAlert(
      'Este médico tiene una especialidad inactiva. Para editarlo, primero selecciona una especialidad activa.',
      'warning'
    );
  }

  doctorIdInput.value = doctor.id;
  fullNameInput.value = doctor.fullName || '';
  emailInput.value = doctor.email || '';
  phoneInput.value = doctor.phone || '';
  specialtyIdInput.value = isActiveSpecialty(doctor.specialtyId) ? doctor.specialtyId : '';
  professionalLicenseInput.value = doctor.professionalLicense || '';

  formTitle.textContent = 'Editar médico';
  saveButton.textContent = 'Actualizar médico';
  cancelEditButton.classList.remove('d-none');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
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
 * Limpia el formulario y vuelve al modo creación.
 */
function resetForm() {
  form.reset();
  doctorIdInput.value = '';

  formTitle.textContent = 'Nuevo médico';
  saveButton.textContent = 'Guardar médico';
  cancelEditButton.classList.add('d-none');

  renderSpecialtyFormOptions();
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

/**
 * Verifica si una especialidad existe y está activa.
 */
function isActiveSpecialty(specialtyId) {
  return activeSpecialties.some((specialty) => specialty.id === specialtyId);
}

requireAuth(() => {
  initDoctorsPage();
});