import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrip } from '../../src/context/TripContext';
import RouteMapView from '../../src/components/RouteMapView';
import { theme } from '../../src/theme/theme';

export default function MapScreen() {
  const { tripState, isActive, hasRoute, clearTrip } = useTrip();
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);

  useEffect(() => {
    if (tripState.status === 'COMPLETED' && tripState.route) {
      setShowCompletionSummary(true);
    }
  }, [tripState.status]);

  const handleClearCompletedTrip = () => {
    setShowCompletionSummary(false);
    clearTrip();
  };

  const getTripStats = () => {
    if (!tripState.route) return null;

    const completedWaypoints = tripState.route.waypoints.filter((w) => w.status === 'COMPLETED');
    const totalDistance = (tripState.route.totalDistance / 1000).toFixed(1);
    const duration =
      tripState.endTime && tripState.startTime
        ? Math.round((tripState.endTime - tripState.startTime) / 1000 / 60)
        : Math.round(tripState.route.totalDuration / 60);

    return {
      completedStops: completedWaypoints.length,
      totalStops: tripState.route.waypoints.length,
      distance: totalDistance,
      duration,
    };
  };

  const stats = getTripStats();

  if (!isActive && !showCompletionSummary) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <View style={styles.iconCircle}>
              <Text style={styles.emptyIcon}>🗺️</Text>
            </View>
            <Text style={styles.emptyTitle}>No Active Trip</Text>
            <Text style={styles.emptyText}>
              Start a trip from the Dashboard to see your optimized route and vehicle location here.
            </Text>
            <View style={styles.hintBox}>
              <Text style={styles.emptyHint}>
                The map will automatically display your route when you begin a trip.
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (showCompletionSummary && stats) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.mapContainer}>
          {tripState.route && (
            <>
              <RouteMapView
                route={tripState.route}
                currentLocation={tripState.vehicleLocation || undefined}
                showETAs={false}
                style={styles.map}
              />
              <View style={styles.completionOverlay}>
                <View style={styles.completionCard}>
                  <Text style={styles.completionTitle}>🎉 Trip Completed!</Text>

                  <View style={styles.statsGrid}>
                    <View style={styles.gridItem}>
                      <Text style={styles.statLabel}>Stops Completed:</Text>
                      <Text style={styles.statValue}>
                        {stats.completedStops}/{stats.totalStops}
                      </Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.statLabel}>Total Distance:</Text>
                      <Text style={styles.statValue}>{stats.distance} km</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.statLabel}>Duration:</Text>
                      <Text style={styles.statValue}>{stats.duration} min</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClearCompletedTrip}
                    activeOpacity={0.8}>
                    <Text style={styles.clearButtonText}>Clear Map</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {hasRoute && tripState.route ? (
        <View style={styles.mapContainer}>
          <RouteMapView
            route={tripState.route}
            currentLocation={tripState.vehicleLocation || undefined}
            showETAs={true}
            style={styles.map}
          />

          <View style={styles.tripTypeIndicator}>
            <View style={styles.indicatorPulse} />
            <Text style={styles.tripTypeText}>
              {tripState.tripType === 'MORNING' ? '🌅 Morning Trip' : '🌆 Afternoon Trip'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading route...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  tripTypeIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  indicatorPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  tripTypeText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text.primary,
    letterSpacing: 0.3,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    padding: 32,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    marginBottom: 10,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  hintBox: {
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 12,
    width: '100%',
  },
  emptyHint: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  completionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  completionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  statsGrid: {
    marginBottom: 28,
    gap: 12,
  },
  gridItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: '800',
  },
  clearButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
