/**
 * Route Service
 *
 * Service for fetching and subscribing to driver routes from Firestore
 */

import { collection, query, where, onSnapshot, Unsubscribe, getDocs } from 'firebase/firestore';
import { firestore } from '../config/firebaseConfig';
import { DriverRoute, RouteGeometry, RouteStatus } from '../types/route.types';

const ROUTES_COLLECTION = 'routes';

/**
 * Parse geometry JSON string to coordinate array
 * Geometry is stored as JSON string: "[[lng, lat], [lng, lat], ...]"
 */
export function parseRouteGeometry(geometryString: string | undefined): RouteGeometry | null {
  if (!geometryString) {
    return null;
  }

  try {
    // Parse the JSON string
    const coordinates: number[][] = JSON.parse(geometryString);

    // Convert from [lng, lat] to {latitude, longitude}
    return {
      coordinates: coordinates.map(([lng, lat]) => ({
        longitude: lng,
        latitude: lat,
      })),
    };
  } catch (error) {
    console.error('Error parsing route geometry:', error);
    return null;
  }
}

/**
 * Find active route for a student
 *
 * @param studentId - The student ID
 * @param tripType - Trip type (MORNING or AFTERNOON)
 * @returns Promise resolving to the active route or null
 */
export async function findActiveRouteForStudent(
  studentId: string,
  tripType: string
): Promise<DriverRoute | null> {
  try {
    const routesRef = collection(firestore, ROUTES_COLLECTION);

    // Query for active routes containing this student
    const q = query(
      routesRef,
      where('studentIds', 'array-contains', studentId),
      where('tripType', '==', tripType),
      where('status', '==', 'ACTIVE')
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`No active route found for student ${studentId}`);
      return null;
    }

    // Get the first matching route
    const routeDoc = querySnapshot.docs[0];
    return {
      id: routeDoc.id,
      ...routeDoc.data(),
    } as DriverRoute;
  } catch (error) {
    console.error('Error finding active route:', error);
    return null;
  }
}

/**
 * Subscribe to active route updates for a student
 *
 * @param studentId - The student ID
 * @param tripType - Trip type (MORNING or AFTERNOON)
 * @param callback - Callback function called when route updates
 * @returns Unsubscribe function
 */
export function subscribeToActiveRoute(
  studentId: string,
  tripType: string,
  callback: (route: DriverRoute | null) => void
): Unsubscribe {
  const routesRef = collection(firestore, ROUTES_COLLECTION);

  // Subscribe to ACTIVE or PENDING routes containing this student
  // This allows testing route display before trip starts
  const q = query(
    routesRef,
    where('studentIds', 'array-contains', studentId),
    where('tripType', '==', tripType),
    where('status', 'in', ['ACTIVE', 'PENDING'])
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        console.log(`No route (ACTIVE or PENDING) found for student ${studentId}`);
        callback(null);
        return;
      }

      // Get the first matching route
      const routeDoc = snapshot.docs[0];
      const route = {
        id: routeDoc.id,
        ...routeDoc.data(),
      } as DriverRoute;

      console.log(`Route found for student ${studentId}:`, route.id, `(${route.status})`);
      callback(route);
    },
    (error) => {
      console.error('Error in route subscription:', error);
      callback(null);
    }
  );
}

/**
 * Get route geometry as coordinates for map display
 *
 * @param route - The driver route
 * @returns Parsed route geometry or null
 */
export function getRouteGeometryForMap(route: DriverRoute | null): RouteGeometry | null {
  if (!route || !route.geometry) {
    return null;
  }

  return parseRouteGeometry(route.geometry);
}
