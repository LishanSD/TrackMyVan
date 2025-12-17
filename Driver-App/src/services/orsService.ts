/**
 * OpenRouteService (ORS) API Service
 *
 * Low-level service for interacting with ORS API endpoints:
 * - Matrix API: Calculate distance/duration matrices
 * - Optimization API: Solve vehicle routing problems
 * - Directions API: Get turn-by-turn directions
 */

import axios, { AxiosError } from 'axios';
import {
  ORSConfig,
  getEndpointUrl,
  getRequestHeaders,
  isApiKeyConfigured,
  rateLimiter,
  parseORSError,
  sleep,
  getRetryDelay,
} from '../config/orsConfig';
import {
  ORSMatrixRequest,
  ORSMatrixResponse,
  ORSOptimizationRequest,
  ORSOptimizationResponse,
  ORSDirectionsRequest,
  ORSDirectionsResponse,
  RouteOptimizationError,
  RouteErrorType,
  DistanceMatrix,
} from '../types/route.types';

// ============================================================================
// API Request Helper
// ============================================================================

/**
 * Make an ORS API request with retry logic and rate limiting
 */
async function makeORSRequest<T>(endpoint: string, data: any, attemptNumber = 1): Promise<T> {
  // Check API key
  if (!isApiKeyConfigured()) {
    throw new RouteOptimizationError(
      RouteErrorType.AUTHENTICATION_ERROR,
      'ORS API key is not configured. Please add your API key to the environment configuration.'
    );
  }

  // Check rate limiting
  if (!rateLimiter.canMakeRequest()) {
    const waitTime = rateLimiter.getWaitTime();
    console.warn(`Rate limit reached. Waiting ${waitTime}ms before retry...`);
    await sleep(waitTime);
  }

  try {
    rateLimiter.recordRequest();

    console.log('[ORS Request] Endpoint URL:', endpoint);
    console.log('[ORS Request] Request data:', JSON.stringify(data, null, 2));

    const response = await axios.post<T>(endpoint, data, {
      headers: getRequestHeaders(),
      timeout: ORSConfig.timeout,
    });

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;

    // Determine error type
    let errorType = RouteErrorType.UNKNOWN_ERROR;
    if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
      errorType = RouteErrorType.AUTHENTICATION_ERROR;
    } else if (axiosError.response?.status === 429) {
      errorType = RouteErrorType.RATE_LIMIT_EXCEEDED;
    } else if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      errorType = RouteErrorType.NETWORK_ERROR;
    } else if (axiosError.response?.status && axiosError.response.status >= 400) {
      errorType = RouteErrorType.API_ERROR;
    }

    // Retry logic for transient errors
    const shouldRetry =
      (errorType === RouteErrorType.NETWORK_ERROR ||
        errorType === RouteErrorType.RATE_LIMIT_EXCEEDED) &&
      attemptNumber < ORSConfig.retry.maxAttempts;

    if (shouldRetry) {
      const delay = getRetryDelay(attemptNumber);
      console.warn(
        `Request failed (attempt ${attemptNumber}/${ORSConfig.retry.maxAttempts}). Retrying in ${delay}ms...`
      );
      await sleep(delay);
      return makeORSRequest<T>(endpoint, data, attemptNumber + 1);
    }

    // No more retries, throw error
    const errorMessage = parseORSError(axiosError);
    throw new RouteOptimizationError(errorType, errorMessage, axiosError);
  }
}

// ============================================================================
// Matrix API
// ============================================================================

/**
 * Calculate distance and duration matrix between multiple locations
 *
 * @param locations - Array of [longitude, latitude] coordinates
 * @param profile - Routing profile (default: 'driving-car')
 * @returns Distance matrix with distances and durations
 */
export async function getDistanceMatrix(
  locations: number[][],
  profile?: 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking'
): Promise<DistanceMatrix> {
  if (!locations || locations.length < 2) {
    throw new RouteOptimizationError(
      RouteErrorType.INVALID_INPUT,
      'At least 2 locations are required for distance matrix calculation'
    );
  }

  // Validate coordinates
  for (const loc of locations) {
    if (loc.length !== 2 || typeof loc[0] !== 'number' || typeof loc[1] !== 'number') {
      throw new RouteOptimizationError(
        RouteErrorType.INVALID_INPUT,
        'Invalid location format. Expected [longitude, latitude]'
      );
    }
  }

  const endpoint = getEndpointUrl('matrix', profile);
  const request: ORSMatrixRequest = {
    locations,
    metrics: ['distance', 'duration'],
  };

  try {
    const response = await makeORSRequest<ORSMatrixResponse>(endpoint, request);

    if (!response.distances || !response.durations) {
      throw new RouteOptimizationError(
        RouteErrorType.API_ERROR,
        'Invalid response from ORS Matrix API: missing distances or durations'
      );
    }

    return {
      distances: response.distances,
      durations: response.durations,
      sources: response.sources.length,
      destinations: response.destinations.length,
    };
  } catch (error) {
    if (error instanceof RouteOptimizationError) {
      throw error;
    }
    throw new RouteOptimizationError(
      RouteErrorType.API_ERROR,
      'Failed to calculate distance matrix',
      error as Error
    );
  }
}

// ============================================================================
// Optimization API
// ============================================================================

/**
 * Optimize route using ORS Optimization API (Vehicle Routing Problem solver)
 *
 * @param request - Optimization request with vehicles and jobs
 * @returns Optimized routes for vehicles
 */
export async function optimizeRoute(
  request: ORSOptimizationRequest
): Promise<ORSOptimizationResponse> {
  if (!request.vehicles || request.vehicles.length === 0) {
    throw new RouteOptimizationError(
      RouteErrorType.INVALID_INPUT,
      'At least one vehicle is required for route optimization'
    );
  }

  if (!request.jobs || request.jobs.length === 0) {
    throw new RouteOptimizationError(
      RouteErrorType.INVALID_INPUT,
      'At least one job is required for route optimization'
    );
  }

  const endpoint = getEndpointUrl('optimization');

  try {
    const response = await makeORSRequest<ORSOptimizationResponse>(endpoint, request);

    if (response.code !== 0) {
      throw new RouteOptimizationError(
        RouteErrorType.NO_ROUTE_FOUND,
        `Route optimization failed with code ${response.code}`
      );
    }

    if (response.unassigned && response.unassigned.length > 0) {
      console.warn(
        `Warning: ${response.unassigned.length} job(s) could not be assigned to any vehicle`
      );
    }

    return response;
  } catch (error) {
    if (error instanceof RouteOptimizationError) {
      throw error;
    }
    throw new RouteOptimizationError(
      RouteErrorType.API_ERROR,
      'Failed to optimize route',
      error as Error
    );
  }
}

// ============================================================================
// Directions API
// ============================================================================

/**
 * Get turn-by-turn directions and route geometry
 *
 * @param coordinates - Array of [longitude, latitude] waypoints
 * @param profile - Routing profile (default: 'driving-car')
 * @param includeInstructions - Include turn-by-turn instructions
 * @returns Directions with geometry and optional instructions
 */
export async function getDirections(
  coordinates: number[][],
  profile?: 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking',
  includeInstructions = true
): Promise<ORSDirectionsResponse> {
  if (!coordinates || coordinates.length < 2) {
    throw new RouteOptimizationError(
      RouteErrorType.INVALID_INPUT,
      'At least 2 waypoints are required for directions'
    );
  }

  const endpoint = getEndpointUrl('directions', profile);
  const request: ORSDirectionsRequest = {
    coordinates,
    instructions: includeInstructions,
    geometry: true,
  };

  try {
    const response = await makeORSRequest<ORSDirectionsResponse>(endpoint, request);

    if (!response.routes || response.routes.length === 0) {
      throw new RouteOptimizationError(
        RouteErrorType.NO_ROUTE_FOUND,
        'No route found between the specified waypoints'
      );
    }

    return response;
  } catch (error) {
    if (error instanceof RouteOptimizationError) {
      throw error;
    }
    throw new RouteOptimizationError(
      RouteErrorType.API_ERROR,
      'Failed to get directions',
      error as Error
    );
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Decode polyline encoded string to coordinates
 * Based on Google's polyline encoding algorithm
 */
export function decodePolyline(encoded: string): number[][] {
  const coordinates: number[][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

/**
 * Test ORS API connectivity and authentication
 *
 * @returns True if API is accessible, throws error otherwise
 */
export async function testORSConnection(): Promise<boolean> {
  try {
    // Simple test with 2 locations
    const testLocations = [
      [8.681495, 49.41461], // Heidelberg
      [8.687872, 49.420318], // Nearby point
    ];

    await getDistanceMatrix(testLocations);
    return true;
  } catch (error) {
    if (error instanceof RouteOptimizationError) {
      throw error;
    }
    throw new RouteOptimizationError(
      RouteErrorType.API_ERROR,
      'Failed to connect to ORS API',
      error as Error
    );
  }
}
