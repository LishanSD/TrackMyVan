import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Student, ChildStatus } from '../../src/types/types';
import { subscribeToParentStudents } from '../../src/services/childrenService';
import { getChildStatusTodayOrDefault } from '../../src/services/childStatusService';
import { StudentCard } from '../../src/components/StudentCard';
import { theme } from '../../src/theme/theme';

export default function DashboardScreen() {
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [childStatuses, setChildStatuses] = useState<Map<string, ChildStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChildStatuses(students);
    setRefreshing(false);
  };

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
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }>
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Hello, Parent</Text>
            <Text style={styles.dashboardTitle}>Dashboard</Text>
          </View>
          {userProfile?.profilePic ? (
            <Image source={{ uri: userProfile.profilePic }} style={styles.profilePic} />
          ) : (
            <View style={styles.placeholderPic}>
              <Ionicons name="person" size={20} color="#9CA3AF" />
            </View>
          )}
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={20} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Student Cards Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Children</Text>
        </View>

        {students.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="happy-outline" size={40} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyText}>No students added yet</Text>
            <Text style={styles.emptySubtext}>
              Add children from the Children tab to start tracking.
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

        {/* Info Tip */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.infoBoxText}>
            Pull down to refresh • Tap a card for live map tracking
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  dashboardTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  profilePic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  placeholderPic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
    fontWeight: '500',
    flex: 1,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    maxWidth: 200,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoBoxText: {
    fontSize: 12,
    color: '#1E40AF', // Darker blue
    fontWeight: '500',
  },
});
