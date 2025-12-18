import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../src/config/firebaseConfig';
import { subscribeToDriverLocation } from '../../src/services/locationService';
import { subscribeToActiveRoute, getRouteGeometryForMap } from '../../src/services/routeService';
import { TrackingMap } from '../../src/components/TrackingMap';
import { Student, DriverLocation } from '../../src/types/types';
import { RouteGeometry } from '../../src/types/route.types';
import { theme } from '../../src/theme/theme';

export default function TrackingScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!childId) {
        setError('No student ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const studentDoc = await getDoc(doc(firestore, 'students', childId));

        if (studentDoc.exists()) {
          setStudent({ id: studentDoc.id, ...studentDoc.data() } as Student);
          setError(null);
        } else {
          setError('Student not found');
        }
      } catch (err: any) {
        console.error('Error fetching student:', err);
        setError('Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [childId]);

  useEffect(() => {
    if (!student?.driverId) return;

    const unsubscribe = subscribeToDriverLocation(
      student.driverId,
      (location) => {
        setDriverLocation(location);
        if (location) {
          setLastUpdate(new Date());
        }
      },
      (err) => {
        console.error('Location subscription error:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [student?.driverId]);

  // Subscribe to active route for this student
  useEffect(() => {
    if (!childId || !student) return;

    // Determine trip type based on current time (simplified - you may want to make this more sophisticated)
    const currentHour = new Date().getHours();
    const tripType = currentHour < 12 ? 'MORNING' : 'AFTERNOON';

    const unsubscribe = subscribeToActiveRoute(childId, tripType, (route) => {
      if (route) {
        const geometry = getRouteGeometryForMap(route);
        setRouteGeometry(geometry);
        console.log(
          'Route geometry loaded:',
          geometry ? `${geometry.coordinates.length} points` : 'null'
        );
      } else {
        setRouteGeometry(null);
        console.log('No active route found');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [childId, student]);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000); // Update every 30 seconds to keep "ago" time fresh
    return () => clearInterval(interval);
  }, []);

  const getSecondsAgo = () => {
    if (!lastUpdate) return 0;
    return Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
  };

  const secondsAgo = getSecondsAgo();
  const isStale = secondsAgo > 60; // Consider stale if > 60 seconds

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Not available';

    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    return lastUpdate.toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return theme.colors.success;
      case 'pending':
        return theme.colors.warning;
      case 'rejected':
        return theme.colors.error;
      default:
        return theme.colors.text.secondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading tracking information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !student) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || 'Student data not available'}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.studentName} numberOfLines={1}>
            {student.name}
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(student.status) + '15' },
              ]}>
              <View
                style={[styles.statusDot, { backgroundColor: getStatusColor(student.status) }]}
              />
              <Text style={[styles.statusText, { color: getStatusColor(student.status) }]}>
                {student.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>DRIVER</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {student.driverName}
          </Text>
        </View>
        <View style={styles.verticalDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>LAST UPDATE</Text>
          <Text style={[styles.infoValue, isStale && { color: theme.colors.error }]}>
            {formatLastUpdate()}
          </Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <TrackingMap
          homeLocation={student.homeLocation}
          schoolLocation={student.schoolLocation}
          driverLocation={driverLocation}
          studentName={student.name}
          loading={false}
          error={null}
          routeGeometry={routeGeometry}
          isStale={isStale}
          formattedLastUpdate={formatLastUpdate()}
        />
        <View style={styles.liveIndicator}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveText}>LIVE TRACKING</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  headerContent: {
    flex: 1,
  },
  studentName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text.primary,
    letterSpacing: -0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoBar: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 4,
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
    marginRight: 8,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.text.primary,
    letterSpacing: 1,
  },
});
