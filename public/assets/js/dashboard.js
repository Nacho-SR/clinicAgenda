import { getRecords } from './firestore.js';
import { requireAuth } from './auth.js';
import {
  getTodayISODate,
  setText,
  showAlert,
  escapeHTML,
  formatDate,
  renderTableEmpty
} from './ui.js';

let patients = [];
let doctors = [];
let specialties = [];

async function loadDashboard() {
  try {
    const today = getTodayISODate();

    const [
      appointmentsResult,
      patientsResult,
      doctorsResult,
      specialtiesResult
    ] = await Promise.all([
      getRecords('appointments'),
      getRecords('patients'),
      getRecords('doctors'),
      getRecords('specialties')
    ]);

    patients = patientsResult;
    doctors = doctorsResult;
    specialties = specialtiesResult;

    const activeAppointments = appointmentsResult.filter((appointment) => {
      return appointment.active !== false;
    });

    const activePatients = patientsResult.filter((patient) => {
      return patient.active !== false;
    });

    const todayAppointments = activeAppointments.filter((appointment) => {
      return appointment.appointmentDate === today;
    }).length;

    const scheduledAppointments = activeAppointments.filter((appointment) => {
      return appointment.status === 'scheduled';
    }).length;

    const cancelledAppointments = activeAppointments.filter((appointment) => {
      return appointment.status === 'cancelled';
    }).length;

    setText('todayAppointmentsCount', todayAppointments);
    setText('scheduledAppointmentsCount', scheduledAppointments);
    setText('cancelledAppointmentsCount', cancelledAppointments);
    setText('patientsCount', activePatients.length);

    renderUpcomingAppointments(activeAppointments);
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar las métricas del dashboard. Revisa la configuración de Firebase y las reglas de Firestore.', 'warning');
  }
}

function renderUpcomingAppointments(appointments) {
  const tableBody = document.getElementById('upcomingAppointmentsTableBody');

  if (!tableBody) return;

  const now = new Date();

  const upcomingAppointments = appointments
    .filter((appointment) => {
      if (appointment.status !== 'scheduled') return false;

      const appointmentDateTime = new Date(
        `${appointment.appointmentDate}T${appointment.appointmentTime}`
      );

      return appointmentDateTime >= now;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.appointmentDate}T${a.appointmentTime}`);
      const dateB = new Date(`${b.appointmentDate}T${b.appointmentTime}`);

      return dateA - dateB;
    })
    .slice(0, 5);

  if (upcomingAppointments.length === 0) {
    renderTableEmpty(tableBody, 'No hay citas próximas programadas.', 5);
    return;
  }

  tableBody.innerHTML = upcomingAppointments.map((appointment) => {
    return `
      <tr>
        <td>${formatDate(appointment.appointmentDate)}</td>
        <td>${escapeHTML(appointment.appointmentTime || '-')}</td>
        <td>${escapeHTML(getPatientName(appointment.patientId))}</td>
        <td>${escapeHTML(getDoctorName(appointment.doctorId))}</td>
        <td>${escapeHTML(getSpecialtyName(appointment.specialtyId))}</td>
      </tr>
    `;
  }).join('');
}

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
  loadDashboard();
});
