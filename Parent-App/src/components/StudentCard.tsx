import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Student, ChildStatus } from '../types/types';
import { theme } from '../theme/theme';

interface StudentCardProps {
  student: Student;
  childStatus: ChildStatus | null;
  onPress: (student: Student) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({ student, childStatus, onPress }) => {
  // Get status color based on current location
  const getStatusColor = () => {
    if (!childStatus) return theme.colors.text.secondary;

    switch (childStatus.currentStatus) {
      case 'AT_HOME':
        return theme.colors.primary; // Blue
      case 'IN_VAN':
        return theme.colors.warning; // Orange
      case 'AT_SCHOOL':
        return theme.colors.success; // Green
      default:
        return theme.colors.text.secondary;
    }
  };

  // Get status label
  const getStatusLabel = () => {
    if (!childStatus) return 'Status Unknown';

    switch (childStatus.currentStatus) {
      case 'AT_HOME':
        return 'At Home';
      case 'IN_VAN':
        return 'In Van';
      case 'AT_SCHOOL':
        return 'At School';
      default:
        return 'Unknown';
    }
  };

  // Get van status text
  const getVanStatus = () => {
    if (!childStatus) return 'No trip today';

    const { morningPickup, schoolDropoff, schoolPickup, homeDropoff, currentStatus } = childStatus;

    if (currentStatus === 'IN_VAN') {
      if (morningPickup.status === 'COMPLETED' && schoolDropoff.status !== 'COMPLETED') {
        return '🚐 Morning trip - En route to school';
      }
      if (schoolPickup.status === 'COMPLETED' && homeDropoff.status !== 'COMPLETED') {
        return '🚐 Afternoon trip - En route home';
      }
      return '🚐 Active trip';
    }

    if (morningPickup.status === 'PENDING') {
      return '⏰ Morning pickup pending';
    }

    if (schoolPickup.status === 'PENDING' && schoolDropoff.status === 'COMPLETED') {
      return '⏰ Afternoon pickup pending';
    }

    if (homeDropoff.status === 'COMPLETED') {
      return '✅ All trips completed';
    }

    return 'No active trip';
  };

  // Format time from timestamp
  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Get school times
  const getSchoolTimes = () => {
    if (!childStatus) return { morning: '--:--', afternoon: '--:--' };

    return {
      morning: formatTime(childStatus.morningPickup.time),
      afternoon: formatTime(childStatus.schoolPickup.time),
    };
  };

  const schoolTimes = getSchoolTimes();
  const statusColor = getStatusColor();
  const canTrack = student.status === 'approved' && student.driverId;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(student)}
      activeOpacity={0.7}
      disabled={!canTrack}>
      {/* Header with name and status */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>👦</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.studentName}>{student.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel()}</Text>
          </View>
        </View>
      </View>

      {/* School times */}
      <View style={styles.timesContainer}>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>🌅 Morning Pickup</Text>
          <Text style={styles.timeValue}>{schoolTimes.morning}</Text>
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>🌆 Afternoon Pickup</Text>
          <Text style={styles.timeValue}>{schoolTimes.afternoon}</Text>
        </View>
      </View>

      {/* Van status */}
      <View style={styles.vanStatusContainer}>
        <Text style={styles.vanStatusText}>{getVanStatus()}</Text>
      </View>

      {/* Action hint */}
      {canTrack ? (
        <Text style={styles.actionHint}>Tap to track on map</Text>
      ) : (
        <Text style={styles.actionHintDisabled}>
          {student.status !== 'approved' ? 'Pending approval' : 'No driver assigned'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: 24,
  },
  headerInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timesContainer: {
    marginBottom: theme.spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  timeLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  vanStatusContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  vanStatusText: {
    fontSize: 13,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  actionHint: {
    fontSize: 12,
    color: theme.colors.primary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionHintDisabled: {
    fontSize: 12,
    color: theme.colors.text.light,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
