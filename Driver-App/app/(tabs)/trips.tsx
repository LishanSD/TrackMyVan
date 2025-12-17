import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { fetchDriverTrips, fetchStudentsByIds } from '../../src/services/tripService';
import { Student, Trip } from '../../src/types/types';
import { theme } from '../../src/theme/theme';

const formatDate = (date?: string) => {
  if (!date) return 'Unknown date';
  const parsed = new Date(date);
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const toDate = (value?: number | { seconds: number; nanoseconds: number }) => {
  if (!value) return null;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'object' && 'seconds' in value) {
    return new Date(value.seconds * 1000 + (value.nanoseconds ?? 0) / 1_000_000);
  }
  return null;
};

const formatTime = (value?: number | { seconds: number; nanoseconds: number }) => {
  const d = toDate(value);
  if (!d) return 'Not recorded';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (
  start?: number | { seconds: number; nanoseconds: number },
  end?: number | { seconds: number; nanoseconds: number }
) => {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return 'N/A';
  const minutes = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining === 0 ? `${hours} hr` : `${hours} hr ${remaining} min`;
};

const statusColor = (status: Trip['status']) => {
  switch (status) {
    case 'COMPLETED':
      return theme.colors.success;
    case 'CANCELLED':
      return theme.colors.error;
    case 'IN_PROGRESS':
      return theme.colors.primary;
    default:
      return theme.colors.warning;
  }
};

export default function TripsScreen() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [studentsByTrip, setStudentsByTrip] = useState<Record<string, Student[]>>({});
  const [studentsLoading, setStudentsLoading] = useState<Record<string, boolean>>({});

  const loadTrips = useCallback(
    async (isRefresh = false) => {
      if (!user) return;
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const data = await fetchDriverTrips(user.uid);
        setTrips(data);
      } catch (err: any) {
        setError(err?.message ?? 'Unable to load trips');
      } finally {
        isRefresh ? setRefreshing(false) : setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const pastTrips = useMemo(() => {
    const getTripTimestamp = (trip: Trip) => {
      const dateTs = trip.date ? new Date(trip.date).getTime() : 0;
      const startTs = trip.startTime ? (toDate(trip.startTime)?.getTime() ?? 0) : 0;
      const endTs = trip.endTime ? (toDate(trip.endTime)?.getTime() ?? 0) : 0;
      return Math.max(dateTs, startTs, endTs);
    };

    return trips
      .filter((t) => t.status !== 'IN_PROGRESS')
      .sort((a, b) => getTripTimestamp(b) - getTripTimestamp(a));
  }, [trips]);

  const filteredTrips = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return pastTrips;
    return pastTrips.filter((trip) => {
      const fields = [
        trip.date ?? '',
        trip.type ?? '',
        trip.status ?? '',
        trip.notes ?? '',
        String(trip.children?.length ?? ''),
      ];
      return fields.some((field) => field.toLowerCase().includes(term));
    });
  }, [pastTrips, search]);

  const loadTripStudents = useCallback(
    async (trip: Trip) => {
      if (!trip.children || trip.children.length === 0 || studentsByTrip[trip.id]) return;
      setStudentsLoading((prev) => ({ ...prev, [trip.id]: true }));
      try {
        const data = await fetchStudentsByIds(trip.children);
        setStudentsByTrip((prev) => ({ ...prev, [trip.id]: data }));
      } catch (e) {
        // noop; fallback messaging in UI
      } finally {
        setStudentsLoading((prev) => ({ ...prev, [trip.id]: false }));
      }
    },
    [studentsByTrip]
  );

  const onToggleExpand = (trip: Trip) => {
    const nextId = expandedTripId === trip.id ? null : trip.id;
    setExpandedTripId(nextId);
    if (nextId) {
      loadTripStudents(trip);
    }
  };

  const renderTrip = useCallback(
    ({ item }: { item: Trip }) => {
      const childrenCount = item.children?.length ?? 0;
      const isExpanded = expandedTripId === item.id;
      const studentList = studentsByTrip[item.id];
      const studentsAreLoading = studentsLoading[item.id];
      return (
        <TripCard
          trip={item}
          isExpanded={isExpanded}
          childrenCount={childrenCount}
          studentList={studentList}
          studentsAreLoading={!!studentsAreLoading}
          onToggle={() => onToggleExpand(item)}
        />
      );
    },
    [expandedTripId, onToggleExpand, studentsByTrip, studentsLoading]
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.emptyText}>Loading trips...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadTrips()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No past trips found yet.</Text>
        <Text style={styles.helperText}>Completed trips will appear here.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trips</Text>
        <Text style={styles.subtitle}>Review your completed trips</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by date, type, status, notes..."
          placeholderTextColor={theme.colors.text.light}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        renderItem={renderTrip}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          filteredTrips.length === 0 ? styles.listEmptyContainer : styles.listContainer
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadTrips(true)} />
        }
        initialNumToRender={8}
        windowSize={10}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

type TripCardProps = {
  trip: Trip;
  isExpanded: boolean;
  childrenCount: number;
  studentList?: Student[];
  studentsAreLoading: boolean;
  onToggle: () => void;
};

const TripCard = React.memo(
  ({
    trip,
    isExpanded,
    childrenCount,
    studentList,
    studentsAreLoading,
    onToggle,
  }: TripCardProps) => {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onToggle}>
        <View style={[styles.card, isExpanded && styles.cardExpanded]}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateText}>{formatDate(trip.date)}</Text>
              <Text style={styles.subText}>
                {trip.type === 'MORNING' ? 'Morning trip' : 'Afternoon trip'}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor(trip.status) }]}>
              <Text style={styles.badgeText}>{trip.status.replace(/_/g, ' ')}</Text>
            </View>
          </View>

          <View style={styles.rowCompact}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Start</Text>
              <Text style={styles.value}>{formatTime(trip.startTime)}</Text>
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>End</Text>
              <Text style={styles.value}>{formatTime(trip.endTime)}</Text>
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Duration</Text>
              <Text style={styles.value}>{formatDuration(trip.startTime, trip.endTime)}</Text>
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Students</Text>
              <Text style={styles.value}>{childrenCount}</Text>
            </View>
          </View>

          {isExpanded && (
            <View style={styles.details}>
              <Text style={styles.detailsTitle}>Trip details</Text>
              {trip.notes ? (
                <View style={styles.notes}>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text style={styles.notesText}>{trip.notes}</Text>
                </View>
              ) : null}

              <Text style={[styles.notesLabel, { marginTop: 8 }]}>Students</Text>
              {studentsAreLoading ? (
                <Text style={styles.helperText}>Loading students...</Text>
              ) : studentList && studentList.length > 0 ? (
                studentList.map((student) => (
                  <Text key={student.id} style={styles.studentItem}>
                    • {student.name ?? 'Unnamed'} ({student.id})
                  </Text>
                ))
              ) : (
                <Text style={styles.helperText}>
                  {childrenCount === 0 ? 'No students assigned' : 'Students not available'}
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }
);

TripCard.displayName = 'TripCard';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    color: theme.colors.text.primary,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  listEmptyContainer: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardExpanded: {
    borderColor: theme.colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  subText: {
    color: theme.colors.text.secondary,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  rowCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  rowItem: {
    flexGrow: 1,
    minWidth: '45%',
    paddingVertical: 6,
  },
  label: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  value: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  details: {
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  detailsTitle: {
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  notes: {
    marginTop: theme.spacing.xs,
    padding: theme.spacing.sm,
    backgroundColor: '#f3f4f6',
    borderRadius: theme.borderRadius.md,
  },
  notesLabel: {
    fontWeight: '700',
    marginBottom: 4,
    color: theme.colors.text.primary,
  },
  notesText: {
    color: theme.colors.text.secondary,
  },
  studentItem: {
    color: theme.colors.text.primary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  helperText: {
    marginTop: 6,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
