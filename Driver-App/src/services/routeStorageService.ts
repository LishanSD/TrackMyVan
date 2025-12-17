/**
 * Route Storage Service
 *
 * Firebase Firestore service for persisting and managing optimized routes
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  QueryConstraint,
  Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '../config/firebaseConfig';
import {
  OptimizedRoute,
  RouteDocument,
  RouteQuery,
  RouteStatus,
  TripType,
  Waypoint,
} from '../types/route.types';

// ============================================================================
// Constants
// ============================================================================

const ROUTES_COLLECTION = 'routes';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert OptimizedRoute to RouteDocument for Firestore
 */
function routeToDocument(route: OptimizedRoute): RouteDocument {
  const doc: any = {
    id: route.id,
    driverId: route.driverId,
    date: route.date,
    tripType: route.tripType,
    waypoints: route.waypoints,
    totalDistance: route.totalDistance,
    totalDuration: route.totalDuration,
    currentWaypointIndex: route.currentWaypointIndex,
    status: route.status,
    createdAt: route.createdAt,
    updatedAt: route.updatedAt,
    // Convert geometry to JSON string to avoid nested array limitation in Firestore
    geometry: route.geometry ? JSON.stringify(route.geometry) : undefined,
    studentIds: route.waypoints.filter((w) => w.studentId).map((w) => w.studentId as string),
  };

  // Only include optional timestamp fields if they are defined
  if (route.estimatedStartTime !== undefined) {
    doc.estimatedStartTime = route.estimatedStartTime;
  }
  if (route.estimatedEndTime !== undefined) {
    doc.estimatedEndTime = route.estimatedEndTime;
  }
  if (route.actualStartTime !== undefined) {
    doc.actualStartTime = route.actualStartTime;
  }
  if (route.actualEndTime !== undefined) {
    doc.actualEndTime = route.actualEndTime;
  }

  return doc as RouteDocument;
}

/**
 * Convert RouteDocument to OptimizedRoute
 */
function documentToRoute(doc: RouteDocument): OptimizedRoute {
  return {
    id: doc.id,
    driverId: doc.driverId,
    date: doc.date,
    tripType: doc.tripType,
    waypoints: doc.waypoints,
    segments: [], // Segments not stored, will be recalculated if needed
    totalDistance: doc.totalDistance,
    totalDuration: doc.totalDuration,
    estimatedStartTime: doc.estimatedStartTime,
    estimatedEndTime: doc.estimatedEndTime,
    actualStartTime: doc.actualStartTime,
    actualEndTime: doc.actualEndTime,
    currentWaypointIndex: doc.currentWaypointIndex,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    // Parse geometry from JSON string back to array
    geometry: doc.geometry
      ? typeof doc.geometry === 'string'
        ? JSON.parse(doc.geometry)
        : doc.geometry
      : undefined,
  };
}

// ============================================================================
// Route Storage Functions
// ============================================================================

/**
 * Save an optimized route to Firestore
 *
 * @param route - The optimized route to save
 * @returns Promise resolving to the saved route ID
 */
export async function saveOptimizedRoute(route: OptimizedRoute): Promise<string> {
  try {
    const routeDoc = routeToDocument(route);
    const routeRef = doc(firestore, ROUTES_COLLECTION, route.id);

    console.log('[DEBUG] Route document to save:', JSON.stringify(routeDoc, null, 2));

    await setDoc(routeRef, routeDoc);
    console.log(`Route ${route.id} saved successfully`);

    return route.id;
  } catch (error) {
    console.error('Error saving route:', error);
    throw new Error(`Failed to save route: ${error}`);
  }
}

/**
 * Get a stored route by ID
 *
 * @param routeId - The route ID
 * @returns Promise resolving to the route or null if not found
 */
export async function getStoredRoute(routeId: string): Promise<OptimizedRoute | null> {
  try {
    const routeRef = doc(firestore, ROUTES_COLLECTION, routeId);
    const routeSnap = await getDoc(routeRef);

    if (!routeSnap.exists()) {
      console.log(`Route ${routeId} not found`);
      return null;
    }

    const routeDoc = routeSnap.data() as RouteDocument;
    return documentToRoute(routeDoc);
  } catch (error) {
    console.error('Error getting route:', error);
    throw new Error(`Failed to get route: ${error}`);
  }
}

/**
 * Find a route for a specific driver, date, and trip type
 *
 * @param driverId - The driver ID
 * @param date - The date (YYYY-MM-DD)
 * @param tripType - The trip type (MORNING or AFTERNOON)
 * @returns Promise resolving to the route or null if not found
 */
export async function findRoute(
  driverId: string,
  date: string,
  tripType: TripType
): Promise<OptimizedRoute | null> {
  try {
    const routesRef = collection(firestore, ROUTES_COLLECTION);
    const q = query(
      routesRef,
      where('driverId', '==', driverId),
      where('date', '==', date),
      where('tripType', '==', tripType),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const routeDoc = querySnapshot.docs[0].data() as RouteDocument;
    return documentToRoute(routeDoc);
  } catch (error) {
    console.error('Error finding route:', error);
    throw new Error(`Failed to find route: ${error}`);
  }
}

/**
 * Query routes with filters
 *
 * @param routeQuery - Query parameters
 * @param maxResults - Maximum number of results (default: 50)
 * @returns Promise resolving to array of routes
 */
export async function queryRoutes(
  routeQuery: RouteQuery,
  maxResults = 50
): Promise<OptimizedRoute[]> {
  try {
    const routesRef = collection(firestore, ROUTES_COLLECTION);
    const constraints: QueryConstraint[] = [];

    if (routeQuery.driverId) {
      constraints.push(where('driverId', '==', routeQuery.driverId));
    }

    if (routeQuery.date) {
      constraints.push(where('date', '==', routeQuery.date));
    }

    if (routeQuery.tripType) {
      constraints.push(where('tripType', '==', routeQuery.tripType));
    }

    if (routeQuery.status) {
      constraints.push(where('status', '==', routeQuery.status));
    }

    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(maxResults));

    const q = query(routesRef, ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => documentToRoute(doc.data() as RouteDocument));
  } catch (error) {
    console.error('Error querying routes:', error);
    throw new Error(`Failed to query routes: ${error}`);
  }
}

/**
 * Update route progress (current waypoint index)
 *
 * @param routeId - The route ID
 * @param currentWaypointIndex - The current waypoint index
 * @returns Promise resolving when update is complete
 */
export async function updateRouteProgress(
  routeId: string,
  currentWaypointIndex: number
): Promise<void> {
  try {
    const routeRef = doc(firestore, ROUTES_COLLECTION, routeId);

    await updateDoc(routeRef, {
      currentWaypointIndex,
      updatedAt: Date.now(),
    });

    console.log(`Route ${routeId} progress updated to waypoint ${currentWaypointIndex}`);
  } catch (error) {
    console.error('Error updating route progress:', error);
    throw new Error(`Failed to update route progress: ${error}`);
  }
}

/**
 * Update route status
 *
 * @param routeId - The route ID
 * @param status - The new status
 * @param additionalData - Optional additional data to update
 * @returns Promise resolving when update is complete
 */
export async function updateRouteStatus(
  routeId: string,
  status: RouteStatus,
  additionalData?: {
    actualStartTime?: number;
    actualEndTime?: number;
  }
): Promise<void> {
  try {
    const routeRef = doc(firestore, ROUTES_COLLECTION, routeId);

    const updateData: any = {
      status,
      updatedAt: Date.now(),
    };

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    await updateDoc(routeRef, updateData);

    console.log(`Route ${routeId} status updated to ${status}`);
  } catch (error) {
    console.error('Error updating route status:', error);
    throw new Error(`Failed to update route status: ${error}`);
  }
}

/**
 * Update waypoint status
 *
 * @param routeId - The route ID
 * @param waypointIndex - The waypoint index
 * @param status - The new waypoint status
 * @param arrivalTime - Optional arrival time
 * @returns Promise resolving when update is complete
 */
export async function updateWaypointStatus(
  routeId: string,
  waypointIndex: number,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED',
  arrivalTime?: number
): Promise<void> {
  try {
    const route = await getStoredRoute(routeId);
    if (!route) {
      throw new Error(`Route ${routeId} not found`);
    }

    if (waypointIndex < 0 || waypointIndex >= route.waypoints.length) {
      throw new Error(`Invalid waypoint index ${waypointIndex}`);
    }

    const updatedWaypoints = [...route.waypoints];
    updatedWaypoints[waypointIndex] = {
      ...updatedWaypoints[waypointIndex],
      status,
      actualArrivalTime: arrivalTime || updatedWaypoints[waypointIndex].actualArrivalTime,
    };

    const routeRef = doc(firestore, ROUTES_COLLECTION, routeId);
    await updateDoc(routeRef, {
      waypoints: updatedWaypoints,
      updatedAt: Date.now(),
    });

    console.log(`Waypoint ${waypointIndex} in route ${routeId} updated to ${status}`);
  } catch (error) {
    console.error('Error updating waypoint status:', error);
    throw new Error(`Failed to update waypoint status: ${error}`);
  }
}

/**
 * Delete a route
 *
 * @param routeId - The route ID
 * @returns Promise resolving when deletion is complete
 */
export async function deleteRoute(routeId: string): Promise<void> {
  try {
    const routeRef = doc(firestore, ROUTES_COLLECTION, routeId);
    await deleteDoc(routeRef);

    console.log(`Route ${routeId} deleted successfully`);
  } catch (error) {
    console.error('Error deleting route:', error);
    throw new Error(`Failed to delete route: ${error}`);
  }
}

/**
 * Subscribe to real-time updates for a route
 *
 * @param routeId - The route ID
 * @param callback - Callback function called when route updates
 * @returns Unsubscribe function
 */
export function subscribeToRouteUpdates(
  routeId: string,
  callback: (route: OptimizedRoute | null) => void
): Unsubscribe {
  const routeRef = doc(firestore, ROUTES_COLLECTION, routeId);

  return onSnapshot(
    routeRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const routeDoc = snapshot.data() as RouteDocument;
        callback(documentToRoute(routeDoc));
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error in route subscription:', error);
      callback(null);
    }
  );
}

/**
 * Subscribe to real-time updates for routes matching a query
 *
 * @param routeQuery - Query parameters
 * @param callback - Callback function called when routes update
 * @param maxResults - Maximum number of results (default: 50)
 * @returns Unsubscribe function
 */
export function subscribeToRoutes(
  routeQuery: RouteQuery,
  callback: (routes: OptimizedRoute[]) => void,
  maxResults = 50
): Unsubscribe {
  const routesRef = collection(firestore, ROUTES_COLLECTION);
  const constraints: QueryConstraint[] = [];

  if (routeQuery.driverId) {
    constraints.push(where('driverId', '==', routeQuery.driverId));
  }

  if (routeQuery.date) {
    constraints.push(where('date', '==', routeQuery.date));
  }

  if (routeQuery.tripType) {
    constraints.push(where('tripType', '==', routeQuery.tripType));
  }

  if (routeQuery.status) {
    constraints.push(where('status', '==', routeQuery.status));
  }

  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(maxResults));

  const q = query(routesRef, ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const routes = snapshot.docs.map((doc) => documentToRoute(doc.data() as RouteDocument));
      callback(routes);
    },
    (error) => {
      console.error('Error in routes subscription:', error);
      callback([]);
    }
  );
}

/**
 * Delete old routes (cleanup)
 *
 * @param beforeDate - Delete routes before this date (YYYY-MM-DD)
 * @param driverId - Optional driver ID to filter
 * @returns Promise resolving to number of deleted routes
 */
export async function deleteOldRoutes(beforeDate: string, driverId?: string): Promise<number> {
  try {
    const routesRef = collection(firestore, ROUTES_COLLECTION);
    const constraints: QueryConstraint[] = [where('date', '<', beforeDate)];

    if (driverId) {
      constraints.push(where('driverId', '==', driverId));
    }

    const q = query(routesRef, ...constraints);
    const querySnapshot = await getDocs(q);

    const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log(`Deleted ${querySnapshot.size} old routes before ${beforeDate}`);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error deleting old routes:', error);
    throw new Error(`Failed to delete old routes: ${error}`);
  }
}
