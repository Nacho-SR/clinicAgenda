import { requireAuth } from './auth.js';

import {
  updateRecord,
  deactivateRecord,
  getRecords
} from './firestore.js';

import {
  showAlert,
  escapeHTML,
  normalizeText,
  formatDate,
  formatTimestamp,
  getTodayISODate,
  renderTableLoading,
  renderTableEmpty
} from './ui.js';

const COLLECTION_NAME = 'appointments';

let appointments = [];
let patients = [];
let doctors = [];
let specialties = [];

let activePatients = [];
let activeDoctors = [];
let activeSpecialties = [];

let detailModal = null;

const searchInput = document.getElementById('appointmentSearchInput');
const dateFilter = document.getElementById('appointmentDateFilter');
const doctorFilter = document.getElementById('appointmentDoctorFilter');
const statusFilter = document.getElementById('appointmentStatusFilter');
const todayFilterButton = document.getElementById('todayFilterButton');
const clearFiltersButton = document.getElementById('clearFiltersButton');
const tableBody = document.getElementById('appointmentsTableBody');

/**
 * Etiquetas para mostrar estados en español.
 */
const appointmentStatusLabels = {
  scheduled: 'Programada',
  completed: 'Finalizada',
  cancelled: 'Cancelada',
  no_show: 'No asistió'
};

/**
 * Inicializa eventos y carga datos.
 */
function initAppointmentsPage() {
  detailModal = new bootstrap.Modal(document.getElementById('appointmentDetailModal'));

  showStoredAlert();

  searchInput.addEventListener('input', renderAppointments);
  dateFilter.addEventListener('change', renderAppointments);
  doctorFilter.addEventListener('change', renderAppointments);
  statusFilter.addEventListener('change', renderAppointments);

  todayFilterButton.addEventListener('click', () => {
    dateFilter.value = getTodayISODate();
    renderAppointments();
  });

  clearFiltersButton.addEventListener('click', () => {
    searchInput.value = '';
    dateFilter.value = '';
    doctorFilter.value = 'all';
    statusFilter.value = 'allActive';
    renderAppointments();
  });

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
 * Carga citas, pacientes, médicos y especialidades.
 *
 * Esta función es clave porque las citas dependen de las otras colecciones.
 */
async function loadInitialData() {
  try {
    renderTableLoading(tableBody, 6);

    const [
      appointmentsResult,
      patientsResult,
      doctorsResult,
      specialtiesResult
    ] = await Promise.all([
      getRecords(COLLECTION_NAME),
      getRecords('patients'),
      getRecords('doctors'),
      getRecords('specialties')
    ]);

    appointments = sortAppointments(appointmentsResult);
    patients = patientsResult;
    doctors = doctorsResult;
    specialties = specialtiesResult;

    renderFilterOptions();
    renderAppointments();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar el módulo de citas.', 'danger');
    renderTableEmpty(tableBody, 'No se pudieron cargar los registros.', 6);
  }
}

/**
 * Llena filtros de la tabla.
 */
function renderFilterOptions() {
  renderDoctorFilterOptions();
}

/**
 * Llena el filtro de médicos.
 *
 * Aquí usamos todos los médicos, incluso inactivos, para consultar citas antiguas.
 */
function renderDoctorFilterOptions() {
  if (doctors.length === 0) {
    doctorFilter.innerHTML = '<option value="all">Todos los médicos</option>';
    return;
  }

  const options = doctors.map((doctor) => {
    const inactiveLabel = doctor.active === false ? ' (inactivo)' : '';

    return `
      <option value="${doctor.id}">
        ${escapeHTML(doctor.fullName)}${inactiveLabel}
      </option>
    `;
  }).join('');

  doctorFilter.innerHTML = `
    <option value="all">Todos los médicos</option>
    ${options}
  `;
}

/**
 * Aplica búsqueda, fecha, médico y estado.
 */
function getFilteredAppointments() {
  const search = normalizeText(searchInput.value);
  const selectedDate = dateFilter.value;
  const selectedDoctor = doctorFilter.value;
  const selectedStatus = statusFilter.value;

  return appointments.filter((appointment) => {
    const patientName = getPatientName(appointment.patientId);
    const doctorName = getDoctorName(appointment.doctorId);
    const specialtyName = getSpecialtyName(appointment.specialtyId);

    const matchesSearch =
      normalizeText(patientName).includes(search) ||
      normalizeText(doctorName).includes(search) ||
      normalizeText(specialtyName).includes(search) ||
      normalizeText(appointment.reason).includes(search);

    const matchesDate =
      !selectedDate || appointment.appointmentDate === selectedDate;

    const matchesDoctor =
      selectedDoctor === 'all' || appointment.doctorId === selectedDoctor;

    let matchesStatus = true;

    if (selectedStatus === 'allActive') {
      matchesStatus = appointment.active !== false;
    } else if (selectedStatus === 'inactive') {
      matchesStatus = appointment.active === false;
    } else if (selectedStatus === 'all') {
      matchesStatus = true;
    } else {
      matchesStatus =
        appointment.active !== false &&
        appointment.status === selectedStatus;
    }

    return matchesSearch && matchesDate && matchesDoctor && matchesStatus;
  });
}

/**
 * Renderiza las citas en tabla.
 */
function renderAppointments() {
  const filteredAppointments = getFilteredAppointments();

  if (filteredAppointments.length === 0) {
    renderTableEmpty(tableBody, 'No hay citas para mostrar.', 6);
    return;
  }

  tableBody.innerHTML = filteredAppointments.map((appointment) => {
    const isScheduled = appointment.status === 'scheduled';
    const isActive = appointment.active !== false;

    const disableScheduledActions = !isScheduled || !isActive;
    const disableAllActions = !isActive;

    return `
      <tr>
        <td>
          <div class="fw-semibold">${formatDate(appointment.appointmentDate)}</div>
          <div class="small text-muted">${escapeHTML(appointment.appointmentTime || '-')}</div>
        </td>

        <td>${escapeHTML(getPatientName(appointment.patientId))}</td>

        <td>${escapeHTML(getDoctorName(appointment.doctorId))}</td>

        <td>${escapeHTML(getSpecialtyName(appointment.specialtyId))}</td>

        <td>${getAppointmentStatusBadge(appointment.status, appointment.active)}</td>

        <td class="table-actions">
          <div class="btn-group btn-group-sm" role="group" aria-label="Acciones">
            <button
              type="button"
              class="btn btn-outline-primary"
              data-action="detail"
              data-id="${appointment.id}"
            >
              Ver
            </button>

            <button
              type="button"
              class="btn btn-outline-secondary"
              data-action="edit"
              data-id="${appointment.id}"
              ${disableScheduledActions ? 'disabled' : ''}
            >
              Editar
            </button>

            <button
              type="button"
              class="btn btn-outline-success"
              data-action="complete"
              data-id="${appointment.id}"
              ${disableScheduledActions ? 'disabled' : ''}
            >
              Finalizar
            </button>

            <button
              type="button"
              class="btn btn-outline-warning"
              data-action="no_show"
              data-id="${appointment.id}"
              ${disableScheduledActions ? 'disabled' : ''}
            >
              No asistió
            </button>

            <button
              type="button"
              class="btn btn-outline-danger"
              data-action="cancel"
              data-id="${appointment.id}"
              ${disableScheduledActions ? 'disabled' : ''}
            >
              Cancelar
            </button>

            <button
              type="button"
              class="btn btn-outline-dark"
              data-action="deactivate"
              data-id="${appointment.id}"
              ${disableAllActions ? 'disabled' : ''}
            >
              Ocultar
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

  if (action === 'complete') {
    handleComplete(id);
  }

  if (action === 'cancel') {
    handleCancel(id);
  }

  if (action === 'no_show') {
    handleNoShow(id);
  }

  if (action === 'deactivate') {
    handleDeactivate(id);
  }
}

/**
 * Muestra detalle de una cita.
 */
function handleDetail(id) {
  const appointment = findAppointmentById(id);

  if (!appointment) {
    showAlert('No se encontró la cita seleccionada.', 'warning');
    return;
  }

  document.getElementById('detailAppointmentPatient').textContent = getPatientName(appointment.patientId);
  document.getElementById('detailAppointmentDoctor').textContent = getDoctorName(appointment.doctorId);
  document.getElementById('detailAppointmentSpecialty').textContent = getSpecialtyName(appointment.specialtyId);
  document.getElementById('detailAppointmentDate').textContent = formatDate(appointment.appointmentDate);
  document.getElementById('detailAppointmentTime').textContent = appointment.appointmentTime || '-';
  document.getElementById('detailAppointmentReason').textContent = appointment.reason || '-';
  document.getElementById('detailAppointmentStatus').innerHTML = getAppointmentStatusBadge(appointment.status, appointment.active);
  document.getElementById('detailAppointmentCreatedAt').textContent = formatTimestamp(appointment.createdAt);
  document.getElementById('detailAppointmentUpdatedAt').textContent = formatTimestamp(appointment.updatedAt);

  detailModal.show();
}

/**
 * Carga una cita en el formulario para editar.
 *
 * Solo permitimos editar citas programadas y activas.
 */
function handleEdit(id) {
  const appointment = findAppointmentById(id);

  if (!appointment) {
    showAlert('No se encontró la cita seleccionada.', 'warning');
    return;
  }

  if (appointment.active === false) {
    showAlert('No puedes editar una cita desactivada.', 'warning');
    return;
  }

  if (appointment.status !== 'scheduled') {
    showAlert('Solo puedes editar citas programadas.', 'warning');
    return;
  }

  window.location.href = `./appointment-form.html?id=${encodeURIComponent(id)}`;
}

/**
 * Cambia una cita a estado finalizada.
 */
async function handleComplete(id) {
  const appointment = findAppointmentById(id);

  if (!canChangeScheduledAppointment(appointment)) return;

  const confirmed = confirm('¿Deseas finalizar esta cita?');

  if (!confirmed) return;

  try {
    await updateRecord(COLLECTION_NAME, id, {
      status: 'completed'
    });

    showAlert('Cita finalizada correctamente.', 'success');
    await loadInitialData();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible finalizar la cita.', 'danger');
  }
}

/**
 * Cambia una cita a estado cancelada.
 */
async function handleCancel(id) {
  const appointment = findAppointmentById(id);

  if (!canChangeScheduledAppointment(appointment)) return;

  const confirmed = confirm('¿Deseas cancelar esta cita?');

  if (!confirmed) return;

  try {
    await updateRecord(COLLECTION_NAME, id, {
      status: 'cancelled'
    });

    showAlert('Cita cancelada correctamente.', 'success');
    await loadInitialData();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cancelar la cita.', 'danger');
  }
}

/**
 * Cambia una cita a estado no_show.
 */
async function handleNoShow(id) {
  const appointment = findAppointmentById(id);

  if (!canChangeScheduledAppointment(appointment)) return;

  const confirmed = confirm('¿Deseas marcar esta cita como "No asistió"?');

  if (!confirmed) return;

  try {
    await updateRecord(COLLECTION_NAME, id, {
      status: 'no_show'
    });

    showAlert('Cita marcada como no asistió.', 'success');
    await loadInitialData();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible actualizar la cita.', 'danger');
  }
}

/**
 * Desactiva una cita.
 *
 * Esto no equivale a cancelar médicamente la cita.
 * Solo oculta/desactiva el registro mediante active: false.
 */
async function handleDeactivate(id) {
  const appointment = findAppointmentById(id);

  if (!appointment) {
    showAlert('No se encontró la cita seleccionada.', 'warning');
    return;
  }

  const confirmed = confirm('¿Deseas ocultar/desactivar este registro de cita?');

  if (!confirmed) return;

  try {
    await deactivateRecord(COLLECTION_NAME, id);
    showAlert('Cita desactivada correctamente.', 'success');
    await loadInitialData();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible desactivar la cita.', 'danger');
  }
}

/**
 * Valida si una cita puede cambiar de estado.
 */
function canChangeScheduledAppointment(appointment) {
  if (!appointment) {
    showAlert('No se encontró la cita seleccionada.', 'warning');
    return false;
  }

  if (appointment.active === false) {
    showAlert('No puedes modificar una cita desactivada.', 'warning');
    return false;
  }

  if (appointment.status !== 'scheduled') {
    showAlert('Solo puedes cambiar el estado de citas programadas.', 'warning');
    return false;
  }

  return true;
}

/**
 * Busca una cita en memoria por ID.
 */
function findAppointmentById(id) {
  return appointments.find((appointment) => appointment.id === id);
}

/**
 * Obtiene nombre de paciente.
 */
function getPatientName(patientId) {
  const patient = patients.find((item) => item.id === patientId);

  if (!patient) {
    return 'Paciente no encontrado';
  }

  if (patient.active === false) {
    return `${patient.fullName} (inactivo)`;
  }

  return patient.fullName;
}

/**
 * Obtiene nombre de médico.
 */
function getDoctorName(doctorId) {
  const doctor = doctors.find((item) => item.id === doctorId);

  if (!doctor) {
    return 'Médico no encontrado';
  }

  if (doctor.active === false) {
    return `${doctor.fullName} (inactivo)`;
  }

  return doctor.fullName;
}

/**
 * Obtiene nombre de especialidad.
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
 * Genera badge visual para estado de cita.
 */
function getAppointmentStatusBadge(status, active) {
  if (active === false) {
    return '<span class="badge text-bg-secondary">Desactivada</span>';
  }

  const badges = {
    scheduled: '<span class="badge text-bg-primary">Programada</span>',
    completed: '<span class="badge text-bg-success">Finalizada</span>',
    cancelled: '<span class="badge text-bg-danger">Cancelada</span>',
    no_show: '<span class="badge text-bg-warning">No asistió</span>'
  };

  return badges[status] || '<span class="badge text-bg-light">Sin estado</span>';
}

/**
 * Ordena citas por fecha y hora descendente.
 */
function sortAppointments(records) {
  return [...records].sort((a, b) => {
    const dateA = new Date(`${a.appointmentDate || '1900-01-01'}T${a.appointmentTime || '00:00'}`);
    const dateB = new Date(`${b.appointmentDate || '1900-01-01'}T${b.appointmentTime || '00:00'}`);

    return dateB - dateA;
  });
}

requireAuth(() => {
  initAppointmentsPage();
});