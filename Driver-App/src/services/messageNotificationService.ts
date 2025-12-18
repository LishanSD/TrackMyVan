/**
 * Message Notification Service for Driver-App
 *
 * Listens to Firestore message changes and triggers notifications for new messages from parents
 */

import { firestore } from '../config/firebaseConfig';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import {
  NotificationHandler,
  NewMessageNotification,
  NotificationCategory,
} from '../types/notificationTypes';
import { Message } from '../types/types';

/**
 * Subscribe to new messages from parents
 * Monitors messages collection for new messages sent to the driver
 *
 * @param driverId - Driver's user ID
 * @param onNotification - Callback to handle notifications
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToNewMessages = (
  driverId: string,
  onNotification: NotificationHandler
): Unsubscribe => {
  if (!driverId) {
    console.warn('[MessageNotificationService] Invalid driverId, returning no-op unsubscribe');
    return () => {};
  }

  // Track which messages we've already notified about
  const notifiedMessages = new Set<string>();

  // Flag to suppress notifications on initial load
  let isInitialLoad = true;

  const messagesRef = collection(firestore, 'messages');
  const q = query(
    messagesRef,
    where('driverId', '==', driverId),
    where('senderRole', '==', 'parent') // Only parent messages
  );

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const message = { id: change.doc.id, ...change.doc.data() } as Message;

        // On initial load, mark existing messages as notified without showing notification
        if (isInitialLoad) {
          notifiedMessages.add(message.id);
          return;
        }

        // Only notify on new messages (added)
        if (change.type === 'added') {
          if (notifiedMessages.has(message.id)) {
            return;
          }

          // Mark as notified
          notifiedMessages.add(message.id);

          const notification: NewMessageNotification = {
            id: `message-${message.id}-${Date.now()}`,
            timestamp: Date.now(),
            category: NotificationCategory.MESSAGE,
            type: 'NEW_MESSAGE',
            title: 'New Message from Parent',
            message:
              message.text.length > 50 ? `${message.text.substring(0, 50)}...` : message.text,
            messageId: message.id,
            parentId: message.parentId,
            studentId: message.studentId,
          };

          console.log('[MessageNotificationService] New message notification:', notification);
          onNotification(notification);
        }
      });

      // After first snapshot, clear initial load flag
      if (isInitialLoad) {
        isInitialLoad = false;
        console.log('[MessageNotificationService] Initial load complete');
      }
    },
    (error) => {
      console.error('[MessageNotificationService] Error listening to messages:', error);
    }
  );
};
