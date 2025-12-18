/**
 * Student Approval Notification Service
 *
 * Listens to Firestore student document changes and triggers notifications
 * when driver approves or rejects student requests
 */

import { firestore } from '../config/firebaseConfig';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import {
  NotificationHandler,
  StudentApprovedNotification,
  StudentRejectedNotification,
  NotificationCategory,
} from '../types/notificationTypes';
import { Student } from '../types/types';

/**
 * Subscribe to student status changes
 * Monitors student documents for approval status changes (pending → approved/rejected)
 *
 * @param parentId - Parent's user ID
 * @param onNotification - Callback to handle notifications
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToStudentApprovals = (
  parentId: string,
  onNotification: NotificationHandler
): Unsubscribe => {
  if (!parentId) {
    console.warn(
      '[StudentApprovalNotificationService] Invalid parentId, returning no-op unsubscribe'
    );
    return () => {};
  }

  // Track which students we' ve already notified about
  const notifiedStudents = new Map<string, string>(); // studentId -> status

  // Flag to suppress notifications on initial load
  let isInitialLoad = true;

  const studentsRef = collection(firestore, 'students');
  const q = query(studentsRef, where('parentId', '==', parentId));

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const student = { id: change.doc.id, ...change.doc.data() } as Student;

        // On initial load, mark existing students as notified without showing notification
        if (isInitialLoad) {
          notifiedStudents.set(student.id, student.status);
          return;
        }

        // Only notify on status changes (modified)
        if (change.type === 'modified') {
          const previousStatus = notifiedStudents.get(student.id);

          // Check if status changed from pending to approved/rejected
          if (previousStatus === 'pending' && student.status !== 'pending') {
            // Update tracked status
            notifiedStudents.set(student.id, student.status);

            if (student.status === 'approved') {
              const notification: StudentApprovedNotification = {
                id: `student-approved-${student.id}-${Date.now()}`,
                timestamp: Date.now(),
                category: NotificationCategory.APPROVAL,
                type: 'STUDENT_APPROVED',
                title: 'Student Approved',
                message: `${student.name} has been approved by the driver`,
                studentId: student.id,
                studentName: student.name,
              };

              console.log(
                '[StudentApprovalNotificationService] Approval notification:',
                notification
              );
              onNotification(notification);
            } else if (student.status === 'rejected') {
              const notification: StudentRejectedNotification = {
                id: `student-rejected-${student.id}-${Date.now()}`,
                timestamp: Date.now(),
                category: NotificationCategory.APPROVAL,
                type: 'STUDENT_REJECTED',
                title: 'Student Rejected',
                message: `${student.name} request was rejected by the driver`,
                studentId: student.id,
                studentName: student.name,
              };

              console.log(
                '[StudentApprovalNotificationService] Rejection notification:',
                notification
              );
              onNotification(notification);
            }
          }
        }

        // For newly added students, track their current status
        if (change.type === 'added' && !isInitialLoad) {
          notifiedStudents.set(student.id, student.status);
        }
      });

      // After first snapshot, clear initial load flag
      if (isInitialLoad) {
        isInitialLoad = false;
        console.log('[StudentApprovalNotificationService] Initial load complete');
      }
    },
    (error) => {
      console.error('[StudentApprovalNotificationService] Error listening to students:', error);
    }
  );
};
