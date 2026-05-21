import { auth, db, serverTimestamp } from './firebase.js';

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

/**
 * Obtiene el UID del usuario autenticado.
 * Se usa para guardar createdBy en cada registro.
 */
function getAuthenticatedUserId() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('No hay una sesión activa.');
  }

  return user.uid;
}

/**
 * Convierte fechas Timestamp de Firestore a milisegundos.
 * Sirve para ordenar registros en JavaScript sin depender de orderBy,
 * evitando errores de índices compuestos en Firestore.
 */
function getTimestampMillis(value) {
  if (!value) return 0;

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return 0;
}

/**
 * Ordena registros por fecha de creación descendente.
 * Los más nuevos aparecen primero.
 */
function sortByCreatedAtDesc(records) {
  return records.sort((a, b) => {
    return getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt);
  });
}

/**
 * Crea un nuevo documento en la colección indicada.
 * Agrega automáticamente:
 * - active
 * - createdAt
 * - updatedAt
 * - createdBy
 */
export async function createRecord(collectionName, data) {
  const userId = getAuthenticatedUserId();

  const payload = {
    ...data,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId
  };

  return addDoc(collection(db, collectionName), payload);
}

/**
 * Actualiza un documento existente.
 * Siempre actualiza updatedAt.
 */
export async function updateRecord(collectionName, id, data) {
  const ref = doc(db, collectionName, id);

  return updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

/**
 * Eliminación lógica.
 * No borra el documento físicamente; solo lo marca como inactivo.
 */
export async function deactivateRecord(collectionName, id) {
  return updateRecord(collectionName, id, {
    active: false
  });
}

/**
 * Reactiva un documento previamente desactivado.
 * Lo dejamos listo por si después queremos restaurar registros.
 */
export async function reactivateRecord(collectionName, id) {
  return updateRecord(collectionName, id, {
    active: true
  });
}

/**
 * Obtiene un documento por su ID.
 */
export async function getRecordById(collectionName, id) {
  const snapshot = await getDoc(doc(db, collectionName, id));

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

/**
 * Obtiene todos los documentos de una colección.
 * No usa orderBy para evitar pedir índices compuestos durante el desarrollo.
 */
export async function getRecords(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));

  const records = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));

  return sortByCreatedAtDesc(records);
}

/**
 * Obtiene únicamente registros activos.
 */
export async function getActiveRecords(collectionName) {
  const records = await getRecords(collectionName);

  return records.filter((record) => record.active !== false);
}

/**
 * Cuenta registros activos de una colección.
 * Se usa en el dashboard.
 */
export async function countActiveRecords(collectionName) {
  const records = await getActiveRecords(collectionName);

  return records.length;
}

/**
 * Cuenta citas activas por estado.
 * Se usa en el dashboard.
 */
export async function countAppointmentsByStatus(status) {
  const records = await getActiveRecords('appointments');

  return records.filter((appointment) => appointment.status === status).length;
}

/**
 * Cuenta citas activas por fecha.
 * Se usa en el dashboard.
 */
export async function countAppointmentsByDate(dateValue) {
  const records = await getActiveRecords('appointments');

  return records.filter((appointment) => {
    return appointment.appointmentDate === dateValue;
  }).length;
}

/**
 * Valida si ya existe un registro con el mismo valor en un campo.
 *
 * Ejemplos:
 * - Especialidad con mismo nameNormalized.
 * - Paciente con mismo emailNormalized.
 *
 * excludeId se usa al editar para no comparar el registro contra sí mismo.
 */
export async function recordExists({
  collectionName,
  fieldName,
  value,
  excludeId = null,
  onlyActive = true
}) {
  const q = query(
    collection(db, collectionName),
    where(fieldName, '==', value),
    limit(10)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.some((item) => {
    const data = item.data();

    if (excludeId && item.id === excludeId) {
      return false;
    }

    if (onlyActive && data.active === false) {
      return false;
    }

    return true;
  });
}

/**
 * Valida si ya existe una cita para el mismo médico, fecha y hora.
 * La usaremos en la fase de citas.
 */
export async function existsAppointmentSlot({
  doctorId,
  appointmentDate,
  appointmentTime,
  excludeId = null
}) {
  const q = query(
    collection(db, 'appointments'),
    where('doctorId', '==', doctorId),
    limit(50)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.some((item) => {
    const data = item.data();

    if (excludeId && item.id === excludeId) {
      return false;
    }

    if (data.active === false) {
      return false;
    }

    return (
      data.doctorId === doctorId &&
      data.appointmentDate === appointmentDate &&
      data.appointmentTime === appointmentTime
    );
  });
}