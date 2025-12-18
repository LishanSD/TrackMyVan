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

  // Flag to suppress notifications on initial load (unless recent)
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

        // --- Notification Trigger Logic ---
        const checkAndNotify = (
          type: 'MORNING_PICKUP' | 'SCHOOL_DROPOFF' | 'SCHOOL_PICKUP' | 'HOME_DROPOFF',
          current: PickupStatus,
          prev: PickupStatus | undefined
        ) => {
          // 1. Check if status is COMPLETED
          if (current.status !== 'COMPLETED') return;

          // 2. Check if it's a NEW completion (real-time) OR a RECENT completion (initial load)
          const isNewCompletion = prev?.status !== 'COMPLETED';
          
          let shouldNotify = false;

          if (isInitialLoad) {
            // On initial load, only notify if it happened in the last 15 minutes
            const now = Date.now();
            const fifteenMinutes = 15 * 60 * 1000;
            const eventTime = current.time || 0;

            if (eventTime > 0 && (now - eventTime) < fifteenMinutes) {
              console.log(`[ChildStatusNotificationService] Initial load - dispatching RECENT ${type} for child:`, childId);
              shouldNotify = true;
            }
          } else {
             // Real-time update: notify if it just changed to COMPLETED
             if (isNewCompletion) {
               console.log(`[ChildStatusNotificationService] Real-time update - dispatching ${type} for child:`, childId);
               shouldNotify = true;
             }
          }

          if (!shouldNotify) return;

          // Dispatch specific notification based on type
          if (type === 'MORNING_PICKUP') {
             const notification: ChildPickedUpNotification = {
              id: `pickup-morning-${childId}-${current.time || Date.now()}`,
              timestamp: current.time || Date.now(),
              category: NotificationCategory.PICKUP,
              type: 'CHILD_PICKED_UP',
              title: 'Child Picked Up',
              message: `${childNames.get(childId) || 'Your child'} has been picked up`,
              childId,
              childName: childNames.get(childId),
              location: current.location,
              pickupType: 'MORNING',
            };
            onNotification(notification);
          } 
          else if (type === 'SCHOOL_DROPOFF') {
             const notification: ChildDroppedOffNotification = {
              id: `dropoff-school-${childId}-${current.time || Date.now()}`,
              timestamp: current.time || Date.now(),
              category: NotificationCategory.DROPOFF,
              type: 'CHILD_DROPPED_OFF',
              title: 'Child Dropped Off',
              message: `${childNames.get(childId) || 'Your child'} has been dropped off at school`,
              childId,
              childName: childNames.get(childId),
              location: current.location,
              dropoffType: 'SCHOOL',
            };
            onNotification(notification);
          }
          else if (type === 'SCHOOL_PICKUP') {
             const notification: ChildPickedUpNotification = {
              id: `pickup-afternoon-${childId}-${current.time || Date.now()}`,
              timestamp: current.time || Date.now(),
              category: NotificationCategory.PICKUP,
              type: 'CHILD_PICKED_UP',
              title: 'Child Picked Up',
              message: `${childNames.get(childId) || 'Your child'} has been picked up from school`,
              childId,
              childName: childNames.get(childId),
              location: current.location,
              pickupType: 'AFTERNOON',
            };
            onNotification(notification);
          }
          else if (type === 'HOME_DROPOFF') {
             const notification: ChildDroppedOffNotification = {
              id: `dropoff-home-${childId}-${current.time || Date.now()}`,
              timestamp: current.time || Date.now(),
              category: NotificationCategory.DROPOFF,
              type: 'CHILD_DROPPED_OFF',
              title: 'Child Dropped Off',
              message: `${childNames.get(childId) || 'Your child'} has been dropped off at home`,
              childId,
              childName: childNames.get(childId),
              location: current.location,
              dropoffType: 'HOME',
            };
            onNotification(notification);
          }
        };

        // Check all 4 status types
        checkAndNotify('MORNING_PICKUP', currentStatus.morningPickup, previousStatus?.morningPickup);
        checkAndNotify('SCHOOL_DROPOFF', currentStatus.schoolDropoff, previousStatus?.schoolDropoff);
        checkAndNotify('SCHOOL_PICKUP', currentStatus.schoolPickup, previousStatus?.schoolPickup);
        checkAndNotify('HOME_DROPOFF', currentStatus.homeDropoff, previousStatus?.homeDropoff);

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
