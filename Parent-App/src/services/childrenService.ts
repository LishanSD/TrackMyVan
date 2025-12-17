import { firestore } from '../config/firebaseConfig';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Student } from '../types/types';

/**
 * Get all students for a specific parent
 * @param parentId - The parent's user ID
 * @returns Promise<Student[]>
 */
export const getParentStudents = async (parentId: string): Promise<Student[]> => {
  try {
    const studentsRef = collection(firestore, 'students');
    const q = query(studentsRef, where('parentId', '==', parentId));

    const snapshot = await getDocs(q);

    const students: Student[] = [];
    snapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() } as Student);
    });

    return students;
  } catch (error) {
    console.error('Error fetching parent students:', error);
    throw new Error('Failed to fetch students');
  }
};

/**
 * Subscribe to real-time updates for a parent's students
 * @param parentId - The parent's user ID
 * @param callback - Function to call when students update
 * @returns Unsubscribe function
 */
export const subscribeToParentStudents = (
  parentId: string,
  callback: (students: Student[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  try {
    const studentsRef = collection(firestore, 'students');
    const q = query(studentsRef, where('parentId', '==', parentId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const students: Student[] = [];
        snapshot.forEach((doc) => {
          students.push({ id: doc.id, ...doc.data() } as Student);
        });
        callback(students);
      },
      (error) => {
        console.error('Error in students subscription:', error);
        if (onError) {
          onError(new Error('Failed to subscribe to students'));
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up students subscription:', error);
    if (onError) {
      onError(error as Error);
    }
    return () => {};
  }
};
