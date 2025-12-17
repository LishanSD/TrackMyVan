/**
 * Map Screen
 *
 * Displays real-time vehicle tracking and optimized route visualization
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrip } from '../../src/context/TripContext';
import RouteMapView from '../../src/components/RouteMapView';
import { theme } from '../../src/theme/theme';

export default function MapScreen() {
  const { tripState, isActive, hasRoute, clearTrip } = useTrip();
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);

  // Show completion summary when trip ends
  useEffect(() => {
    if (tripState.status === 'COMPLETED' && tripState.route) {
      setShowCompletionSummary(true);
    }
  }, [tripState.status]);

  // Handle clearing completed trip
  const handleClearCompletedTrip = () => {
    setShowCompletionSummary(false);
    clearTrip();
  };

  // Calculate trip statistics
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

  // Empty state - no active trip
  if (!isActive && !showCompletionSummary) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>No Active Trip</Text>
            <Text style={styles.emptyText}>
              Start a trip from the Dashboard to see your optimized route and vehicle location here.
            </Text>
            <Text style={styles.emptyHint}>
              The map will automatically display your route when you begin a trip.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Trip completed state
  if (showCompletionSummary && stats) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* Show map with completed route in gray */}
        {tripState.route && (
          <View style={styles.mapContainer}>
            <RouteMapView
              route={tripState.route}
              currentLocation={tripState.vehicleLocation || undefined}
              showETAs={false}
              style={styles.map}
            />
            {/* Overlay for completed state */}
            <View style={styles.completionOverlay}>
              <View style={styles.completionCard}>
                <Text style={styles.completionTitle}>🎉 Trip Completed!</Text>

                <View style={styles.statsContainer}>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Stops Completed:</Text>
                    <Text style={styles.statValue}>
                      {stats.completedStops}/{stats.totalStops}
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Total Distance:</Text>
                    <Text style={styles.statValue}>{stats.distance} km</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Duration:</Text>
                    <Text style={styles.statValue}>{stats.duration} min</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.clearButton} onPress={handleClearCompletedTrip}>
                  <Text style={styles.clearButtonText}>Clear Map</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Active trip state
  return (
    <SafeAreaView style={styles.safeArea}>
      {hasRoute && tripState.route ? (
        <View style={styles.mapContainer}>
          <RouteMapView
            route={tripState.route}
            currentLocation={tripState.vehicleLocation || undefined}
            showETAs={true}
            style={styles.map}
          />

          {/* Trip type indicator */}
          <View style={styles.tripTypeIndicator}>
            <Text style={styles.tripTypeText}>
              {tripState.tripType === 'MORNING' ? '🌅 Morning Trip' : '🌆 Afternoon Trip'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading route...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    padding: 32,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 12,
    lineHeight: 24,
  },
  emptyHint: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  completionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  completionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statLabel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    color: theme.colors.text.primary,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
