import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Student, ChildStatus } from '../../src/types/types';
import { subscribeToParentStudents } from '../../src/services/childrenService';
import { getChildStatusTodayOrDefault } from '../../src/services/childStatusService';
import { StudentCard } from '../../src/components/StudentCard';
import { theme } from '../../src/theme/theme';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [childStatuses, setChildStatuses] = useState<Map<string, ChildStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch child statuses for all students
  const fetchChildStatuses = async (studentList: Student[]) => {
    try {
      const statusMap = new Map<string, ChildStatus>();

      await Promise.all(
        studentList.map(async (student) => {
          const status = await getChildStatusTodayOrDefault(student.id);
          statusMap.set(student.id, status);
        })
      );

      setChildStatuses(statusMap);
    } catch (err) {
      console.error('Error fetching child statuses:', err);
    }
  };

  // Subscribe to parent's students
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsubscribe = subscribeToParentStudents(
      user.uid,
      async (studentList) => {
        setStudents(studentList);
        await fetchChildStatuses(studentList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError('Failed to load students');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChildStatuses(students);
    setRefreshing(false);
  };

  // Handle card click with validation
  const handleCardClick = (student: Student) => {
    if (student.status !== 'approved') {
      Alert.alert(
        'Not Approved',
        'This student is pending driver approval. Tracking will be available once approved.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!student.driverId) {
      Alert.alert(
        'No Van Assigned',
        'This student has no assigned driver. Please assign a driver to enable tracking.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to tracking screen
    router.push(`/tracking/${student.id}` as const);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.dashboardTitle}>Dashboard</Text>
            <Text style={styles.dashboardSubtitle}>Track your children's van in real-time</Text>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* Student Cards */}
          {students.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No students added yet</Text>
              <Text style={styles.emptySubtext}>
                Add children from the Children tab to track their van
              </Text>
            </View>
          ) : (
            <View style={styles.cardsContainer}>
              {students.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  childStatus={childStatuses.get(student.id) || null}
                  onPress={handleCardClick}
                />
              ))}
            </View>
          )}

          {/* Quick Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              Pull down to refresh • Tap cards to view live tracking
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  dashboardTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  errorBanner: {
    backgroundColor: theme.colors.error + '20',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
    fontWeight: '500',
  },
  cardsContainer: {
    marginBottom: theme.spacing.md,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  infoBox: {
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '10',
    padding: theme.spacing.md,
  },
  infoBoxText: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});
