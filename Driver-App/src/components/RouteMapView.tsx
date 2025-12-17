/**
 * Route Map View Component
 *
 * Displays an optimized route on a map with waypoint markers and route polyline
 * Uses react-native-maps with OpenStreetMap
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { OptimizedRoute, Waypoint } from '../types/route.types';

// ============================================================================
// Props Interface
// ============================================================================

interface RouteMapViewProps {
  route: OptimizedRoute;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  onWaypointPress?: (waypoint: Waypoint) => void;
  showETAs?: boolean;
  style?: any;
}

// ============================================================================
// Component
// ============================================================================

export default function RouteMapView({
  route,
  currentLocation,
  onWaypointPress,
  showETAs = true,
  style,
}: RouteMapViewProps) {
  const mapRef = useRef<MapView>(null);

  // Auto-fit map to show all waypoints
  useEffect(() => {
    if (mapRef.current && route.waypoints.length > 0) {
      const coordinates = route.waypoints.map((w) => ({
        latitude: w.location.latitude,
        longitude: w.location.longitude,
      }));

      // Add current location to fit bounds
      if (currentLocation) {
        coordinates.push(currentLocation);
      }

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        },
        animated: true,
      });
    }
  }, [route.waypoints, currentLocation]);

  // Convert geometry to map coordinates
  const routeCoordinates = route.geometry
    ? route.geometry.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }))
    : [];

  // Get marker color based on waypoint type and status
  const getMarkerColor = (waypoint: Waypoint): string => {
    if (waypoint.status === 'COMPLETED') return '#10B981'; // Green
    if (waypoint.status === 'IN_PROGRESS') return '#F59E0B'; // Orange
    if (waypoint.status === 'SKIPPED') return '#6B7280'; // Gray

    return waypoint.type === 'HOME' ? '#3B82F6' : '#8B5CF6'; // Blue for home, Purple for school
  };

  // Format ETA
  const formatETA = (timestamp?: number): string => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get marker title
  const getMarkerTitle = (waypoint: Waypoint): string => {
    const orderLabel = `#${waypoint.sequenceOrder + 1}`;
    const typeLabel = waypoint.type === 'HOME' ? '🏠 Home' : '🏫 School';
    const studentLabel = waypoint.studentName || 'Unknown';

    return `${orderLabel} - ${typeLabel}: ${studentLabel}`;
  };

  // Get marker description
  const getMarkerDescription = (waypoint: Waypoint): string => {
    let desc = waypoint.location.address || '';

    if (showETAs && waypoint.estimatedArrivalTime) {
      const eta = formatETA(waypoint.estimatedArrivalTime);
      desc += desc ? `\nETA: ${eta}` : `ETA: ${eta}`;
    }

    if (waypoint.status === 'COMPLETED' && waypoint.actualArrivalTime) {
      const actual = formatETA(waypoint.actualArrivalTime);
      desc += `\nArrived: ${actual}`;
    }

    return desc;
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        showsUserLocation={!!currentLocation}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}>
        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor="#4A90E2"
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Waypoint markers */}
        {route.waypoints.map((waypoint, index) => (
          <Marker
            key={waypoint.id}
            coordinate={{
              latitude: waypoint.location.latitude,
              longitude: waypoint.location.longitude,
            }}
            title={getMarkerTitle(waypoint)}
            description={getMarkerDescription(waypoint)}
            pinColor={getMarkerColor(waypoint)}
            onPress={() => onWaypointPress?.(waypoint)}>
            {/* Custom marker with sequence number */}
            <View style={styles.markerContainer}>
              <View style={[styles.markerBubble, { backgroundColor: getMarkerColor(waypoint) }]}>
                <Text style={styles.markerText}>{waypoint.sequenceOrder + 1}</Text>
              </View>
              <View style={styles.markerArrow} />
            </View>
          </Marker>
        ))}

        {/* Current location marker */}
        {currentLocation && (
          <Marker coordinate={currentLocation} title="Current Location" pinColor="#EF4444">
            <View style={styles.currentLocationMarker}>
              <View style={styles.currentLocationDot} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Route summary overlay */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Distance:</Text>
            <Text style={styles.summaryValue}>{(route.totalDistance / 1000).toFixed(1)} km</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration:</Text>
            <Text style={styles.summaryValue}>{Math.round(route.totalDuration / 60)} min</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Stops:</Text>
            <Text style={styles.summaryValue}>{route.waypoints.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status:</Text>
            <Text style={[styles.summaryValue, styles[`status${route.status}`]]}>
              {route.status}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  summaryContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  statusPENDING: {
    color: '#6B7280',
  },
  statusACTIVE: {
    color: '#10B981',
  },
  statusCOMPLETED: {
    color: '#3B82F6',
  },
  statusCANCELLED: {
    color: '#EF4444',
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  markerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 8,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
    marginTop: -2,
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: 'white',
  },
});
