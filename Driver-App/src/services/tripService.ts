import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../config/firebaseConfig';
import { Student, Trip } from '../types/types';

const toMillis = (
  value?: number | { seconds: number; nanoseconds: number }
): number | undefined => {
  if (!value) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'seconds' in value) {
    return value.seconds * 1000 + (value.nanoseconds ?? 0) / 1_000_000;
  }
  return undefined;
};

const mapTrip = (docSnap: any): Trip => {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    driverId: data.driverId,
    date: data.date,
    type: data.type,
    status: data.status,
    startTime: toMillis(data.startTime),
    endTime: toMillis(data.endTime),
    children: Array.isArray(data.children) ? data.children : [],
    notes: data.notes,
  };
};

export const fetchDriverTrips = async (driverId: string, maxResults = 50): Promise<Trip[]> => {
  try {
    const tripsRef = collection(firestore, 'trips');
    // Avoid composite index requirement by fetching driver trips and sorting client-side
    const q = query(tripsRef, where('driverId', '==', driverId));
    const snapshot = await getDocs(q);

    const trips: Trip[] = [];
    snapshot.forEach((docSnap) => {
      trips.push(mapTrip(docSnap));
    });

    trips.sort((a, b) => {
      const getTime = (t: Trip) => new Date(t.date ?? '').getTime() || 0;
      return getTime(b) - getTime(a);
    });

    return trips.slice(0, maxResults);
  } catch (error) {
    console.error('Error fetching driver trips:', error);
    throw new Error('Failed to load trips');
  }
};

const chunk = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

export const fetchStudentsByIds = async (ids: string[]): Promise<Student[]> => {
  if (!ids.length) return [];
  try {
    // Normalize to plain string IDs and filter invalid entries
    const normalizedIds = Array.from(
      new Set(
        ids
          .map((value: any) => {
            if (typeof value === 'string') return value;
            if (value && typeof value === 'object' && typeof value.id === 'string') return value.id;
            if (value && typeof value === 'object' && typeof value.childId === 'string')
              return value.childId;
            return '';
          })
          .filter((v) => typeof v === 'string' && v.length > 0)
      )
    );

    if (!normalizedIds.length) return [];

    const studentsRef = collection(firestore, 'students');
    const result: Student[] = [];

    // Firestore allows max 10 ids per "in" query
    for (const group of chunk(normalizedIds, 10)) {
      const q = query(studentsRef, where('__name__', 'in', group));
      const snapshot = await getDocs(q);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Student;
        result.push({ ...data, id: docSnap.id });
      });
    }

    return result;
  } catch (error) {
    console.error('Error fetching students for trip:', error);
    throw new Error('Failed to load students for trip');
  }
};
