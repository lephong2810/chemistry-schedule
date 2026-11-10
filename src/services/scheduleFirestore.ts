import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { ScheduleItem, FacultyMember } from '../types';
import { INITIAL_SCHEDULE, FACULTY_MEMBERS, STANDARD_DEPARTMENTS } from '../data/mockSchedule';

const SCHEDULES_COLLECTION = 'schedules';
const FACULTY_COLLECTION = 'faculty';
const SETTINGS_COLLECTION = 'app_settings';
const DEPARTMENTS_DOC_ID = 'chemistry_departments';

/**
 * Subscribe to departments list from Firestore
 */
export function subscribeToDepartments(
  onData: (departments: string[]) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, SETTINGS_COLLECTION, DEPARTMENTS_DOC_ID);

  return onSnapshot(
    docRef,
    async (snapshot) => {
      if (!snapshot.exists()) {
        try {
          await saveDepartmentsToFirestore(STANDARD_DEPARTMENTS);
        } catch (e) {
          console.error('Error seeding initial departments:', e);
          onData(STANDARD_DEPARTMENTS);
        }
        return;
      }

      const data = snapshot.data();
      if (data && Array.isArray(data.list) && data.list.length > 0) {
        onData(data.list);
      } else {
        onData(STANDARD_DEPARTMENTS);
      }
    },
    (err) => {
      console.warn('Firestore departments listener fallback to local:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save departments list to Firestore
 */
export async function saveDepartmentsToFirestore(departments: string[]): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, DEPARTMENTS_DOC_ID);
  await setDoc(docRef, { list: departments, updatedAt: new Date().toISOString() }, { merge: true });
}

let isBulkImportingSchedules = false;

/**
 * Subscribe to real-time updates of the chemistry schedules from Firestore.
 * If the collection is empty on first load, initialize with INITIAL_SCHEDULE.
 */
export function subscribeToSchedules(
  onData: (items: ScheduleItem[]) => void,
  onError?: (err: Error) => void
) {
  const collRef = collection(db, SCHEDULES_COLLECTION);

  return onSnapshot(
    collRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Đang trong quá trình bulk import hoặc xóa replace, tuyệt đối không re-seed dữ liệu mẫu
        if (isBulkImportingSchedules) {
          return;
        }

        // Nếu client đã có dữ liệu lưu trong cache local, dùng cache chứ không tự ý đè INITIAL_SCHEDULE
        const hasCustomData = localStorage.getItem('chemistry_schedule_v1');
        if (hasCustomData) {
          try {
            const parsed = JSON.parse(hasCustomData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              onData(parsed);
              return;
            }
          } catch {}
        }

        // Seed initial schedules if database is newly provisioned
        try {
          await seedInitialSchedules();
        } catch (e) {
          console.error('Error seeding initial schedules:', e);
          onData(INITIAL_SCHEDULE);
        }
        return;
      }

      const items: ScheduleItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ScheduleItem;
        items.push({
          ...data,
          id: docSnap.id
        });
      });
      onData(items);
    },
    (err) => {
      console.warn('Firestore schedules listener fallback to local:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Seed initial schedules dataset to Firestore
 */
export async function seedInitialSchedules() {
  const batch = writeBatch(db);
  for (const item of INITIAL_SCHEDULE) {
    const docRef = doc(db, SCHEDULES_COLLECTION, item.id);
    batch.set(docRef, item);
  }
  await batch.commit();
}

/**
 * Save or update a single schedule item in Firestore
 */
export async function saveScheduleToFirestore(item: ScheduleItem): Promise<void> {
  const docRef = doc(db, SCHEDULES_COLLECTION, item.id);
  await setDoc(docRef, item, { merge: true });
}

/**
 * Delete a schedule item from Firestore
 */
export async function deleteScheduleFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, SCHEDULES_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Reset entire schedules collection back to default INITIAL_SCHEDULE or custom schedules
 */
export async function resetSchedulesInFirestore(customSchedules?: ScheduleItem[]): Promise<void> {
  const collRef = collection(db, SCHEDULES_COLLECTION);
  const snapshot = await getDocs(collRef);
  
  const batch = writeBatch(db);
  snapshot.forEach((d) => {
    batch.delete(d.ref);
  });
  
  const listToSave = customSchedules && customSchedules.length > 0 ? customSchedules : INITIAL_SCHEDULE;
  for (const item of listToSave) {
    const dRef = doc(db, SCHEDULES_COLLECTION, item.id);
    batch.set(dRef, item);
  }
  
  await batch.commit();
}

/**
 * Subscribe to faculty directory from Firestore
 */
export function subscribeToFaculty(
  onData: (items: FacultyMember[]) => void,
  onError?: (err: Error) => void
) {
  const collRef = collection(db, FACULTY_COLLECTION);

  return onSnapshot(
    collRef,
    async (snapshot) => {
      if (snapshot.empty) {
        try {
          await seedInitialFaculty();
        } catch (e) {
          console.error('Error seeding initial faculty:', e);
          onData(FACULTY_MEMBERS);
        }
        return;
      }

      const items: FacultyMember[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as FacultyMember;
        items.push({
          ...data,
          id: docSnap.id
        });
      });
      onData(items);
    },
    (err) => {
      console.warn('Firestore faculty listener fallback to local:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Seed initial faculty directory to Firestore
 */
export async function seedInitialFaculty() {
  const batch = writeBatch(db);
  for (const item of FACULTY_MEMBERS) {
    const docRef = doc(db, FACULTY_COLLECTION, item.id);
    batch.set(docRef, item);
  }
  await batch.commit();
}

/**
 * Save faculty member to Firestore
 */
export async function saveFacultyMemberToFirestore(member: FacultyMember): Promise<void> {
  const docRef = doc(db, FACULTY_COLLECTION, member.id);
  await setDoc(docRef, member, { merge: true });
}

/**
 * Delete a faculty member from Firestore
 */
export async function deleteFacultyMemberFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, FACULTY_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Bulk save multiple schedules to Firestore (can append or replace)
 */
export async function bulkSaveSchedulesToFirestore(
  newItems: ScheduleItem[],
  replaceAll = false
): Promise<void> {
  isBulkImportingSchedules = true;
  try {
    const collRef = collection(db, SCHEDULES_COLLECTION);
    const existingSnapshot = replaceAll ? await getDocs(collRef) : null;

    // 1. Lưu các item mới vào Firestore trước (chunk an toàn 300 ops / batch)
    const chunkSize = 300;
    for (let i = 0; i < newItems.length; i += chunkSize) {
      const chunk = newItems.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const dRef = doc(db, SCHEDULES_COLLECTION, item.id);
        batch.set(dRef, item, { merge: true });
      });
      await batch.commit();
    }

    // 2. Nếu là replaceAll: xóa các tài liệu cũ không còn nằm trong newItems
    if (replaceAll && existingSnapshot && !existingSnapshot.empty) {
      const newIds = new Set(newItems.map((item) => item.id));
      const toDeleteDocs = existingSnapshot.docs.filter((d) => !newIds.has(d.id));

      const delChunkSize = 300;
      for (let i = 0; i < toDeleteDocs.length; i += delChunkSize) {
        const chunk = toDeleteDocs.slice(i, i + delChunkSize);
        const delBatch = writeBatch(db);
        chunk.forEach((d) => {
          delBatch.delete(d.ref);
        });
        await delBatch.commit();
      }
    }
  } catch (error) {
    console.error('Lỗi khi lưu hàng loạt lịch lên Firestore:', error);
    throw error;
  } finally {
    // Đợi 1.5s để listener Firestore ổn định trước khi giải phóng cờ
    setTimeout(() => {
      isBulkImportingSchedules = false;
    }, 1500);
  }
}

/**
 * Bulk save multiple faculty members to Firestore
 */
export async function bulkSaveFacultyToFirestore(members: FacultyMember[]): Promise<void> {
  const chunkSize = 400;
  for (let i = 0; i < members.length; i += chunkSize) {
    const chunk = members.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((m) => {
      const dRef = doc(db, FACULTY_COLLECTION, m.id);
      batch.set(dRef, m, { merge: true });
    });
    await batch.commit();
  }
}
