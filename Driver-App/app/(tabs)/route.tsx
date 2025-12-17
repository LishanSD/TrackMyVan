/**
 * Route Screen
 *
 * Display and manage the driver's optimized route for the day
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import RouteMapView from '../../src/components/RouteMapView';
import {
  calculateOptimalRoute,
  startRoute,
  completeRoute,
  advanceToNextWaypoint,
} from '../../src/services/routeOptimizationService';
import { findRoute, subscribeToRouteUpdates } from '../../src/services/routeStorageService';
import { OptimizedRoute, TripType, Waypoint } from '../../src/types/route.types';

export default function RouteScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [tripType, setTripType] = useState<TripType>('MORNING');
  const [currentLocation, setCurrentLocation] = useState<
    | {
        latitude: number;
        longitude: number;
      }
    | undefined
  >();

  const driverId = user?.uid;
  const today = new Date().toISOString().split('T')[0];

  // Load existing route on mount
  useEffect(() => {
    if (!driverId) return;

    loadRoute();
  }, [driverId, tripType]);

  // Subscribe to route updates when route is loaded
  useEffect(() => {
    if (!route?.id) return;

    const unsubscribe = subscribeToRouteUpdates(route.id, (updatedRoute) => {
      if (updatedRoute) {
        setRoute(updatedRoute);
      }
    });

    return () => unsubscribe();
  }, [route?.id]);

  const loadRoute = async () => {
    if (!driverId) return;

    setLoading(true);
    try {
      const existingRoute = await findRoute(driverId, today, tripType);
      if (existingRoute) {
        setRoute(existingRoute);
      }
    } catch (error) {
      console.error('Error loading route:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRoute = async () => {
    if (!driverId) {
      Alert.alert('Error', 'Driver ID not found');
      return;
    }

    setLoading(true);
    try {
      const optimizedRoute = await calculateOptimalRoute(
        driverId,
        today,
        tripType,
        currentLocation,
        true // Force recalculation
      );

      setRoute(optimizedRoute);
      Alert.alert(
        'Success',
        `Route optimized! ${optimizedRoute.waypoints.length} stops, ${(optimizedRoute.totalDistance / 1000).toFixed(1)} km`
      );
    } catch (error: any) {
      console.error('Error calculating route:', error);
      Alert.alert('Error', error.message || 'Failed to calculate route');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRoute = async () => {
    if (!route) return;

    try {
      await startRoute(route.id);
      Alert.alert('Success', 'Route started!');
    } catch (error: any) {
      console.error('Error starting route:', error);
      Alert.alert('Error', error.message || 'Failed to start route');
    }
  };

  const handleCompleteRoute = async () => {
    if (!route) return;

    Alert.alert('Complete Route?', 'Mark this route as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            await completeRoute(route.id);
            Alert.alert('Success', 'Route completed!');
          } catch (error: any) {
            console.error('Error completing route:', error);
            Alert.alert('Error', error.message || 'Failed to complete route');
          }
        },
      },
    ]);
  };

  const handleWaypointPress = (waypoint: Waypoint) => {
    const statusText = waypoint.status === 'COMPLETED' ? 'completed' : 'pending';
    Alert.alert(
      waypoint.studentName || 'Waypoint',
      `${waypoint.type}\n${waypoint.location.address || ''}\nStatus: ${statusText}`
    );
  };

  const handleNextWaypoint = async () => {
    if (!route || route.currentWaypointIndex >= route.waypoints.length) return;

    try {
      await advanceToNextWaypoint(route.id, route.currentWaypointIndex);
      Alert.alert('Success', 'Advanced to next waypoint');
    } catch (error: any) {
      console.error('Error advancing waypoint:', error);
      Alert.alert('Error', error.message || 'Failed to advance waypoint');
    }
  };

  const getCurrentWaypoint = () => {
    if (!route) return null;
    return route.waypoints[route.currentWaypointIndex];
  };

  const currentWaypoint = getCurrentWaypoint();
  const progressPercentage = route
    ? Math.round((route.currentWaypointIndex / route.waypoints.length) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route Planner</Text>

        {/* Trip Type Selector */}
        <View style={styles.tripTypeSelector}>
          <TouchableOpacity
            style={[styles.tripTypeButton, tripType === 'MORNING' && styles.tripTypeButtonActive]}
            onPress={() => setTripType('MORNING')}>
            <Text
              style={[
                styles.tripTypeButtonText,
                tripType === 'MORNING' && styles.tripTypeButtonTextActive,
              ]}>
              Morning
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tripTypeButton, tripType === 'AFTERNOON' && styles.tripTypeButtonActive]}
            onPress={() => setTripType('AFTERNOON')}>
            <Text
              style={[
                styles.tripTypeButtonText,
                tripType === 'AFTERNOON' && styles.tripTypeButtonTextActive,
              ]}>
              Afternoon
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Calculating optimal route...</Text>
        </View>
      ) : route ? (
        <>
          {/* Map */}
          <RouteMapView
            route={route}
            currentLocation={currentLocation}
            onWaypointPress={handleWaypointPress}
            style={styles.map}
          />

          {/* Current Waypoint Info */}
          {route.status === 'ACTIVE' && currentWaypoint && (
            <View style={styles.currentWaypointCard}>
              <Text style={styles.currentWaypointTitle}>
                Current Stop #{route.currentWaypointIndex + 1}
              </Text>
              <Text style={styles.currentWaypointName}>{currentWaypoint.studentName}</Text>
              <Text style={styles.currentWaypointType}>
                {currentWaypoint.type} - {currentWaypoint.location.address || 'Address unavailable'}
              </Text>
              <TouchableOpacity style={styles.nextButton} onPress={handleNextWaypoint}>
                <Text style={styles.nextButtonText}>Mark Complete & Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCalculateRoute}
              disabled={loading}>
              <Text style={styles.secondaryButtonText}>Recalculate Route</Text>
            </TouchableOpacity>

            {route.status === 'PENDING' && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleStartRoute}>
                <Text style={styles.primaryButtonText}>Start Route</Text>
              </TouchableOpacity>
            )}

            {route.status === 'ACTIVE' && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleCompleteRoute}>
                <Text style={styles.primaryButtonText}>Complete Route</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Route Calculated</Text>
          <Text style={styles.emptyText}>
            Calculate an optimal route for your {tripType.toLowerCase()} trip
          </Text>
          <TouchableOpacity
            style={styles.calculateButton}
            onPress={handleCalculateRoute}
            disabled={loading}>
            <Text style={styles.calculateButtonText}>Calculate Route</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  tripTypeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  tripTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  tripTypeButtonActive: {
    backgroundColor: '#4A90E2',
  },
  tripTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tripTypeButtonTextActive: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  map: {
    flex: 1,
  },
  currentWaypointCard: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  currentWaypointTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  currentWaypointName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  currentWaypointType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  nextButton: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  calculateButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  calculateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
