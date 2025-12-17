import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../src/config/firebaseConfig';
import { subscribeToDriverLocation } from '../../src/services/locationService';
import { TrackingMap } from '../../src/components/TrackingMap';
import { Student, DriverLocation } from '../../src/types/types';
import { theme } from '../../src/theme/theme';

export default function TrackingScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch student data
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

  // Subscribe to driver location updates
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

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Not available';

    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIconButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.studentName}>{student.name}</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(student.status) + '20' },
              ]}>
              <Text style={[styles.statusText, { color: getStatusColor(student.status) }]}>
                {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Info Bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Driver:</Text>
          <Text style={styles.infoValue}>{student.driverName}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Last Update:</Text>
          <Text style={styles.infoValue}>{formatLastUpdate()}</Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <TrackingMap
          homeLocation={student.homeLocation}
          schoolLocation={student.schoolLocation}
          driverLocation={driverLocation}
          studentName={student.name}
          loading={false}
          error={null}
        />
      </View>

      {/* Location Details */}
      <View style={styles.detailsContainer}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>📍 Locations</Text>

            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>🏠</Text>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Home</Text>
                <Text style={styles.locationCoords}>
                  {student.homeLocation.latitude.toFixed(6)},{' '}
                  {student.homeLocation.longitude.toFixed(6)}
                </Text>
              </View>
            </View>

            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>🏫</Text>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>School</Text>
                <Text style={styles.locationCoords}>
                  {student.schoolLocation.latitude.toFixed(6)},{' '}
                  {student.schoolLocation.longitude.toFixed(6)}
                </Text>
              </View>
            </View>

            {driverLocation && (
              <View style={styles.locationRow}>
                <Text style={styles.locationIcon}>🚐</Text>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Van (Current)</Text>
                  <Text style={styles.locationCoords}>
                    {driverLocation.lat.toFixed(6)}, {driverLocation.lng.toFixed(6)}
                  </Text>
                  <Text style={styles.bearingText}>Heading: {driverLocation.bearing}°</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
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
    padding: theme.spacing.xl,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backIconButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  backIcon: {
    fontSize: 24,
    color: theme.colors.primary,
  },
  headerContent: {
    flex: 1,
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Info Bar
  infoBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  divider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },

  // Map
  mapContainer: {
    flex: 1,
    minHeight: 300,
  },

  // Details
  detailsContainer: {
    maxHeight: 200,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailCard: {
    padding: theme.spacing.md,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '40',
  },
  locationIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontFamily: 'monospace',
  },
  bearingText: {
    fontSize: 11,
    color: theme.colors.text.light,
    marginTop: 2,
  },
});
