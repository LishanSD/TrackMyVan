import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Location, DriverLocation } from '../types/types';
import { theme } from '../theme/theme';

interface TrackingMapProps {
  homeLocation: Location;
  schoolLocation: Location;
  driverLocation: DriverLocation | null;
  studentName: string;
  loading?: boolean;
  error?: string | null;
}

export const TrackingMap: React.FC<TrackingMapProps> = ({
  homeLocation,
  schoolLocation,
  driverLocation,
  studentName,
  loading = false,
  error = null,
}) => {
  const mapRef = useRef<MapView>(null);

  // Auto-fit map to show all markers
  useEffect(() => {
    if (!mapRef.current || loading) return;

    const coordinates: { latitude: number; longitude: number }[] = [homeLocation, schoolLocation];

    // Add driver location if available
    if (driverLocation) {
      coordinates.push({
        latitude: driverLocation.lat,
        longitude: driverLocation.lng,
      });
    }

    // Fit map to show all markers with padding
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }, 500);
  }, [homeLocation, schoolLocation, driverLocation, loading]);

  // Calculate initial region based on home and school locations
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
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={getInitialRegion()}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}>
        {/* Home Location Marker */}
        <Marker
          coordinate={homeLocation}
          title="Home"
          description={`${studentName}'s home`}
          pinColor={theme.colors.primary}>
          <View style={styles.markerContainer}>
            <View style={[styles.marker, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.markerIcon}>🏠</Text>
            </View>
            <View style={[styles.markerArrow, { borderTopColor: theme.colors.primary }]} />
          </View>
        </Marker>

        {/* School Location Marker */}
        <Marker
          coordinate={schoolLocation}
          title="School"
          description={`${studentName}'s school`}
          pinColor={theme.colors.secondary}>
          <View style={styles.markerContainer}>
            <View style={[styles.marker, { backgroundColor: theme.colors.secondary }]}>
              <Text style={styles.markerIcon}>🏫</Text>
            </View>
            <View style={[styles.markerArrow, { borderTopColor: theme.colors.secondary }]} />
          </View>
        </Marker>

        {/* Driver/Van Location Marker (if available) */}
        {driverLocation && (
          <Marker
            coordinate={{
              latitude: driverLocation.lat,
              longitude: driverLocation.lng,
            }}
            title="Van Location"
            description="Current driver location"
            rotation={driverLocation.bearing}
            anchor={{ x: 0.5, y: 0.5 }}>
            <View
              style={[
                styles.vanMarkerContainer,
                { transform: [{ rotate: `${driverLocation.bearing}deg` }] },
              ]}>
              <View style={styles.vanMarker}>
                <Text style={styles.vanIcon}>🚐</Text>
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
          <Text style={styles.legendText}>Home</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.secondary }]} />
          <Text style={styles.legendText}>School</Text>
        </View>
        {driverLocation && (
          <View style={styles.legendItem}>
            <Text style={styles.vanIcon}>🚐</Text>
            <Text style={styles.legendText}>Van</Text>
          </View>
        )}
      </View>

      {/* Driver Location Status */}
      {!driverLocation && (
        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>⚠️ Driver location not available</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
  },

  // Custom Marker Styles
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerIcon: {
    fontSize: 18,
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  // Van Marker Styles
  vanMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vanMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.warning,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
  },
  vanIcon: {
    fontSize: 20,
  },

  // Legend Styles
  legend: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },

  // Status Banner
  statusBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.95)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
  },
});
