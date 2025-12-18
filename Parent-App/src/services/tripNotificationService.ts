/**
 * Trip Notification Service
 *
 * Listens to Firestore trip changes and triggers notifications for trip-related events
 */

import { firestore } from '../config/firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  DocumentData,
} from 'firebase/firestore';
import {
  NotificationHandler,
  TripStartedNotification,
  NotificationCategory,
} from '../types/notificationTypes';
import { Trip } from '../types/types';

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Subscribe to trip status changes for multiple drivers
 * Monitors trips involving parent's children and notifies on status changes
 * Supports parents with children assigned to different drivers
 * Only shows notifications for today's trips (ongoing/newly created)
 *
 * @param driverIds - Array of unique driver IDs to monitor
 * @param childIds - Array of child IDs belonging to the parent
 * @param onNotification - Callback to handle notifications
 * @returns Unsubscribe function to stop listening
 */
export const subscribeTripStatusChanges = (
  driverIds: string[],
  childIds: string[],
  onNotification: NotificationHandler
): Unsubscribe => {
  if (driverIds.length === 0 || childIds.length === 0) {
    console.warn('[TripNotificationService] Invalid params, returning no-op unsubscribe');
    return () => {};
  }

  // Track which trips we've already notified about to prevent duplicates
  const notifiedTrips = new Set<string>();

  // Flag to suppress notifications on initial load (to avoid showing old in-progress trips)
  let isInitialLoad = true;

  const unsubscribers: Unsubscribe[] = [];

  // Create a separate listener for each unique driver
  driverIds.forEach((driverId) => {
    const tripsRef = collection(firestore, 'trips');
    const q = query(
      tripsRef,
      where('driverId', '==', driverId),
      where('status', '==', 'IN_PROGRESS')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const today = getTodayDateString();

        snapshot.docChanges().forEach((change) => {
          const trip = { id: change.doc.id, ...change.doc.data() } as Trip;

          // Only process trips from today (filter out old trips)
          if (trip.date !== today) {
            console.log('[TripNotificationService] Ignoring trip from different date:', trip.date);
            return;
          }

          // Check if any of parent's children are on this trip
          // children is an array of { childId, status } objects
          const affectedChildren =
            trip.children
              ?.map((child) => child.childId)
              .filter((childId) => childIds.includes(childId)) || [];

          if (affectedChildren.length === 0) {
            // Trip doesn't involve parent's children, ignore
            return;
          }

          // On initial load, just mark existing trips as notified without showing notification
          // This prevents showing notifications for trips that were already in progress
          if (isInitialLoad) {
            const tripKey = `${trip.id}-${trip.status}`;
            notifiedTrips.add(tripKey);
            console.log(
              '[TripNotificationService] Initial load - suppressing notification for existing trip:',
              trip.id
            );
            return;
          }

          // Only notify on new trips (added) or status changes (modified)
          // Prevent duplicate notifications for the same trip
          if (change.type === 'added' || change.type === 'modified') {
            const tripKey = `${trip.id}-${trip.status}`;

            if (notifiedTrips.has(tripKey)) {
              // Already notified about this trip status
              return;
            }

            // Mark as notified
            notifiedTrips.add(tripKey);

            // Detect trip start (status is IN_PROGRESS)
            if (trip.status === 'IN_PROGRESS') {
              const notification: TripStartedNotification = {
                id: `trip-started-${trip.id}-${Date.now()}`,
                timestamp: Date.now(),
                category: NotificationCategory.TRIP,
                type: 'TRIP_STARTED',
                title: 'Trip Started',
                message: `${trip.type === 'MORNING' ? 'Morning' : 'Afternoon'} trip is now in progress`,
                tripId: trip.id,
                tripType: trip.type,
                affectedChildIds: affectedChildren,
                driverId: trip.driverId,
              };

              console.log('[TripNotificationService] Trip started notification:', notification);
              onNotification(notification);
            }
          }
        });

        // After first snapshot, clear initial load flag
        // This allows notifications for any future changes
        if (isInitialLoad) {
          isInitialLoad = false;
          console.log(
            '[TripNotificationService] Initial load complete, now monitoring for new changes'
          );
        }
      },
      (error) => {
        console.error(
          `[TripNotificationService] Error listening to driver ${driverId} trips:`,
          error
        );
      }
    );

    unsubscribers.push(unsubscribe);
  });

  // Return combined unsubscribe function
  return () => {
    console.log('[TripNotificationService] Unsubscribing from all driver trip listeners');
    unsubscribers.forEach((unsub) => unsub());
  };
};
