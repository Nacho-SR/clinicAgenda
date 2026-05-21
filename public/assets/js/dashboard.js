import {
  countActiveRecords,
  countAppointmentsByDate,
  countAppointmentsByStatus
} from './firestore.js';
import { requireAuth } from './auth.js';
import { getTodayISODate, setText, showAlert } from './ui.js';

async function loadDashboard() {
  try {
    const today = getTodayISODate();

    const [todayAppointments, scheduledAppointments, cancelledAppointments, patients] = await Promise.all([
      countAppointmentsByDate(today),
      countAppointmentsByStatus('scheduled'),
      countAppointmentsByStatus('cancelled'),
      countActiveRecords('patients')
    ]);

    setText('todayAppointmentsCount', todayAppointments);
    setText('scheduledAppointmentsCount', scheduledAppointments);
    setText('cancelledAppointmentsCount', cancelledAppointments);
    setText('patientsCount', patients);
  } catch (error) {
    console.error(error);
    showAlert('No fue posible cargar las métricas del dashboard. Revisa la configuración de Firebase y las reglas de Firestore.', 'warning');
  }
}

requireAuth(() => {
  loadDashboard();
});
