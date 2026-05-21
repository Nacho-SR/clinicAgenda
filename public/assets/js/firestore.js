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
  orderBy,
  limit
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

function getAuthenticatedUserId() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('No hay una sesión activa.');
  }

  return user.uid;
}

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

export async function updateRecord(collectionName, id, data) {
  const ref = doc(db, collectionName, id);

  return updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deactivateRecord(collectionName, id) {
  return updateRecord(collectionName, id, {
    active: false
  });
}

export async function getRecordById(collectionName, id) {
  const snapshot = await getDoc(doc(db, collectionName, id));

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function getActiveRecords(collectionName) {
  const q = query(
    collection(db, collectionName),
    where('active', '==', true),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}

export async function countActiveRecords(collectionName) {
  const q = query(
    collection(db, collectionName),
    where('active', '==', true)
  );

  const snapshot = await getDocs(q);

  return snapshot.size;
}

export async function countAppointmentsByStatus(status) {
  const q = query(
    collection(db, 'appointments'),
    where('active', '==', true),
    where('status', '==', status)
  );

  const snapshot = await getDocs(q);

  return snapshot.size;
}

export async function countAppointmentsByDate(dateValue) {
  const q = query(
    collection(db, 'appointments'),
    where('active', '==', true),
    where('appointmentDate', '==', dateValue)
  );

  const snapshot = await getDocs(q);

  return snapshot.size;
}

export async function existsAppointmentSlot({
  doctorId,
  appointmentDate,
  appointmentTime,
  excludeId = null
}) {
  const q = query(
    collection(db, 'appointments'),
    where('active', '==', true),
    where('doctorId', '==', doctorId),
    where('appointmentDate', '==', appointmentDate),
    where('appointmentTime', '==', appointmentTime),
    limit(5)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.some((item) => item.id !== excludeId);
}