/**
 * Child Status Notification Service
 *
 * Listens to Firestore childStatus changes and triggers notifications for pickup/dropoff events
 */

import { firestore } from '../config/firebaseConfig';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import {
  NotificationHandler,
  ChildPickedUpNotification,
  ChildDroppedOffNotification,
  NotificationCategory,
} from '../types/notificationTypes';
import { ChildStatus, PickupStatus } from '../types/types';

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Convert Firestore timestamp to milliseconds
 */
const toMillis = (
  value?: number | { seconds: number; nanoseconds?: number } | any
): number | undefined => {
  if (!value) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'seconds' in value) {
    return value.seconds * 1000 + (value.nanoseconds ?? 0) / 1_000_000;
  }
  return undefined;
};

/**
 * Convert PickupStatus timestamps from Firestore format to number
 */
const convertPickupStatus = (status: any): PickupStatus => {
  if (!status) return { status: 'PENDING' };
  return {
    status: status.status || 'PENDING',
    time: toMillis(status.time),
    location: status.location,
  };
};

/**
 * Subscribe to child status changes for multiple children
 * Monitors pickup and dropoff events for today only
 * Suppresses notifications on initial load to avoid showing old events
 *
 * @param childIds - Array of child IDs to monitor
 * @param childNames - Map of childId to child name for notification messages
 * @param onNotification - Callback to handle notifications
 * @returns Unsubscribe function to stop all listeners
 */
export const subscribeChildStatusChanges = (
  childIds: string[],
  childNames: Map<string, string>,
  onNotification: NotificationHandler
): Unsubscribe => {
  if (childIds.length === 0) {
    console.warn('[ChildStatusNotificationService] No children to monitor');
    return () => {};
  }

  const today = getTodayDateString();
  const unsubscribers: Unsubscribe[] = [];

  // Track previous status for each child to detect changes
  const statusCache = new Map<string, ChildStatus>();

  // Flag to suppress notifications on initial load
  let isInitialLoad = true;

  childIds.forEach((childId) => {
    const childStatusRef = doc(firestore, 'childStatus', childId, 'dates', today);

    const unsubscribe = onSnapshot(
      childStatusRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }

        const data = snapshot.data();
        const currentStatus: ChildStatus = {
          childId,
          date: today,
          currentStatus: data.currentStatus || 'AT_HOME',
          morningPickup: convertPickupStatus(data.morningPickup),
          schoolDropoff: convertPickupStatus(data.schoolDropoff),
          schoolPickup: convertPickupStatus(data.schoolPickup),
          homeDropoff: convertPickupStatus(data.homeDropoff),
        };

        const previousStatus = statusCache.get(childId);

        // Update cache
        statusCache.set(childId, currentStatus);

        // On initial load, just cache the status without notifying
        if (isInitialLoad) {
          console.log(
            '[ChildStatusNotificationService] Initial load - caching status for child:',
            childId
          );
          return;
        }

        // --- Morning Trip Notifications ---
        
        // 1. Morning Pickup
        if (
          currentStatus.morningPickup.status === 'COMPLETED' &&
          previousStatus?.morningPickup.status !== 'COMPLETED'
        ) {
          const notification: ChildPickedUpNotification = {
            id: `pickup-morning-${childId}-${Date.now()}`,
            timestamp: Date.now(),
            category: NotificationCategory.PICKUP,
            type: 'CHILD_PICKED_UP',
            title: 'Child Picked Up',
            message: `${childNames.get(childId) || 'Your child'} has been picked up`,
            childId,
            childName: childNames.get(childId),
            location: currentStatus.morningPickup.location,
            pickupType: 'MORNING',
          };

          console.log(
            '[ChildStatusNotificationService] Morning pickup notification:',
            notification
          );
          onNotification(notification);
        }

        // 2. School Dropoff (Morning Trip End)
        // Ensure we check specifically for the transition to COMPLETED
        if (
          currentStatus.schoolDropoff.status === 'COMPLETED' &&
          previousStatus?.schoolDropoff.status !== 'COMPLETED'
        ) {
          const notification: ChildDroppedOffNotification = {
            id: `dropoff-school-${childId}-${Date.now()}`,
            timestamp: Date.now(),
            category: NotificationCategory.DROPOFF,
            type: 'CHILD_DROPPED_OFF',
            title: 'Child Dropped Off',
            message: `${childNames.get(childId) || 'Your child'} has been dropped off at school`,
            childId,
            childName: childNames.get(childId),
            location: currentStatus.schoolDropoff.location,
            dropoffType: 'SCHOOL',
          };

          console.log(
            '[ChildStatusNotificationService] School dropoff notification TRIGGERED:',
            notification
          );
          onNotification(notification);
        }

        // --- Afternoon Trip Notifications ---

        // 3. School Pickup (Afternoon Trip Start)
        if (
          currentStatus.schoolPickup.status === 'COMPLETED' &&
          previousStatus?.schoolPickup.status !== 'COMPLETED'
        ) {
          const notification: ChildPickedUpNotification = {
            id: `pickup-afternoon-${childId}-${Date.now()}`,
            timestamp: Date.now(),
            category: NotificationCategory.PICKUP,
            type: 'CHILD_PICKED_UP',
            title: 'Child Picked Up',
            message: `${childNames.get(childId) || 'Your child'} has been picked up from school`,
            childId,
            childName: childNames.get(childId),
            location: currentStatus.schoolPickup.location,
            pickupType: 'AFTERNOON',
          };

          console.log(
            '[ChildStatusNotificationService] Afternoon pickup notification:',
            notification
          );
          onNotification(notification);
        }

        // 4. Home Dropoff (Afternoon Trip End)
        if (
          currentStatus.homeDropoff.status === 'COMPLETED' &&
          previousStatus?.homeDropoff.status !== 'COMPLETED'
        ) {
          const notification: ChildDroppedOffNotification = {
            id: `dropoff-home-${childId}-${Date.now()}`,
            timestamp: Date.now(),
            category: NotificationCategory.DROPOFF,
            type: 'CHILD_DROPPED_OFF',
            title: 'Child Dropped Off',
            message: `${childNames.get(childId) || 'Your child'} has been dropped off at home`,
            childId,
            childName: childNames.get(childId),
            location: currentStatus.homeDropoff.location,
            dropoffType: 'HOME',
          };

          console.log('[ChildStatusNotificationService] Home dropoff notification:', notification);
          onNotification(notification);
        }
      },
      (error) => {
        console.error(
          `[ChildStatusNotificationService] Error listening to child ${childId}:`,
          error
        );
      }
    );

    unsubscribers.push(unsubscribe);
  });

  // After a short delay, clear the initial load flag for all listeners
  setTimeout(() => {
    isInitialLoad = false;
    console.log(
      '[ChildStatusNotificationService] Initial load complete, now monitoring for new changes'
    );
  }, 1000);

  // Return combined unsubscribe function
  return () => {
    console.log('[ChildStatusNotificationService] Unsubscribing from all child status listeners');
    unsubscribers.forEach((unsub) => unsub());
  };
};
