import { requireAuth } from './auth.js';

import {
  createRecord,
  updateRecord,
  getRecordById,
  getRecords
} from './firestore.js';

import { validateFields } from './validators.js';

import {
  showAlert,
  setButtonLoading,
  escapeHTML,
  formatDate,
  getTodayISODate
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

const form = document.getElementById('appointmentForm');
const pageTitle = document.getElementById('pageTitle');
const appointmentIdInput = document.getElementById('appointmentId');
const patientIdInput = document.getElementById('patientId');
const specialtyIdInput = document.getElementById('specialtyId');
const doctorIdInput = document.getElementById('doctorId');
const appointmentDateInput = document.getElementById('appointmentDate');
const appointmentTimeInput = document.getElementById('appointmentTime');
const reasonInput = document.getElementById('reason');
const saveButton = document.getElementById('saveAppointmentButton');

/**
 * Obtiene el ID de la cita desde la URL.
 *
 * Alta:
 * appointment-form.html
 *
 * Edición:
 * appointment-form.html?id=ID_DE_LA_CITA
 */
function getAppointmentIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/**
 * Inicializa la pantalla del formulario.
 */
async function initAppointmentFormPage() {
  appointmentDateInput.min = getTodayISODate();

  form.addEventListener('submit', handleSubmit);

  specialtyIdInput.addEventListener('change', () => {
    renderDoctorOptionsBySpecialty(specialtyIdInput.value);
  });

  await loadInitialData();

  const appointmentId = getAppointmentIdFromUrl();

  if (appointmentId) {
    await loadAppointmentForEdit(appointmentId);
  }
}

/**
 * Carga citas, pacientes, médicos y especialidades.
 */
async function loadInitialData() {
  try {
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

    appointments = appointmentsResult;
    patients = patientsResult;
    doctors = doctorsResult;
    specialties = specialtiesResult;

    activePatients = patients.filter((patient) => patient.active !== false);
    activeDoctors = doctors.filter((doctor) => doctor.active !== false);
    activeSpecialties = specialties.filter((specialty) => specialty.active !== false);

    renderPatientOptions();
    renderSpecialtyOptions();
    renderDoctorOptionsBySpecialty('');

    validatePrerequisites();
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar la información necesaria para la cita.', 'danger');
    saveButton.disabled = true;
  }
}

/**
 * Valida que existan datos base para crear citas.
 */
function validatePrerequisites() {
  const missing = [];

  if (activePatients.length === 0) missing.push('pacientes activos');
  if (activeSpecialties.length === 0) missing.push('especialidades activas');
  if (activeDoctors.length === 0) missing.push('médicos activos');

  if (missing.length > 0) {
    saveButton.disabled = true;

    showAlert(
      `Para crear citas necesitas registrar primero: ${missing.join(', ')}.`,
      'warning'
    );

    return;
  }

  saveButton.disabled = false;
}

/**
 * Llena el select de pacientes.
 */
function renderPatientOptions(selectedPatientId = '') {
  if (activePatients.length === 0) {
    patientIdInput.innerHTML = '<option value="">No hay pacientes activos</option>';
    patientIdInput.disabled = true;
    return;
  }

  patientIdInput.disabled = false;

  const options = activePatients.map((patient) => {
    const selected = patient.id === selectedPatientId ? 'selected' : '';

    return `
      <option value="${patient.id}" ${selected}>
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
 * Llena el select de especialidades.
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
 * Carga una cita existente para edición.
 */
async function loadAppointmentForEdit(id) {
  try {
    const appointment = await getRecordById(COLLECTION_NAME, id);

    if (!appointment) {
      showAlert('No se encontró la cita solicitada.', 'warning');
      saveButton.disabled = true;
      return;
    }

    if (appointment.active === false) {
      showAlert('No puedes editar una cita desactivada.', 'warning');
      saveButton.disabled = true;
      return;
    }

    if (appointment.status !== 'scheduled') {
      showAlert('Solo puedes editar citas programadas.', 'warning');
      saveButton.disabled = true;
      return;
    }

    pageTitle.textContent = 'Editar cita';
    saveButton.textContent = 'Actualizar cita';

    appointmentIdInput.value = appointment.id;

    renderPatientOptions(
      isActivePatient(appointment.patientId) ? appointment.patientId : ''
    );

    renderSpecialtyOptions(
      isActiveSpecialty(appointment.specialtyId) ? appointment.specialtyId : ''
    );

    renderDoctorOptionsBySpecialty(
      appointment.specialtyId,
      isActiveDoctor(appointment.doctorId) ? appointment.doctorId : ''
    );

    patientIdInput.value = isActivePatient(appointment.patientId) ? appointment.patientId : '';
    specialtyIdInput.value = isActiveSpecialty(appointment.specialtyId) ? appointment.specialtyId : '';
    doctorIdInput.value = isActiveDoctor(appointment.doctorId) ? appointment.doctorId : '';

    appointmentDateInput.value = appointment.appointmentDate || '';
    appointmentTimeInput.value = appointment.appointmentTime || '';
    reasonInput.value = appointment.reason || '';

    if (
      !isActivePatient(appointment.patientId) ||
      !isActiveSpecialty(appointment.specialtyId) ||
      !isActiveDoctor(appointment.doctorId)
    ) {
      showAlert(
        'La cita tiene paciente, médico o especialidad inactiva. Selecciona datos activos para poder actualizarla.',
        'warning'
      );
    }
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar la cita.', 'danger');
  }
}

/**
 * Construye el objeto que se guardará en Firestore.
 */
function buildAppointmentPayload() {
  return {
    patientId: patientIdInput.value,
    specialtyId: specialtyIdInput.value,
    doctorId: doctorIdInput.value,
    appointmentDate: appointmentDateInput.value,
    appointmentTime: appointmentTimeInput.value,
    reason: reasonInput.value.trim(),
    status: 'scheduled'
  };
}

/**
 * Crea o actualiza la cita.
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
      `No se puede agendar la cita. El médico ya tiene una cita programada el 
      ${formatDate(conflictingAppointment.appointmentDate)} a las 
      ${escapeHTML(conflictingAppointment.appointmentTime)}. 
      Debe respetarse un margen de ${APPOINTMENT_MARGIN_MINUTES} minutos antes o después.`,
      'warning'
    );
    return;
  }

  try {
    setButtonLoading(saveButton, true, 'Guardando...');

    if (editingId) {
      await updateRecord(COLLECTION_NAME, editingId, payload);
      sessionStorage.setItem('clinicAgendaAlert', 'Cita actualizada correctamente.');
    } else {
      await createRecord(COLLECTION_NAME, payload);
      sessionStorage.setItem('clinicAgendaAlert', 'Cita registrada correctamente.');
    }

    window.location.href = './appointments.html';
  } catch (error) {
    console.error(error);
    showAlert('No fue posible guardar la cita.', 'danger');
  } finally {
    setButtonLoading(saveButton, false);
  }
}

/**
 * Valida conflicto de horario con margen de 30 minutos.
 *
 * Solo bloquea cuando:
 * - Es el mismo médico.
 * - Es la misma fecha.
 * - La cita existente está activa.
 * - La cita existente está programada.
 * - La diferencia de tiempo es menor o igual al margen.
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

/**
 * Construye una fecha con hora para comparar disponibilidad.
 */
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
 * Valida que el médico pertenezca a la especialidad.
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

requireAuth(() => {
  initAppointmentFormPage();
});