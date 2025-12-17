import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '../config/firebaseConfig';
import { Student, ChildStatus } from '../types/types';

const sortStudents = (list: Student[]) => {
  const getTime = (value?: string) => (value ? new Date(value).getTime() : 0);
  return [...list].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return getTime(b.createdAt) - getTime(a.createdAt);
  });
};

export const subscribeToDriverStudents = (
  driverId: string,
  onChange: (students: Student[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const q = query(collection(firestore, 'students'), where('driverId', '==', driverId));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const studentsData: Student[] = [];
      snapshot.forEach((snap) => {
        studentsData.push({ id: snap.id, ...snap.data() } as Student);
      });
      onChange(sortStudents(studentsData));
    },
    (error) => {
      onError?.(error as Error);
    }
  );

  return unsubscribe;
};

export const approveStudent = async (studentId: string) => {
  await updateDoc(doc(firestore, 'students', studentId), {
    status: 'approved',
    approvedAt: new Date().toISOString(),
  });
};

export const rejectStudent = async (studentId: string) => {
  await updateDoc(doc(firestore, 'students', studentId), {
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
  });
};

export const fetchAttendanceHistory = async (studentId: string, limit = 14): Promise<ChildStatus[]> => {
  const datesRef = collection(firestore, 'childStatus', studentId, 'dates');
  const snapshot = await getDocs(datesRef);

  const records: ChildStatus[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    records.push({
      childId: studentId,
      date: (data.date as string | undefined) ?? docSnap.id,
      ...data,
    } as ChildStatus);
  });

  records.sort((a, b) => {
    const getTime = (d?: string) => {
      if (!d) return 0;
      const t = new Date(d).getTime();
      return isNaN(t) ? 0 : t;
    };
    return getTime(b.date) - getTime(a.date);
  });

  return records.slice(0, limit);
};

