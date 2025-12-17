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

  // Get status icon
  const getStatusIcon = () => {
    if (!childStatus) return '❓';

    switch (childStatus.currentStatus) {
      case 'AT_HOME':
        return '🏠';
      case 'IN_VAN':
        return '🚐';
      case 'AT_SCHOOL':
        return '🏫';
      default:
        return '❓';
    }
  };

  // Get van status text
  const getVanStatus = () => {
    if (
      !childStatus ||
      !childStatus.morningPickup ||
      !childStatus.schoolDropoff ||
      !childStatus.schoolPickup ||
      !childStatus.homeDropoff
    ) {
      return { text: 'No trip scheduled', icon: '📅' };
    }

    const { morningPickup, schoolDropoff, schoolPickup, homeDropoff, currentStatus } = childStatus;

    if (currentStatus === 'IN_VAN') {
      if (morningPickup.status === 'COMPLETED' && schoolDropoff.status !== 'COMPLETED') {
        return { text: 'En route to school', icon: '🚐' };
      }
      if (schoolPickup.status === 'COMPLETED' && homeDropoff.status !== 'COMPLETED') {
        return { text: 'En route home', icon: '🚐' };
      }
      return { text: 'Active trip', icon: '🚐' };
    }

    if (morningPickup.status === 'PENDING') {
      return { text: 'Awaiting morning pickup', icon: '⏰' };
    }

    if (schoolPickup.status === 'PENDING' && schoolDropoff.status === 'COMPLETED') {
      return { text: 'Awaiting afternoon pickup', icon: '⏰' };
    }

    if (homeDropoff.status === 'COMPLETED') {
      return { text: 'All trips completed', icon: '✅' };
    }

    return { text: 'No active trip', icon: '📍' };
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
      morning: formatTime(childStatus.morningPickup?.time),
      afternoon: formatTime(childStatus.schoolPickup?.time),
    };
  };

  const schoolTimes = getSchoolTimes();
  const statusColor = getStatusColor();
  const canTrack = student.status === 'approved' && student.driverId;
  const vanStatus = getVanStatus();

  return (
    <TouchableOpacity
      style={[styles.card, !canTrack && styles.cardDisabled]}
      onPress={() => onPress(student)}
      activeOpacity={0.7}
      disabled={!canTrack}>
      {/* Header with name and prominent status */}
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <View style={[styles.avatarContainer, { backgroundColor: statusColor + '15' }]}>
            <Text style={styles.avatarEmoji}>{getStatusIcon()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.gradeText}>Grade {student.grade}</Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + '20', borderColor: statusColor },
          ]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel()}</Text>
        </View>
      </View>

      {/* Van Status - Prominent */}
      <View style={[styles.vanStatusCard, { borderLeftColor: statusColor }]}>
        <Text style={styles.vanStatusIcon}>{vanStatus.icon}</Text>
        <View style={styles.vanStatusInfo}>
          <Text style={styles.vanStatusLabel}>Current Status</Text>
          <Text style={styles.vanStatusText}>{vanStatus.text}</Text>
        </View>
      </View>

      {/* School times in compact format */}
      <View style={styles.timesContainer}>
        <View style={styles.timeCard}>
          <Text style={styles.timeIcon}>🌅</Text>
          <View style={styles.timeInfo}>
            <Text style={styles.timeLabel}>Morning</Text>
            <Text style={styles.timeValue}>{schoolTimes.morning}</Text>
          </View>
        </View>
        <View style={styles.timeDivider} />
        <View style={styles.timeCard}>
          <Text style={styles.timeIcon}>🌆</Text>
          <View style={styles.timeInfo}>
            <Text style={styles.timeLabel}>Afternoon</Text>
            <Text style={styles.timeValue}>{schoolTimes.afternoon}</Text>
          </View>
        </View>
      </View>

      {/* Action hint with icon */}
      <View style={styles.actionContainer}>
        {canTrack ? (
          <View style={styles.actionHintContainer}>
            <Text style={styles.actionIcon}>📍</Text>
            <Text style={styles.actionHint}>Tap to view live tracking</Text>
          </View>
        ) : (
          <View style={styles.actionHintContainer}>
            <Text style={styles.actionIconDisabled}>⚠️</Text>
            <Text style={styles.actionHintDisabled}>
              {student.status !== 'approved' ? 'Pending driver approval' : 'No driver assigned'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border + '40',
  },
  cardDisabled: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  headerInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 19,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  gradeText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Van Status Card
  vanStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
  },
  vanStatusIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  vanStatusInfo: {
    flex: 1,
  },
  vanStatusLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  vanStatusText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },

  // Times Container
  timesContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  timeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
  },
  timeDivider: {
    width: theme.spacing.sm,
  },
  timeIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  timeInfo: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },

  // Action Container
  actionContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '40',
    paddingTop: theme.spacing.sm,
  },
  actionHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  actionIconDisabled: {
    fontSize: 14,
    marginRight: 6,
  },
  actionHint: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  actionHintDisabled: {
    fontSize: 12,
    color: theme.colors.text.light,
    fontWeight: '500',
  },
});
