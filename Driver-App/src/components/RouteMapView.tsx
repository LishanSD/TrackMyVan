import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { OptimizedRoute, Waypoint } from '../types/route.types';
import { theme } from '../theme/theme';

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

export default function RouteMapView({
  route,
  currentLocation,
  onWaypointPress,
  showETAs = true,
  style,
}: RouteMapViewProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (mapRef.current && route.waypoints.length > 0) {
      const coordinates = route.waypoints.map((w) => ({
        latitude: w.location.latitude,
        longitude: w.location.longitude,
      }));

      if (currentLocation) {
        coordinates.push(currentLocation);
      }

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 100,
          right: 50,
          bottom: 50,
          left: 50,
        },
        animated: true,
      });
    }
  }, [route.waypoints, currentLocation]);

  const routeCoordinates = route.geometry
    ? route.geometry.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }))
    : [];

  const getMarkerColor = (waypoint: Waypoint): string => {
    if (waypoint.status === 'COMPLETED') return '#10B981';
    if (waypoint.status === 'IN_PROGRESS') return '#F59E0B';
    if (waypoint.status === 'SKIPPED') return '#6B7280';

    return waypoint.type === 'HOME' ? '#3B82F6' : '#8B5CF6';
  };

  const formatETA = (timestamp?: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMarkerTitle = (waypoint: Waypoint): string => {
    const orderLabel = `#${waypoint.sequenceOrder + 1}`;
    const typeLabel = waypoint.type === 'HOME' ? 'Home' : 'School';
    const studentLabel = waypoint.studentName || 'Unknown';

    return `${orderLabel} - ${typeLabel}: ${studentLabel}`;
  };

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
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}>
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={5}
            strokeColor={theme.colors.primary}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {route.waypoints.map((waypoint) => (
          <Marker
            key={waypoint.id}
            coordinate={{
              latitude: waypoint.location.latitude,
              longitude: waypoint.location.longitude,
            }}
            title={getMarkerTitle(waypoint)}
            description={getMarkerDescription(waypoint)}
            onPress={() => onWaypointPress?.(waypoint)}>
            <View style={styles.markerContainer}>
              <View style={[styles.markerBubble, { backgroundColor: getMarkerColor(waypoint) }]}>
                <Text style={styles.markerText}>{waypoint.sequenceOrder + 1}</Text>
              </View>
              <View style={[styles.markerArrow, { borderTopColor: getMarkerColor(waypoint) }]} />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Distance</Text>
            <Text style={styles.summaryValue}>{(route.totalDistance / 1000).toFixed(1)} km</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{Math.round(route.totalDuration / 60)} min</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Stops</Text>
            <Text style={styles.summaryValue}>{route.waypoints.length}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={[styles.summaryValue, styles[`status${route.status}`]]}>
              {route.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  map: {
    flex: 1,
  },
  summaryContainer: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '800',
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
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  markerBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
});
