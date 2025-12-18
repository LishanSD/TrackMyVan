/**
 * Location Service
 *
 * Provides access to device location using expo-location
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { database } from '../config/firebaseConfig';
import { ref, set } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme/theme';

export const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
}

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location Task Error:', error.message);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const latestLocation = locations[0];
    const driverId = await AsyncStorage.getItem('driverId');

    if (!driverId) {
      // Driver ID might be null if logged out, stop updates to save battery
      console.log('Driver ID not found in background task. Stopping updates.');
      try {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      } catch (e) {
        // Ignore error if already stopped
      }
      return;
    }

    try {
      const vanLocationRef = ref(database, `locations/${driverId}`);
      const locationData = {
        lat: latestLocation.coords.latitude,
        lng: latestLocation.coords.longitude,
        speed: latestLocation.coords.speed || 0,
        bearing: latestLocation.coords.heading || 0,
        timestamp: Date.now(), // Use server time ideally, but Date.now() is okay for heartbeat
      };
      await set(vanLocationRef, locationData);
    } catch (e) {
      console.error('Error sending location to Realtime DB:', e);
    }
  }
});

/**
 * Request location permissions from the user
 * @returns True if permission granted, false otherwise
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return false;

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    return bgStatus === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

/**
 * Check if location permissions are granted
 * @returns True if permission granted, false otherwise
 */
export async function checkLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
}

/**
 * Get the current device location
 * @param requestPermissionIfNeeded - If true, request permission if not already granted
 * @returns Current location coordinates or null if permission denied or error
 */
export async function getCurrentLocation(
  requestPermissionIfNeeded = true
): Promise<LocationCoords | null> {
  try {
    // Check if permission is granted
    let hasPermission = await checkLocationPermission();

    // Request permission if needed
    if (!hasPermission && requestPermissionIfNeeded) {
      hasPermission = await requestLocationPermission();
    }

    if (!hasPermission) {
      console.warn('Location permission not granted');
      return null;
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

/**
 * Watch user's location with continuous updates (Foreground)
 * @param callback - Function to call with location updates
 * @returns Subscription object to remove the listener
 */
export async function watchLocation(
  callback: (location: LocationCoords) => void
): Promise<{ remove: () => void } | null> {
  try {
    const hasPermission = await checkLocationPermission();

    if (!hasPermission) {
      console.warn('Location permission not granted for watching location');
      return null;
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High, // Balanced for UI
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed || 0,
          heading: location.coords.heading || 0,
        });
      }
    );

    return subscription;
  } catch (error) {
    console.error('Error watching location:', error);
    return null;
  }
}

/**
 * Start background location tracking
 */
export async function startBackgroundLocation(): Promise<void> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Location permission not granted');
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 10,
      timeInterval: 5000,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: true, // Battery optimization
      activityType: Location.ActivityType.AutomotiveNavigation, // iOS optimization
      foregroundService: {
        notificationTitle: 'Van Tracking Active',
        notificationBody: 'Your location is being shared with parents.',
        notificationColor: theme.colors.primary,
      },
    });
  } catch (error) {
    console.error('Error starting background location:', error);
    throw error;
  }
}

/**
 * Stop background location tracking
 */
export async function stopBackgroundLocation(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch (error) {
    console.error('Error stopping background location:', error);
  }
}

/**
 * Check if background location tracking is active
 */
export async function isBackgroundLocationActive(): Promise<boolean> {
  return await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
}
