import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Location, DriverLocation } from '../types/types';
import { RouteGeometry } from '../types/route.types';
import { theme } from '../theme/theme';

interface TrackingMapProps {
  homeLocation: Location;
  schoolLocation: Location;
  driverLocation: DriverLocation | null;
  studentName: string;
  loading?: boolean;
  error?: string | null;
  routeGeometry?: RouteGeometry | null;
}

export const TrackingMap: React.FC<TrackingMapProps> = ({
  homeLocation,
  schoolLocation,
  driverLocation,
  studentName,
  loading = false,
  error = null,
  routeGeometry = null,
}) => {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!mapRef.current || loading) return;

    const coordinates: { latitude: number; longitude: number }[] = [homeLocation, schoolLocation];

    if (driverLocation) {
      coordinates.push({
        latitude: driverLocation.lat,
        longitude: driverLocation.lng,
      });
    }

    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }, 500);
  }, [homeLocation, schoolLocation, driverLocation, loading]);

  const getInitialRegion = (): Region => {
    const midLat = (homeLocation.latitude + schoolLocation.latitude) / 2;
    const midLng = (homeLocation.longitude + schoolLocation.longitude) / 2;

    const latDelta = Math.abs(homeLocation.latitude - schoolLocation.latitude) * 1.5;
    const lngDelta = Math.abs(homeLocation.longitude - schoolLocation.longitude) * 1.5;

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(latDelta, 0.05),
      longitudeDelta: Math.max(lngDelta, 0.05),
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={getInitialRegion()}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}>
        {/* Driver Route Polyline - Only visible when trip is active */}
        {(() => {
          console.log('[TrackingMap] Route geometry:', {
            exists: !!routeGeometry,
            coordinateCount: routeGeometry?.coordinates?.length || 0,
            firstCoordinate: routeGeometry?.coordinates?.[0],
          });
          return routeGeometry && routeGeometry.coordinates.length > 0 ? (
            <Polyline
              coordinates={routeGeometry.coordinates}
              strokeColor={theme.colors.primary}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          ) : null;
        })()}

        {/* Home Location Marker */}
        <Marker
          coordinate={homeLocation}
          title="Home"
          description={`${studentName}'s home`}
          anchor={{ x: 0.5, y: 1 }}
          calloutAnchor={{ x: 0.5, y: 0 }}>
          <View style={styles.markerContainer}>
            <View style={[styles.markerBubble, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="home" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.markerArrow, { borderTopColor: theme.colors.primary }]} />
          </View>
        </Marker>

        {/* School Location Marker */}
        <Marker
          coordinate={schoolLocation}
          title="School"
          description={`${studentName}'s school`}
          anchor={{ x: 0.5, y: 1 }}
          calloutAnchor={{ x: 0.5, y: 0 }}>
          <View style={styles.markerContainer}>
            <View style={[styles.markerBubble, { backgroundColor: theme.colors.secondary }]}>
              <Ionicons name="school" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.markerArrow, { borderTopColor: theme.colors.secondary }]} />
          </View>
        </Marker>

        {/* Driver/Van Location Marker */}
        {driverLocation && (
          <Marker
            coordinate={{
              latitude: driverLocation.lat,
              longitude: driverLocation.lng,
            }}
            title="School Van"
            description="Live Location"
            rotation={driverLocation.bearing}
            anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.vanMarkerContainer}>
              <View style={styles.vanMarkerRing}>
                <View style={styles.vanMarkerCore}>
                  <Ionicons name="bus" size={18} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Floating Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="home" size={10} color="#FFFFFF" />
          </View>
          <Text style={styles.legendText}>Home</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.secondary }]}>
            <Ionicons name="school" size={10} color="#FFFFFF" />
          </View>
          <Text style={styles.legendText}>School</Text>
        </View>
        {driverLocation && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="bus" size={10} color="#FFFFFF" />
            </View>
            <Text style={styles.legendText}>Van</Text>
          </View>
        )}
      </View>

      {/* Status Banner */}
      {!driverLocation && (
        <View style={styles.statusBanner}>
          <Ionicons name="cloud-offline-outline" size={20} color="#FFFFFF" />
          <Text style={styles.statusText}>Driver location unavailable</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderRadius: 12, // Rounded corners for the map container
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.error,
    textAlign: 'center',
  },

  // Map Markers
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  markerBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },

  // Van Marker
  vanMarkerContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vanMarkerRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.3)', // Semi-transparent ring
    alignItems: 'center',
    justifyContent: 'center',
  },
  vanMarkerCore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B', // Warning/Orange color
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },

  // Legend
  legend: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },

  // Status Banner
  statusBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
