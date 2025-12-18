/**
 * Route Type Definitions for Parent App
 *
 * Types for displaying driver routes on the tracking map
 */

export type RouteStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type TripType = 'MORNING' | 'AFTERNOON';

/**
 * Waypoint in a route
 */
export interface Waypoint {
  id: string;
  type: 'HOME' | 'SCHOOL' | 'DEPOT';
  location: {
    latitude: number;
    longitude: number;
  };
  studentId?: string;
  studentName?: string;
  estimatedArrivalTime?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  sequenceOrder: number;
}

/**
 * Driver route from Firestore
 */
export interface DriverRoute {
  id: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  tripType: TripType;
  waypoints: Waypoint[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  estimatedStartTime?: number;
  estimatedEndTime?: number;
  currentWaypointIndex: number;
  status: RouteStatus;
  createdAt: number;
  updatedAt: number;
  geometry?: string; // JSON string of [[lng, lat], [lng, lat], ...]
  studentIds: string[];
}

/**
 * Parsed route geometry for map display
 */
export interface RouteGeometry {
  coordinates: Array<{
    latitude: number;
    longitude: number;
  }>;
}
