/**
 * Route Optimization Service
 *
 * High-level service for calculating and managing optimal routes for drivers.
 * Integrates ORS API for route optimization and Firestore for persistence.
 */

import * as Crypto from 'expo-crypto';
import {
  getDistanceMatrix,
  optimizeRoute as orsOptimizeRoute,
  getDirections,
  decodePolyline,
} from './orsService';
import {
  saveOptimizedRoute,
  findRoute,
  updateRouteProgress,
  updateRouteStatus,
  updateWaypointStatus,
} from './routeStorageService';
import { getDriverStudents, filterStudentsWithValidLocations } from './studentService';
import { Student } from '../types/types';
import {
  OptimizedRoute,
  Waypoint,
  RouteSegment,
  TripType,
  RouteStatus,
  WaypointType,
  ORSVehicle,
  ORSJob,
  ORSOptimizationRequest,
  RouteOptimizationError,
  RouteErrorType,
} from '../types/route.types';
import { locationToCoordinate } from '../types/common.types';
import { getCurrentLocation } from './locationService';

// ============================================================================
// Route Calculation
// ============================================================================

/**
 * Calculate optimal route for a driver's trip
 *
 * @param driverId - The driver ID
 * @param date - The date (YYYY-MM-DD)
 * @param tripType - MORNING (home → school) or AFTERNOON (school → home)
 * @param startLocation - Optional starting location (defaults to first pickup)
 * @param forceRecalculate - If true, recalculate even if cached route exists
 * @returns Promise resolving to the optimized route
 */
export async function calculateOptimalRoute(
  driverId: string,
  date: string,
  tripType: TripType,
  startLocation?: { latitude: number; longitude: number },
  forceRecalculate = false
): Promise<OptimizedRoute> {
  try {
    console.log(`Calculating optimal route for driver ${driverId}, ${tripType} trip on ${date}`);

    // Check for existing route
    if (!forceRecalculate) {
      const existingRoute = await findRoute(driverId, date, tripType);
      if (existingRoute && existingRoute.status !== 'CANCELLED') {
        console.log('Found existing route, returning cached version');
        return existingRoute;
      }
    }

    // Get current location if no start location provided
    let actualStartLocation = startLocation;
    if (!actualStartLocation) {
      console.log('No start location provided, attempting to get current location...');
      const currentLocation = await getCurrentLocation(true);
      if (currentLocation) {
        actualStartLocation = currentLocation;
        console.log(
          `Using current location as start: ${currentLocation.latitude}, ${currentLocation.longitude}`
        );
      } else {
        console.warn('Could not get current location, will use first waypoint as start');
      }
    }

    // Fetch driver's students
    const students = await getDriverStudents(driverId, true);

    if (students.length === 0) {
      throw new RouteOptimizationError(
        RouteErrorType.INVALID_INPUT,
        'No approved students found for this driver'
      );
    }

    // Filter students with valid locations
    const validStudents = filterStudentsWithValidLocations(students);

    if (validStudents.length === 0) {
      throw new RouteOptimizationError(
        RouteErrorType.INVALID_INPUT,
        'No students with valid location data'
      );
    }

    console.log(`Optimizing route for ${validStudents.length} students`);

    // Build waypoints based on trip type
    const waypoints = buildWaypoints(validStudents, tripType);

    // Optimize route using ORS
    const optimizedWaypoints = await optimizeWaypointsWithORS(
      waypoints,
      tripType,
      actualStartLocation
    );

    // Get detailed route geometry
    const { geometry, segments } = await getRouteGeometry(optimizedWaypoints);

    // Calculate total distance and duration
    const totalDistance = segments.reduce((sum, seg) => sum + seg.distance, 0);
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);

    // Create optimized route object
    const now = Date.now();
    const estimatedStartTime = optimizedWaypoints[0]?.estimatedArrivalTime || now;
    const estimatedEndTime = estimatedStartTime + totalDuration * 1000;

    const route: OptimizedRoute = {
      id: Crypto.randomUUID(),
      driverId,
      date,
      tripType,
      waypoints: optimizedWaypoints,
      segments,
      totalDistance,
      totalDuration,
      estimatedStartTime,
      estimatedEndTime,
      currentWaypointIndex: 0,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      geometry,
    };

    // Save to Firestore
    await saveOptimizedRoute(route);

    console.log(`Route optimization complete: ${totalDistance}m, ${totalDuration}s`);
    return route;
  } catch (error) {
    console.error('Error calculating optimal route:', error);

    if (error instanceof RouteOptimizationError) {
      throw error;
    }

    throw new RouteOptimizationError(
      RouteErrorType.UNKNOWN_ERROR,
      `Failed to calculate optimal route: ${error}`,
      error as Error
    );
  }
}

/**
 * Build waypoints from students based on trip type
 */
function buildWaypoints(students: Student[], tripType: TripType): Waypoint[] {
  const waypoints: Waypoint[] = [];

  students.forEach((student, index) => {
    if (tripType === 'MORNING') {
      // Morning: Home → School
      waypoints.push({
        id: `${student.id}-home`,
        type: 'HOME',
        location: student.homeLocation,
        studentId: student.id,
        studentName: student.name,
        status: 'PENDING',
        sequenceOrder: 0, // Will be updated after optimization
      });

      waypoints.push({
        id: `${student.id}-school`,
        type: 'SCHOOL',
        location: student.schoolLocation,
        studentId: student.id,
        studentName: student.name,
        status: 'PENDING',
        sequenceOrder: 0, // Will be updated after optimization
      });
    } else {
      // Afternoon: School → Home
      waypoints.push({
        id: `${student.id}-school`,
        type: 'SCHOOL',
        location: student.schoolLocation,
        studentId: student.id,
        studentName: student.name,
        status: 'PENDING',
        sequenceOrder: 0,
      });

      waypoints.push({
        id: `${student.id}-home`,
        type: 'HOME',
        location: student.homeLocation,
        studentId: student.id,
        studentName: student.name,
        status: 'PENDING',
        sequenceOrder: 0,
      });
    }
  });

  return waypoints;
}

/**
 * Optimize waypoint order for a given subset (homes only, or schools only)
 * using ORS Optimization API.
 *
 * This returns the subset waypoints in optimized visiting order, without
 * assigning sequenceOrder or ETAs – the caller is responsible for that.
 */
async function optimizeWaypointSubset(
  subset: Waypoint[],
  startLocation?: { latitude: number; longitude: number }
): Promise<Waypoint[]> {
  if (subset.length === 0) {
    return [];
  }

  // Convert subset to ORS jobs
  const jobs: ORSJob[] = subset.map((waypoint, index) => ({
    id: index,
    location: locationToCoordinate(waypoint.location),
    service: 60, // 1 minute per stop
  }));

  // Define vehicle, starting from explicit startLocation if provided,
  // otherwise from the first waypoint in this subset.
  const vehicle: ORSVehicle = {
    id: 1,
    profile: 'driving-car',
    start: startLocation ? locationToCoordinate(startLocation) : jobs[0].location,
  };

  const request: ORSOptimizationRequest = {
    jobs,
    vehicles: [vehicle],
    options: {
      g: false,
    },
  };

  const response = await orsOptimizeRoute(request);

  if (!response.routes || response.routes.length === 0) {
    throw new RouteOptimizationError(RouteErrorType.NO_ROUTE_FOUND, 'No optimized route found');
  }

  const optimizedRoute = response.routes[0];
  const optimizedSubset: Waypoint[] = [];

  optimizedRoute.steps.forEach((step) => {
    if (step.type === 'job' && step.job !== undefined) {
      const wp = { ...subset[step.job] };
      optimizedSubset.push(wp);
    }
  });

  return optimizedSubset;
}

/**
 * Optimize waypoint order using ORS Optimization API while enforcing business rules:
 *
 * MORNING:
 *   - Visit ALL HOMES first (in best order),
 *   - then visit ALL SCHOOLS (in best order, starting from the last home).
 *
 * AFTERNOON:
 *   - Visit ALL SCHOOLS first (in best order),
 *   - then visit ALL HOMES (in best order, starting from the last school).
 */
async function optimizeWaypointsWithORS(
  waypoints: Waypoint[],
  tripType: TripType,
  startLocation?: { latitude: number; longitude: number }
): Promise<Waypoint[]> {
  // Split waypoints by type
  const homeWaypoints = waypoints.filter((w) => w.type === 'HOME');
  const schoolWaypoints = waypoints.filter((w) => w.type === 'SCHOOL');

  if (homeWaypoints.length === 0 && schoolWaypoints.length === 0) {
    throw new RouteOptimizationError(
      RouteErrorType.INVALID_INPUT,
      'No waypoints available to optimize route'
    );
  }

  // Primary (first) and secondary (second) phase sets + their optimized orders
  let firstSet: Waypoint[] = [];
  let secondSet: Waypoint[] = [];

  if (tripType === 'MORNING') {
    // Morning: homes first, then schools
    firstSet = await optimizeWaypointSubset(homeWaypoints, startLocation);

    const lastOfFirst = firstSet[firstSet.length - 1] ?? homeWaypoints[0] ?? schoolWaypoints[0];
    const secondStartLocation = lastOfFirst
      ? {
          latitude: lastOfFirst.location.latitude,
          longitude: lastOfFirst.location.longitude,
        }
      : startLocation;

    secondSet = await optimizeWaypointSubset(schoolWaypoints, secondStartLocation);
  } else {
    // Afternoon: schools first, then homes
    firstSet = await optimizeWaypointSubset(schoolWaypoints, startLocation);

    const lastOfFirst = firstSet[firstSet.length - 1] ?? schoolWaypoints[0] ?? homeWaypoints[0];
    const secondStartLocation = lastOfFirst
      ? {
          latitude: lastOfFirst.location.latitude,
          longitude: lastOfFirst.location.longitude,
        }
      : startLocation;

    secondSet = await optimizeWaypointSubset(homeWaypoints, secondStartLocation);
  }

  // Combine in strict visiting order: first phase, then second phase
  const orderedWaypoints: Waypoint[] = [...firstSet, ...secondSet];

  // Assign sequenceOrder and simple increasing ETAs so marker numbers and titles
  // reflect the visiting order. Exact timing is refined by the Directions API later.
  const now = Date.now();
  let sequenceCounter = 0;

  const finalWaypoints: Waypoint[] = orderedWaypoints.map((wp, index) => ({
    ...wp,
    sequenceOrder: sequenceCounter++,
    estimatedArrivalTime: now + index * 60_000,
  }));

  return finalWaypoints;
}

/**
 * Get detailed route geometry using ORS Directions API
 */
async function getRouteGeometry(
  waypoints: Waypoint[]
): Promise<{ geometry: number[][]; segments: RouteSegment[] }> {
  // Convert waypoints to coordinates
  const coordinates = waypoints.map((w) => locationToCoordinate(w.location));

  // Get directions
  const directions = await getDirections(coordinates, 'driving-car', true);

  if (!directions.routes || directions.routes.length === 0) {
    throw new RouteOptimizationError(RouteErrorType.NO_ROUTE_FOUND, 'No route geometry found');
  }

  const route = directions.routes[0];

  // Decode geometry
  let geometry: number[][] = [];
  if (typeof route.geometry === 'string') {
    geometry = decodePolyline(route.geometry);
  } else if (route.geometry && 'coordinates' in route.geometry) {
    geometry = route.geometry.coordinates;
  }

  // Build route segments
  const segments: RouteSegment[] = [];

  route.segments.forEach((segment, index) => {
    if (index < waypoints.length - 1) {
      const instructions = segment.steps.map((step) => step.instruction);

      segments.push({
        fromWaypoint: waypoints[index],
        toWaypoint: waypoints[index + 1],
        distance: segment.distance,
        duration: segment.duration,
        instructions,
      });
    }
  });

  return { geometry, segments };
}

// ============================================================================
// Route Management
// ============================================================================

/**
 * Start a route (mark as active)
 */
export async function startRoute(routeId: string): Promise<void> {
  await updateRouteStatus(routeId, 'ACTIVE', {
    actualStartTime: Date.now(),
  });
}

/**
 * Complete a route
 */
export async function completeRoute(routeId: string): Promise<void> {
  await updateRouteStatus(routeId, 'COMPLETED', {
    actualEndTime: Date.now(),
  });
}

/**
 * Cancel a route
 */
export async function cancelRoute(routeId: string): Promise<void> {
  await updateRouteStatus(routeId, 'CANCELLED');
}

/**
 * Advance to next waypoint
 */
export async function advanceToNextWaypoint(
  routeId: string,
  currentWaypointIndex: number
): Promise<void> {
  // Mark current waypoint as completed
  await updateWaypointStatus(routeId, currentWaypointIndex, 'COMPLETED', Date.now());

  // Advance route progress
  await updateRouteProgress(routeId, currentWaypointIndex + 1);
}
