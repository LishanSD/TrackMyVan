import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
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

const formatCurrentStatus = (status: ChildStatus['currentStatus']) => status.replace(/_/g, ' ');

const getPickupStatusColor = (status: PickupStatus['status']) => {
  switch (status) {
    case 'COMPLETED':
      return theme.colors.success;
    case 'IN_PROGRESS':
      return theme.colors.primary;
    case 'SKIPPED':
      return theme.colors.error;
    default:
      return theme.colors.warning;
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
      <View style={styles.attendanceLoading}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.attendanceSubtext}>Loading recent records...</Text>
      </View>
    );
  }

  if (error) {
    return <Text style={styles.attendanceError}>{error}</Text>;
  }

  if (attendanceHistory.length === 0) {
    return <Text style={styles.attendanceSubtext}>No attendance records yet.</Text>;
  }

  return (
    <>
      {attendanceHistory.map((record) => {
        const currentStatus = record.currentStatus ?? 'AT_HOME';
        return (
          <View key={record.date} style={styles.attendanceCard}>
            <View style={styles.attendanceHeader}>
              <Text style={styles.attendanceDate}>{formatDateLabel(record.date)}</Text>
              <View
                style={[
                  styles.attendanceChip,
                  {
                    backgroundColor: getCurrentStatusColor(currentStatus) + '20',
                  },
                ]}>
                <Text
                  style={[
                    styles.attendanceChipText,
                    { color: getCurrentStatusColor(currentStatus) },
                  ]}>
                  {formatCurrentStatus(currentStatus)}
                </Text>
              </View>
            </View>

            <View style={styles.attendanceRow}>
              <View>
                <Text style={styles.attendanceLabel}>Morning pickup</Text>
                <Text style={styles.attendanceTime}>
                  {formatTimestamp(record.morningPickup?.time)}
                </Text>
              </View>
              <View
                style={[
                  styles.attendanceChip,
                  {
                    backgroundColor:
                      getPickupStatusColor(record.morningPickup?.status ?? 'PENDING') + '20',
                  },
                ]}>
                <Text
                  style={[
                    styles.attendanceChipText,
                    {
                      color: getPickupStatusColor(record.morningPickup?.status ?? 'PENDING'),
                    },
                  ]}>
                  {record.morningPickup?.status ?? 'PENDING'}
                </Text>
              </View>
            </View>

            <View style={styles.attendanceRow}>
              <View>
                <Text style={styles.attendanceLabel}>School drop-off</Text>
                <Text style={styles.attendanceTime}>
                  {formatTimestamp(record.schoolDropoff?.time)}
                </Text>
              </View>
              <View
                style={[
                  styles.attendanceChip,
                  {
                    backgroundColor:
                      getPickupStatusColor(record.schoolDropoff?.status ?? 'PENDING') + '20',
                  },
                ]}>
                <Text
                  style={[
                    styles.attendanceChipText,
                    {
                      color: getPickupStatusColor(record.schoolDropoff?.status ?? 'PENDING'),
                    },
                  ]}>
                  {record.schoolDropoff?.status ?? 'PENDING'}
                </Text>
              </View>
            </View>

            <View style={styles.attendanceRow}>
              <View>
                <Text style={styles.attendanceLabel}>School pickup</Text>
                <Text style={styles.attendanceTime}>
                  {formatTimestamp(record.schoolPickup?.time)}
                </Text>
              </View>
              <View
                style={[
                  styles.attendanceChip,
                  {
                    backgroundColor:
                      getPickupStatusColor(record.schoolPickup?.status ?? 'PENDING') + '20',
                  },
                ]}>
                <Text
                  style={[
                    styles.attendanceChipText,
                    {
                      color: getPickupStatusColor(record.schoolPickup?.status ?? 'PENDING'),
                    },
                  ]}>
                  {record.schoolPickup?.status ?? 'PENDING'}
                </Text>
              </View>
            </View>

            <View style={styles.attendanceRow}>
              <View>
                <Text style={styles.attendanceLabel}>Home drop-off</Text>
                <Text style={styles.attendanceTime}>
                  {formatTimestamp(record.homeDropoff?.time)}
                </Text>
              </View>
              <View
                style={[
                  styles.attendanceChip,
                  {
                    backgroundColor:
                      getPickupStatusColor(record.homeDropoff?.status ?? 'PENDING') + '20',
                  },
                ]}>
                <Text
                  style={[
                    styles.attendanceChipText,
                    {
                      color: getPickupStatusColor(record.homeDropoff?.status ?? 'PENDING'),
                    },
                  ]}>
                  {record.homeDropoff?.status ?? 'PENDING'}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  attendanceLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  attendanceSubtext: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  attendanceError: {
    fontSize: 13,
    color: theme.colors.error,
  },
  attendanceCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  attendanceDate: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  attendanceLabel: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  attendanceTime: {
    fontSize: 12,
    color: theme.colors.text.light,
  },
  attendanceChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  attendanceChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AttendanceHistory;
