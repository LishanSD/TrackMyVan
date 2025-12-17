import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChildStatus, PickupStatus } from '../types/types';
import { theme } from '../theme/theme';

type Props = {
  attendanceHistory: ChildStatus[];
  loading: boolean;
  error: string | null;
};

const getCurrentStatusColor = (status: ChildStatus['currentStatus']) => {
  switch (status) {
    case 'AT_HOME':
      return theme.colors.success;
    case 'IN_VAN':
      return theme.colors.primary;
    case 'AT_SCHOOL':
      return theme.colors.secondary;
    default:
      return theme.colors.text.secondary;
  }
};

const getPickupStatusColor = (status: PickupStatus['status']) => {
  switch (status) {
    case 'COMPLETED':
      return theme.colors.success;
    case 'IN_PROGRESS':
      return theme.colors.primary;
    case 'SKIPPED':
      return theme.colors.error;
    default:
      return '#F59E0B'; // Warning color
  }
};

const formatTimestamp = (value?: number | { seconds: number; nanoseconds: number }) => {
  if (!value && value !== 0) return '—';
  const date =
    typeof value === 'number'
      ? new Date(value)
      : new Date(value.seconds * 1000 + value.nanoseconds / 1_000_000);

  return isNaN(date.getTime())
    ? '—'
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateLabel = (dateString?: string) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

const AttendanceHistory: React.FC<Props> = ({ attendanceHistory, loading, error }) => {
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.subtext}>Loading recent records...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={24} color={theme.colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (attendanceHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.subtext}>No attendance records available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {attendanceHistory.map((record) => {
        const currentStatus = record.currentStatus ?? 'AT_HOME';

        // Clean status text for display
        const displayStatus = currentStatus.replace(/_/g, ' ').toLowerCase();

        return (
          <View key={record.date} style={styles.card}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={16} color="#4B5563" />
                <Text style={styles.dateText}>{formatDateLabel(record.date)}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getCurrentStatusColor(currentStatus) + '15' },
                ]}>
                <Text style={[styles.statusText, { color: getCurrentStatusColor(currentStatus) }]}>
                  {displayStatus}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Timeline Events */}
            <View style={styles.eventsContainer}>
              <EventRow icon="sunny-outline" label="Morning Pickup" data={record.morningPickup} />
              <EventRow icon="school-outline" label="School Drop-off" data={record.schoolDropoff} />
              <EventRow icon="bus-outline" label="School Pickup" data={record.schoolPickup} />
              <EventRow icon="home-outline" label="Home Drop-off" data={record.homeDropoff} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

// Helper Component for consistent rows
const EventRow = ({ icon, label, data }: { icon: any; label: string; data: any }) => {
  const status = data?.status ?? 'PENDING';
  const displayStatus = status.replace(/_/g, ' ').toLowerCase();
  const color = getPickupStatusColor(status);

  return (
    <View style={styles.eventRow}>
      <View style={styles.eventLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={14} color="#6B7280" />
        </View>
        <View>
          <Text style={styles.eventLabel}>{label}</Text>
          <Text style={styles.eventTime}>{formatTimestamp(data?.time)}</Text>
        </View>
      </View>

      <View style={[styles.miniBadge, { backgroundColor: color + '15' }]}>
        <Text style={[styles.miniBadgeText, { color: color }]}>{displayStatus}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  centerContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  subtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.error,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  eventsContainer: {
    gap: 12,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  eventTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});

export default AttendanceHistory;
