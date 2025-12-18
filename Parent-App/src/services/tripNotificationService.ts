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
  TripEndedNotification,
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
 * Helper to get milliseconds from Firestore timestamp or number
 */
const getMillis = (timestamp: any): number => {
  if (!timestamp) return 0;
  if (typeof timestamp === 'number') return timestamp;
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
  }
  return 0;
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
  // Format: "tripId-status"
  const notifiedTrips = new Set<string>();

  // Flag to suppress notifications on initial load (unless recent)
  let isInitialLoad = true;

  const unsubscribers: Unsubscribe[] = [];

  // Create a separate listener for each unique driver
  driverIds.forEach((driverId) => {
    const tripsRef = collection(firestore, 'trips');
    const today = getTodayDateString();
    
    // Listen to ALL of today's trips for this driver
    // We removed "status == IN_PROGRESS" so we can catch "COMPLETED" events too
    const q = query(
      tripsRef,
      where('driverId', '==', driverId),
      where('date', '==', today)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const trip = { id: change.doc.id, ...change.doc.data() } as Trip;

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

          const tripKey = `${trip.id}-${trip.status}`;

          // --- notification logic ---
          const shouldNotify = () => {
             // 1. If already notified, skip
             if (notifiedTrips.has(tripKey)) return false;

             // 2. If it's a new or modified document
             if (change.type === 'added' || change.type === 'modified') {
                
                // 3. Special handling for Initial Load
                if (isInitialLoad) {
                  // Only notify if event happened recently (e.g., last 15 mins)
                  const now = Date.now();
                  const fifteenMinutes = 15 * 60 * 1000;
                  
                  let eventTime = 0;
                  if (trip.status === 'IN_PROGRESS') {
                     eventTime = getMillis(trip.startTime); 
                  } else if (trip.status === 'COMPLETED') {
                     eventTime = getMillis(trip.endTime); 
                  }

                  if (eventTime > 0 && (now - eventTime) < fifteenMinutes) {
                     console.log('[TripNotificationService] Initial load - dispatching RECENT event:', trip.id);
                     return true;
                  }
                  
                  // Otherwise suppress old events on load
                  console.log('[TripNotificationService] Initial load - suppressing old event:', trip.id);
                  notifiedTrips.add(tripKey); // Mark as handled so we don't notify later
                  return false;
                }
                
                // 4. Normal operation (real-time updates)
                return true;
             }
             return false;
          };

          if (shouldNotify()) {
            // Mark as notified immediately
            notifiedTrips.add(tripKey);

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
            else if (trip.status === 'COMPLETED') {
               const notification: TripEndedNotification = {
                id: `trip-ended-${trip.id}-${Date.now()}`,
                timestamp: Date.now(),
                category: NotificationCategory.TRIP,
                type: 'TRIP_ENDED',
                title: 'Trip Ended',
                message: `${trip.type === 'MORNING' ? 'Morning' : 'Afternoon'} trip has ended`,
                tripId: trip.id,
                tripType: trip.type,
                driverId: trip.driverId,
              };
              console.log('[TripNotificationService] Trip ended notification:', notification);
              onNotification(notification);
            }
          }
        });

        // After first snapshot, clear initial load flag
        if (isInitialLoad) {
          isInitialLoad = false;
          console.log('[TripNotificationService] Initial load complete');
        }
      },
      (error) => {
        console.error(`[TripNotificationService] Error listening to driver ${driverId} trips:`, error);
      }
    );

    unsubscribers.push(unsubscribe);
  });

  return () => {
    console.log('[TripNotificationService] Unsubscribing from all driver trip listeners');
    unsubscribers.forEach((unsub) => unsub());
  };
};
