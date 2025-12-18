/**
 * Location Service
 *
 * Provides access to device location using expo-location
 */

import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

/**
 * Request location permissions from the user
 * @returns True if permission granted, false otherwise
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
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
 * Watch user's location with continuous updates
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
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Update every 10 meters
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    );

    return subscription;
  } catch (error) {
    console.error('Error watching location:', error);
    return null;
  }
}
