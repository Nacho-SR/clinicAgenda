import { requireAuth } from './auth.js';

import {
  createRecord,
  updateRecord,
  deactivateRecord,
  getRecords
} from './firestore.js';

import { validateFields } from './validators.js';

import {
  showAlert,
  setButtonLoading,
  escapeHTML,
  normalizeText,
  formatDate,
  formatTimestamp,
  getTodayISODate,
  renderTableLoading,
  renderTableEmpty
} from './ui.js';

const COLLECTION_NAME = 'appointments';
const APPOINTMENT_MARGIN_MINUTES = 30;

let appointments = [];
let patients = [];
let doctors = [];
let specialties = [];

let activePatients = [];
let activeDoctors = [];
let activeSpecialties = [];

let detailModal = null;

const form = document.getElementById('appointmentForm');
const formTitle = document.getElementById('appointmentFormTitle');
const appointmentIdInput = document.getElementById('appointmentId');
const patientIdInput = document.getElementById('patientId');
const specialtyIdInput = document.getElementById('specialtyId');
const doctorIdInput = document.getElementById('doctorId');
const appointmentDateInput = document.getElementById('appointmentDate');
const appointmentTimeInput = document.getElementById('appointmentTime');
const reasonInput = document.getElementById('reason');
const saveButton = document.getElementById('saveAppointmentButton');
const cancelEditButton = document.getElementById('cancelEditAppointmentButton');

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

  appointmentDateInput.min = getTodayISODate();

  form.addEventListener('submit', handleSubmit);
  cancelEditButton.addEventListener('click', resetForm);

  specialtyIdInput.addEventListener('change', () => {
    renderDoctorOptionsBySpecialty(specialtyIdInput.value);
  });

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

    activePatients = patients.filter((patient) => patient.active !== false);
    activeDoctors = doctors.filter((doctor) => doctor.active !== false);
    activeSpecialties = specialties.filter((specialty) => specialty.active !== false);

    renderFormOptions();
    renderFilterOptions();
    renderAppointments();
    validatePrerequisites();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar el módulo de citas.', 'danger');
    renderTableEmpty(tableBody, 'No se pudieron cargar los registros.', 6);
  }
}

/**
 * Valida si existen los datos mínimos para agendar una cita.
 */
function validatePrerequisites() {
  const missing = [];

  if (activePatients.length === 0) missing.push('pacientes activos');
  if (activeSpecialties.length === 0) missing.push('especialidades activas');
  if (activeDoctors.length === 0) missing.push('médicos activos');

  if (missing.length > 0) {
    saveButton.disabled = true;

    showAlert(
      `Para crear citas necesitas registrar primero: ${missing.join(', ')}. 
      Puedes hacerlo desde los módulos Pacientes, Especialidades y Médicos.`,
      'warning'
    );

    return;
  }

  saveButton.disabled = false;
}

/**
 * Llena los selects del formulario.
 */
function renderFormOptions() {
  renderPatientOptions();
  renderSpecialtyOptions();
  renderDoctorOptionsBySpecialty(specialtyIdInput.value);
}

/**
 * Llena el select de pacientes activos.
 */
function renderPatientOptions() {
  if (activePatients.length === 0) {
    patientIdInput.innerHTML = '<option value="">No hay pacientes activos</option>';
    patientIdInput.disabled = true;
    return;
  }

  patientIdInput.disabled = false;

  const options = activePatients.map((patient) => {
    return `
      <option value="${patient.id}">
        ${escapeHTML(patient.fullName)}
      </option>
    `;
  }).join('');

  patientIdInput.innerHTML = `
    <option value="">Selecciona un paciente</option>
    ${options}
  `;
}

/**
 * Llena el select de especialidades activas.
 */
function renderSpecialtyOptions() {
  if (activeSpecialties.length === 0) {
    specialtyIdInput.innerHTML = '<option value="">No hay especialidades activas</option>';
    specialtyIdInput.disabled = true;
    return;
  }

  specialtyIdInput.disabled = false;

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
 * Llena el select de médicos según la especialidad seleccionada.
 */
function renderDoctorOptionsBySpecialty(specialtyId, selectedDoctorId = '') {
  if (!specialtyId) {
    doctorIdInput.innerHTML = '<option value="">Selecciona una especialidad primero</option>';
    doctorIdInput.disabled = true;
    return;
  }

  const doctorsBySpecialty = activeDoctors.filter((doctor) => {
    return doctor.specialtyId === specialtyId;
  });

  if (doctorsBySpecialty.length === 0) {
    doctorIdInput.innerHTML = '<option value="">No hay médicos activos para esta especialidad</option>';
    doctorIdInput.disabled = true;
    return;
  }

  doctorIdInput.disabled = false;

  const options = doctorsBySpecialty.map((doctor) => {
    const selected = doctor.id === selectedDoctorId ? 'selected' : '';

    return `
      <option value="${doctor.id}" ${selected}>
        ${escapeHTML(doctor.fullName)}
      </option>
    `;
  }).join('');

  doctorIdInput.innerHTML = `
    <option value="">Selecciona un médico</option>
    ${options}
  `;
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
 * Construye el objeto de cita para Firestore.
 */
function buildAppointmentPayload() {
  const patientId = patientIdInput.value;
  const specialtyId = specialtyIdInput.value;
  const doctorId = doctorIdInput.value;
  const appointmentDate = appointmentDateInput.value;
  const appointmentTime = appointmentTimeInput.value;
  const reason = reasonInput.value.trim();

  return {
    patientId,
    specialtyId,
    doctorId,
    appointmentDate,
    appointmentTime,
    reason,
    status: 'scheduled'
  };
}

/**
 * Crea o actualiza una cita médica.
 */
async function handleSubmit(event) {
  event.preventDefault();

  const editingId = appointmentIdInput.value || null;
  const payload = buildAppointmentPayload();

  const errors = validateFields([
    {
      label: 'Paciente',
      value: payload.patientId,
      rules: { required: true }
    },
    {
      label: 'Especialidad',
      value: payload.specialtyId,
      rules: { required: true }
    },
    {
      label: 'Médico',
      value: payload.doctorId,
      rules: { required: true }
    },
    {
      label: 'Fecha de la cita',
      value: payload.appointmentDate,
      rules: { required: true, date: true }
    },
    {
      label: 'Hora de la cita',
      value: payload.appointmentTime,
      rules: { required: true, time: true }
    },
    {
      label: 'Motivo de la cita',
      value: payload.reason,
      rules: { required: true, minLength: 5 }
    }
  ]);

  if (errors.length > 0) {
    showAlert(errors.join('<br>'), 'danger');
    return;
  }

  if (!isActivePatient(payload.patientId)) {
    showAlert('El paciente seleccionado no existe o está inactivo.', 'danger');
    return;
  }

  if (!isActiveSpecialty(payload.specialtyId)) {
    showAlert('La especialidad seleccionada no existe o está inactiva.', 'danger');
    return;
  }

  if (!isActiveDoctor(payload.doctorId)) {
    showAlert('El médico seleccionado no existe o está inactivo.', 'danger');
    return;
  }

  if (!doctorBelongsToSpecialty(payload.doctorId, payload.specialtyId)) {
    showAlert('El médico seleccionado no pertenece a la especialidad indicada.', 'danger');
    return;
  }

  if (isPastDateTime(payload.appointmentDate, payload.appointmentTime)) {
    showAlert('No puedes agendar una cita en una fecha u hora pasada.', 'danger');
    return;
  }

  const conflictingAppointment = appointmentConflictsWithMargin({
    doctorId: payload.doctorId,
    appointmentDate: payload.appointmentDate,
    appointmentTime: payload.appointmentTime,
    excludeId: editingId
  });

  if (conflictingAppointment) {
    showAlert(
      `No se puede agendar la cita. El médico ${escapeHTML(getDoctorName(payload.doctorId))}
      ya tiene una cita programada el ${formatDate(conflictingAppointment.appointmentDate)}
      a las ${escapeHTML(conflictingAppointment.appointmentTime)}.
      Debe respetarse un margen de ${APPOINTMENT_MARGIN_MINUTES} minutos antes o después.`,
      'warning'
    );
    return;
  }

  try {
    setButtonLoading(saveButton, true, 'Guardando...');

    if (editingId) {
      await updateRecord(COLLECTION_NAME, editingId, payload);
      showAlert('Cita actualizada correctamente.', 'success');
    } else {
      await createRecord(COLLECTION_NAME, payload);
      showAlert('Cita registrada correctamente.', 'success');
    }

    resetForm();
    await loadInitialData();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible guardar la cita.', 'danger');
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

  appointmentIdInput.value = appointment.id;
  patientIdInput.value = isActivePatient(appointment.patientId) ? appointment.patientId : '';
  specialtyIdInput.value = isActiveSpecialty(appointment.specialtyId) ? appointment.specialtyId : '';

  renderDoctorOptionsBySpecialty(appointment.specialtyId, appointment.doctorId);

  doctorIdInput.value = isActiveDoctor(appointment.doctorId) ? appointment.doctorId : '';
  appointmentDateInput.value = appointment.appointmentDate || '';
  appointmentTimeInput.value = appointment.appointmentTime || '';
  reasonInput.value = appointment.reason || '';

  formTitle.textContent = 'Editar cita';
  saveButton.textContent = 'Actualizar cita';
  cancelEditButton.classList.remove('d-none');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
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
 * Limpia el formulario.
 */
function resetForm() {
  form.reset();
  appointmentIdInput.value = '';

  formTitle.textContent = 'Nueva cita';
  saveButton.textContent = 'Guardar cita';
  cancelEditButton.classList.add('d-none');

  renderFormOptions();
  validatePrerequisites();
}

/**
 * Revisa si existe una cita programada con el mismo médico, fecha y hora.
 *
 * Se toma en cuenta solo:
 * - active !== false
 * - status === scheduled
 *
 * Así, si una cita fue cancelada, el horario puede reutilizarse.
 */
function appointmentConflictsWithMargin({
  doctorId,
  appointmentDate,
  appointmentTime,
  excludeId = null
}) {
  const newAppointmentDateTime = buildAppointmentDateTime(
    appointmentDate,
    appointmentTime
  );

  if (!newAppointmentDateTime) {
    return null;
  }

  return appointments.find((appointment) => {
    if (excludeId && appointment.id === excludeId) {
      return false;
    }

    if (appointment.active === false) {
      return false;
    }

    if (appointment.status !== 'scheduled') {
      return false;
    }

    if (appointment.doctorId !== doctorId) {
      return false;
    }

    if (appointment.appointmentDate !== appointmentDate) {
      return false;
    }

    const existingAppointmentDateTime = buildAppointmentDateTime(
      appointment.appointmentDate,
      appointment.appointmentTime
    );

    if (!existingAppointmentDateTime) {
      return false;
    }

    const differenceInMinutes = Math.abs(
      newAppointmentDateTime - existingAppointmentDateTime
    ) / 60000;

    return differenceInMinutes <= APPOINTMENT_MARGIN_MINUTES;
  }) || null;
}

function buildAppointmentDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const dateTime = new Date(`${dateValue}T${timeValue}`);

  if (Number.isNaN(dateTime.getTime())) {
    return null;
  }

  return dateTime;
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
 * Valida paciente activo.
 */
function isActivePatient(patientId) {
  return activePatients.some((patient) => patient.id === patientId);
}

/**
 * Valida médico activo.
 */
function isActiveDoctor(doctorId) {
  return activeDoctors.some((doctor) => doctor.id === doctorId);
}

/**
 * Valida especialidad activa.
 */
function isActiveSpecialty(specialtyId) {
  return activeSpecialties.some((specialty) => specialty.id === specialtyId);
}

/**
 * Valida que el médico corresponda a la especialidad seleccionada.
 */
function doctorBelongsToSpecialty(doctorId, specialtyId) {
  const doctor = doctors.find((item) => item.id === doctorId);

  if (!doctor) return false;

  return doctor.specialtyId === specialtyId;
}

/**
 * Evita agendar citas en fecha/hora pasada.
 */
function isPastDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return false;

  const selected = new Date(`${dateValue}T${timeValue}`);
  const now = new Date();

  return selected < now;
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