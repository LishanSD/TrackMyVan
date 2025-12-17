/**
 * Common type definitions shared across the application
 */

/**
 * Geographic location coordinates
 */
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

/**
 * Convert Location to [longitude, latitude] format used by ORS
 */
export function locationToCoordinate(location: Location): [number, number] {
  return [location.longitude, location.latitude];
}

/**
 * Convert [longitude, latitude] to Location format
 */
export function coordinateToLocation(coordinate: [number, number]): Location {
  return {
    latitude: coordinate[1],
    longitude: coordinate[0],
  };
}
