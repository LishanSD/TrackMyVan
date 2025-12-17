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

export const fetchAttendanceHistory = async (
  studentId: string,
  limit = 14
): Promise<ChildStatus[]> => {
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

// ============================================================================
// Route Optimization Helper Functions
// ============================================================================

/**
 * Get all students assigned to a specific driver (for route optimization)
 *
 * @param driverId - The driver ID
 * @param onlyApproved - If true, only return approved students (default: true)
 * @returns Promise resolving to array of students
 */
export async function getDriverStudents(driverId: string, onlyApproved = true): Promise<Student[]> {
  try {
    const studentsRef = collection(firestore, 'students');
    const constraints = [where('driverId', '==', driverId)];

    if (onlyApproved) {
      constraints.push(where('status', '==', 'approved'));
    }

    const q = query(studentsRef, ...constraints);
    const querySnapshot = await getDocs(q);

    const students: Student[] = [];
    querySnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() } as Student);
    });

    console.log(`Fetched ${students.length} students for driver ${driverId}`);
    return students;
  } catch (error) {
    console.error('Error fetching driver students:', error);
    throw new Error(`Failed to fetch driver students: ${error}`);
  }
}

/**
 * Group students by their school location
 * Useful for optimizing routes with multiple schools
 *
 * @param students - Array of students
 * @returns Map of school address to students
 */
export function groupStudentsBySchool(students: Student[]): Map<string, Student[]> {
  const schoolGroups = new Map<string, Student[]>();

  students.forEach((student) => {
    const schoolKey =
      student.schoolLocation?.address ||
      `${student.schoolLocation?.latitude},${student.schoolLocation?.longitude}`;

    if (!schoolGroups.has(schoolKey)) {
      schoolGroups.set(schoolKey, []);
    }

    schoolGroups.get(schoolKey)!.push(student);
  });

  return schoolGroups;
}

/**
 * Validate student has required location data
 *
 * @param student - The student to validate
 * @returns True if student has valid home and school locations
 */
export function validateStudentLocations(student: Student): boolean {
  const hasHomeLocation =
    student.homeLocation &&
    typeof student.homeLocation.latitude === 'number' &&
    typeof student.homeLocation.longitude === 'number' &&
    Math.abs(student.homeLocation.latitude) <= 90 &&
    Math.abs(student.homeLocation.longitude) <= 180;

  const hasSchoolLocation =
    student.schoolLocation &&
    typeof student.schoolLocation.latitude === 'number' &&
    typeof student.schoolLocation.longitude === 'number' &&
    Math.abs(student.schoolLocation.latitude) <= 90 &&
    Math.abs(student.schoolLocation.longitude) <= 180;

  return hasHomeLocation && hasSchoolLocation;
}

/**
 * Filter students who have valid location data
 *
 * @param students - Array of students
 * @returns Array of students with valid locations
 */
export function filterStudentsWithValidLocations(students: Student[]): Student[] {
  return students.filter(validateStudentLocations);
}
