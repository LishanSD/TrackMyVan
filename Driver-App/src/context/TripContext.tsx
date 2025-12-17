/**
 * Trip Context
 *
 * Provides shared state for active trips across the app
 * Manages trip lifecycle, route data, and vehicle location
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OptimizedRoute, TripType } from '../types/route.types';
import { watchLocation } from '../services/locationService';

// ============================================================================
// Types
// ============================================================================

export type TripStatus = 'IDLE' | 'STARTING' | 'ACTIVE' | 'ENDING' | 'COMPLETED';

export interface VehicleLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number;
  heading?: number;
}

export interface TripState {
  tripId: string | null;
  tripType: TripType | null;
  status: TripStatus;
  route: OptimizedRoute | null;
  vehicleLocation: VehicleLocation | null;
  startTime: number | null;
  endTime: number | null;
}

interface TripContextValue {
  // State
  tripState: TripState;

  // Actions
  setTripData: (tripId: string, tripType: TripType, route: OptimizedRoute) => void;
  updateVehicleLocation: (location: VehicleLocation) => void;
  setTripStatus: (status: TripStatus) => void;
  endTrip: () => void;
  clearTrip: () => void;

  // Helper getters
  isActive: boolean;
  hasRoute: boolean;
}

// ============================================================================
// Context
// ============================================================================

const TripContext = createContext<TripContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface TripProviderProps {
  children: ReactNode;
}

export function TripProvider({ children }: TripProviderProps) {
  const [tripState, setTripState] = useState<TripState>({
    tripId: null,
    tripType: null,
    status: 'IDLE',
    route: null,
    vehicleLocation: null,
    startTime: null,
    endTime: null,
  });

  const [locationSubscription, setLocationSubscription] = useState<{ remove: () => void } | null>(
    null
  );

  // Set trip data when trip starts
  const setTripData = (tripId: string, tripType: TripType, route: OptimizedRoute) => {
    console.log('[TripContext] Setting trip data:', { tripId, tripType, routeId: route.id });
    setTripState((prev) => ({
      ...prev,
      tripId,
      tripType,
      route,
      status: 'ACTIVE',
      startTime: Date.now(),
      endTime: null,
    }));

    // Start location tracking
    startLocationTracking();
  };

  // Update vehicle location
  const updateVehicleLocation = (location: VehicleLocation) => {
    setTripState((prev) => ({
      ...prev,
      vehicleLocation: location,
    }));
  };

  // Set trip status
  const setTripStatus = (status: TripStatus) => {
    console.log('[TripContext] Setting trip status:', status);
    setTripState((prev) => ({
      ...prev,
      status,
    }));
  };

  // End trip
  const endTrip = () => {
    console.log('[TripContext] Ending trip');
    setTripState((prev) => ({
      ...prev,
      status: 'COMPLETED',
      endTime: Date.now(),
    }));

    // Stop location tracking
    stopLocationTracking();
  };

  // Clear trip (after completion acknowledgment)
  const clearTrip = () => {
    console.log('[TripContext] Clearing trip data');
    setTripState({
      tripId: null,
      tripType: null,
      status: 'IDLE',
      route: null,
      vehicleLocation: null,
      startTime: null,
      endTime: null,
    });

    // Ensure location tracking is stopped
    stopLocationTracking();
  };

  // Start location tracking
  const startLocationTracking = async () => {
    if (locationSubscription) {
      console.log('[TripContext] Location tracking already active');
      return;
    }

    console.log('[TripContext] Starting location tracking');
    const subscription = await watchLocation((location) => {
      updateVehicleLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: Date.now(),
      });
    });

    if (subscription) {
      setLocationSubscription(subscription);
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationSubscription) {
      console.log('[TripContext] Stopping location tracking');
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Helper getters
  const isActive = tripState.status === 'ACTIVE' || tripState.status === 'STARTING';
  const hasRoute = tripState.route !== null;

  const value: TripContextValue = {
    tripState,
    setTripData,
    updateVehicleLocation,
    setTripStatus,
    endTrip,
    clearTrip,
    isActive,
    hasRoute,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useTrip() {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}
