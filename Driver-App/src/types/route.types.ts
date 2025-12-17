/**
 * Route Optimization Type Definitions
 *
 * This file contains all TypeScript types for the route optimization service
 * using OpenRouteService (ORS) API.
 */

import { Location } from './common.types';

// ============================================================================
// Waypoint Types
// ============================================================================

/**
 * Type of waypoint in the route
 */
export type WaypointType = 'HOME' | 'SCHOOL' | 'DEPOT';

/**
 * Individual waypoint in a route
 */
export interface Waypoint {
  id: string;
  type: WaypointType;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  studentId?: string; // For HOME and SCHOOL waypoints
  studentName?: string;
  estimatedArrivalTime?: number; // Unix timestamp
  actualArrivalTime?: number; // Unix timestamp (when completed)
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  sequenceOrder: number; // Order in the optimized route
  notes?: string;
}

// ============================================================================
// Distance Matrix Types
// ============================================================================

/**
 * Distance and duration between two points
 */
export interface DistanceDuration {
  distance: number; // meters
  duration: number; // seconds
}

/**
 * Matrix of distances/durations between all waypoints
 */
export interface DistanceMatrix {
  distances: number[][]; // 2D array, distances[i][j] = distance from i to j (meters)
  durations: number[][]; // 2D array, durations[i][j] = duration from i to j (seconds)
  sources: number; // Number of source locations
  destinations: number; // Number of destination locations
}

// ============================================================================
// Route Types
// ============================================================================

/**
 * Trip type (morning or afternoon)
 */
export type TripType = 'MORNING' | 'AFTERNOON';

/**
 * Status of an optimized route
 */
export type RouteStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

/**
 * Individual segment of a route (between two waypoints)
 */
export interface RouteSegment {
  fromWaypoint: Waypoint;
  toWaypoint: Waypoint;
  distance: number; // meters
  duration: number; // seconds
  geometry?: number[][]; // Array of [longitude, latitude] for polyline
  instructions?: string[]; // Turn-by-turn instructions
}

/**
 * Complete optimized route
 */
export interface OptimizedRoute {
  id: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  tripType: TripType;
  waypoints: Waypoint[];
  segments: RouteSegment[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  estimatedStartTime?: number; // Unix timestamp
  estimatedEndTime?: number; // Unix timestamp
  actualStartTime?: number; // Unix timestamp
  actualEndTime?: number; // Unix timestamp
  currentWaypointIndex: number;
  status: RouteStatus;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  geometry?: number[][]; // Full route polyline [longitude, latitude][]
}

// ============================================================================
// ORS API Request/Response Types
// ============================================================================

/**
 * ORS Matrix API Request
 */
export interface ORSMatrixRequest {
  locations: number[][]; // Array of [longitude, latitude]
  profile?: 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking';
  metrics?: ('distance' | 'duration')[];
  sources?: number[]; // Indices of source locations
  destinations?: number[]; // Indices of destination locations
}

/**
 * ORS Matrix API Response
 */
export interface ORSMatrixResponse {
  distances?: number[][];
  durations?: number[][];
  sources: Array<{
    location: number[];
    snapped_distance?: number;
  }>;
  destinations: Array<{
    location: number[];
    snapped_distance?: number;
  }>;
  metadata: {
    service: string;
    timestamp: number;
    query: {
      profile: string;
      locations: number[][];
    };
    engine: {
      version: string;
      build_date: string;
    };
  };
}

/**
 * ORS Optimization API - Vehicle definition
 */
export interface ORSVehicle {
  id: number;
  profile: 'driving-car' | 'driving-hgv';
  start?: number[]; // [longitude, latitude]
  end?: number[]; // [longitude, latitude]
  capacity?: number[];
  skills?: number[];
  time_window?: [number, number]; // [start, end] in seconds
}

/**
 * ORS Optimization API - Job definition (pickup or delivery)
 */
export interface ORSJob {
  id: number;
  service?: number; // Service duration in seconds
  delivery?: number[]; // Delivery quantities
  pickup?: number[]; // Pickup quantities
  skills?: number[];
  priority?: number;
  location: number[]; // [longitude, latitude]
  time_windows?: Array<[number, number]>; // Multiple time windows
}

/**
 * ORS Optimization API Request
 */
export interface ORSOptimizationRequest {
  jobs: ORSJob[];
  vehicles: ORSVehicle[];
  options?: {
    g?: boolean; // Include geometry
  };
}

/**
 * ORS Optimization API - Step in a route
 */
export interface ORSOptimizationStep {
  type: 'start' | 'job' | 'end';
  job?: number;
  location: number[]; // [longitude, latitude]
  arrival: number; // Timestamp
  duration: number; // Cumulative duration
  distance: number; // Cumulative distance
  load?: number[];
}

/**
 * ORS Optimization API - Route for a vehicle
 */
export interface ORSOptimizationVehicleRoute {
  vehicle: number;
  cost: number;
  service: number;
  duration: number;
  waiting_time: number;
  priority: number;
  delivery: number[];
  pickup: number[];
  distance: number;
  steps: ORSOptimizationStep[];
  geometry?: string; // Encoded polyline
}

/**
 * ORS Optimization API Response
 */
export interface ORSOptimizationResponse {
  code: number;
  summary: {
    cost: number;
    routes: number;
    unassigned: number;
    service: number;
    duration: number;
    waiting_time: number;
    priority: number;
    delivery: number[];
    pickup: number[];
    distance: number;
    computing_times: {
      loading: number;
      solving: number;
      routing: number;
    };
  };
  unassigned: Array<{
    id: number;
    location: number[];
  }>;
  routes: ORSOptimizationVehicleRoute[];
}

/**
 * ORS Directions API Request
 */
export interface ORSDirectionsRequest {
  coordinates: number[][]; // Array of [longitude, latitude]
  profile?: 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking';
  format?: 'json' | 'geojson';
  instructions?: boolean;
  geometry?: boolean;
  elevation?: boolean;
}

/**
 * ORS Directions API - Route segment
 */
export interface ORSDirectionsSegment {
  distance: number;
  duration: number;
  steps: Array<{
    distance: number;
    duration: number;
    type: number;
    instruction: string;
    name?: string;
    way_points: [number, number];
  }>;
}

/**
 * ORS Directions API Response
 */
export interface ORSDirectionsResponse {
  routes: Array<{
    summary: {
      distance: number;
      duration: number;
    };
    segments: ORSDirectionsSegment[];
    bbox: number[]; // Bounding box
    geometry:
      | string
      | {
          coordinates: number[][];
          type: string;
        };
    way_points: number[];
  }>;
  bbox: number[];
  metadata: {
    attribution: string;
    service: string;
    timestamp: number;
    query: {
      coordinates: number[][];
      profile: string;
      format: string;
    };
    engine: {
      version: string;
      build_date: string;
    };
  };
}

// ============================================================================
// Service Error Types
// ============================================================================

/**
 * Error types for route optimization service
 */
export enum RouteErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  NO_ROUTE_FOUND = 'NO_ROUTE_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Route optimization error
 */
export class RouteOptimizationError extends Error {
  constructor(
    public type: RouteErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'RouteOptimizationError';
  }
}

// ============================================================================
// Firestore Storage Types
// ============================================================================

/**
 * Route document stored in Firestore
 * Collection: routes/{routeId}
 */
export interface RouteDocument {
  id: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  tripType: TripType;
  waypoints: Waypoint[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  estimatedStartTime?: number;
  estimatedEndTime?: number;
  actualStartTime?: number;
  actualEndTime?: number;
  currentWaypointIndex: number;
  status: RouteStatus;
  createdAt: number; // Firestore Timestamp
  updatedAt: number; // Firestore Timestamp
  geometry?: number[][]; // Polyline coordinates
  studentIds: string[]; // For quick queries
}

/**
 * Query parameters for finding routes
 */
export interface RouteQuery {
  driverId?: string;
  date?: string; // YYYY-MM-DD
  tripType?: TripType;
  status?: RouteStatus;
}
