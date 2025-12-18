/**
 * Student Request Notification Service for Driver-App
 *
 * Listens to Firestore student document changes and triggers notifications
 * when new students request approval
 */

import { firestore } from '../config/firebaseConfig';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import {
  NotificationHandler,
  NewStudentRequestNotification,
  StudentWithdrawnNotification,
  NotificationCategory,
} from '../types/notificationTypes';
import { Student } from '../types/types';

/**
 * Subscribe to student request changes
 * Monitors student documents for new pending requests
 *
 * @param driverId - Driver's user ID
 * @param onNotification - Callback to handle notifications
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToStudentRequests = (
  driverId: string,
  onNotification: NotificationHandler
): Unsubscribe => {
  if (!driverId) {
    console.warn(
      '[StudentRequestNotificationService] Invalid driverId, returning no-op unsubscribe'
    );
    return () => {};
  }

  // Track which students we've already notified about
  const notifiedStudents = new Map<string, string>(); // studentId -> status

  // Flag to suppress notifications on initial load
  let isInitialLoad = true;

  const studentsRef = collection(firestore, 'students');
  const q = query(studentsRef, where('driverId', '==', driverId));

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const student = { id: change.doc.id, ...change.doc.data() } as Student;

        // On initial load, mark existing students as notified without showing notification
        if (isInitialLoad) {
          notifiedStudents.set(student.id, student.status || 'unknown');
          return;
        }

        // Notify on newly added students with pending status
        if (change.type === 'added' && student.status === 'pending') {
          notifiedStudents.set(student.id, student.status);

          const notification: NewStudentRequestNotification = {
            id: `student-request-${student.id}-${Date.now()}`,
            timestamp: Date.now(),
            category: NotificationCategory.STUDENT_REQUEST,
            type: 'NEW_STUDENT_REQUEST',
            title: 'New Student Request',
            message: `${student.name} has requested to join`,
            studentId: student.id,
            studentName: student.name,
            parentName: student.parentName,
            parentId: student.parentId,
          };

          console.log(
            '[StudentRequestNotificationService] New request notification:',
            notification
          );
          onNotification(notification);
        }

        // Notify if student was pending and is now removed (withdrawn)
        if (change.type === 'removed') {
          const previousStatus = notifiedStudents.get(student.id);
          if (previousStatus === 'pending') {
            const notification: StudentWithdrawnNotification = {
              id: `student-withdrawn-${student.id}-${Date.now()}`,
              timestamp: Date.now(),
              category: NotificationCategory.STUDENT_REQUEST,
              type: 'STUDENT_WITHDRAWN',
              title: 'Request Withdrawn',
              message: `${student.name}'s request was withdrawn`,
              studentId: student.id,
              studentName: student.name,
            };

            console.log(
              '[StudentRequestNotificationService] Withdrawal notification:',
              notification
            );
            onNotification(notification);
          }
          notifiedStudents.delete(student.id);
        }

        // Update tracked status for modified students
        if (change.type === 'modified') {
          notifiedStudents.set(student.id, student.status || 'unknown');
        }
      });

      // After first snapshot, clear initial load flag
      if (isInitialLoad) {
        isInitialLoad = false;
        console.log('[StudentRequestNotificationService] Initial load complete');
      }
    },
    (error) => {
      console.error('[StudentRequestNotificationService] Error listening to students:', error);
    }
  );
};
