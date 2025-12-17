import { database } from '../config/firebaseConfig';
import { ref, onValue, off, DatabaseReference } from 'firebase/database';
import { DriverLocation } from '../types/types';

// Store active subscriptions to manage cleanup
const activeSubscriptions = new Map<string, DatabaseReference>();

/**
 * Subscribe to real-time location updates for a specific driver
 * @param driverId - The unique identifier for the driver
 * @param callback - Function to call when location updates
 * @param onError - Optional error handler
 * @returns Unsubscribe function
 */
export const subscribeToDriverLocation = (
  driverId: string,
  callback: (location: DriverLocation | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!driverId) {
    console.warn('subscribeToDriverLocation called with empty driverId');
    callback(null);
    return () => {};
  }

  // Create reference to driver's location in Realtime Database
  const locationRef = ref(database, `locations/${driverId}`);

  // Store the reference for cleanup
  activeSubscriptions.set(driverId, locationRef);

  // Set up real-time listener
  const listener = onValue(
    locationRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as DriverLocation;

        // Validate the data structure
        if (
          typeof data.lat === 'number' &&
          typeof data.lng === 'number' &&
          typeof data.bearing === 'number' &&
          typeof data.timestamp === 'number'
        ) {
          callback(data);
        } else {
          console.warn('Invalid driver location data structure:', data);
          callback(null);
        }
      } else {
        // Location not found or not yet available
        callback(null);
      }
    },
    (error) => {
      console.error('Error subscribing to driver location:', error);
      if (onError) {
        onError(new Error(`Failed to subscribe to driver location: ${error.message}`));
      }
      callback(null);
    }
  );

  // Return unsubscribe function
  return () => {
    off(locationRef);
    activeSubscriptions.delete(driverId);
  };
};

/**
 * Manually unsubscribe from a driver's location updates
 * @param driverId - The unique identifier for the driver
 */
export const unsubscribeFromDriverLocation = (driverId: string): void => {
  const locationRef = activeSubscriptions.get(driverId);

  if (locationRef) {
    off(locationRef);
    activeSubscriptions.delete(driverId);
  }
};

/**
 * Unsubscribe from all active location subscriptions
 * Useful for cleanup when component unmounts or app closes
 */
export const unsubscribeAll = (): void => {
  activeSubscriptions.forEach((ref) => {
    off(ref);
  });
  activeSubscriptions.clear();
};

/**
 * Get the number of active location subscriptions
 * Useful for debugging
 */
export const getActiveSubscriptionCount = (): number => {
  return activeSubscriptions.size;
};
