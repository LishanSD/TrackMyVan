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
  const getStatusColor = () => {
    if (!childStatus) return theme.colors.text.secondary;

    switch (childStatus.currentStatus) {
      case 'AT_HOME':
        return theme.colors.primary;
      case 'IN_VAN':
        return theme.colors.warning;
      case 'AT_SCHOOL':
        return theme.colors.success;
      default:
        return theme.colors.text.secondary;
    }
  };

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

  const getVanStatus = () => {
    if (!childStatus) {
      return { text: 'No trip scheduled', icon: '📅' };
    }

    const { morningPickup, schoolDropoff, schoolPickup, homeDropoff, currentStatus } = childStatus;

    // Check if any pickup/dropoff data exists
    if (!morningPickup || !schoolDropoff || !schoolPickup || !homeDropoff) {
      return { text: 'No trip scheduled', icon: '📅' };
    }

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

  const formatTime = (timestamp?: number | { seconds: number; nanoseconds?: number }): string => {
    if (!timestamp) return '--:--';
    
    let timeInMillis: number;
    if (typeof timestamp === 'number') {
      timeInMillis = timestamp;
    } else if (typeof timestamp === 'object' && 'seconds' in timestamp) {
      // Handle Firestore timestamp format
      timeInMillis = timestamp.seconds * 1000 + ((timestamp.nanoseconds ?? 0) / 1_000_000);
    } else {
      return '--:--';
    }
    
    if (timeInMillis <= 0 || isNaN(timeInMillis)) return '--:--';
    const date = new Date(timeInMillis);
    if (isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

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
      activeOpacity={0.8}
      disabled={!canTrack}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <View style={[styles.avatarContainer, { backgroundColor: statusColor + '10' }]}>
            <Text style={styles.avatarEmoji}>{getStatusIcon()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.studentName} numberOfLines={1}>
              {student.name}
            </Text>
            <Text style={styles.gradeText}>Grade {student.grade}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusLabel().toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={[styles.vanStatusCard, { borderLeftColor: statusColor }]}>
        <View style={styles.vanStatusRow}>
          <Text style={styles.vanStatusIcon}>{vanStatus.icon}</Text>
          <View style={styles.vanStatusInfo}>
            <Text style={styles.vanStatusLabel}>ACTIVITY</Text>
            <Text style={styles.vanStatusText} numberOfLines={1}>
              {vanStatus.text}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.timesContainer}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>MORNING PICKUP</Text>
          <View style={styles.timeValueRow}>
            <Text style={styles.timeSmallIcon}>🌅</Text>
            <Text style={styles.timeValue}>{schoolTimes.morning}</Text>
          </View>
        </View>
        <View style={styles.verticalDivider} />
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>SCHOOL PICKUP</Text>
          <View style={styles.timeValueRow}>
            <Text style={styles.timeSmallIcon}>🌆</Text>
            <Text style={styles.timeValue}>{schoolTimes.afternoon}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionFooter}>
        {canTrack ? (
          <View style={styles.actionHintContainer}>
            <Text style={styles.actionHint}>Live Tracking Available</Text>
            <Text style={styles.actionArrow}>›</Text>
          </View>
        ) : (
          <View style={styles.actionHintContainer}>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  cardDisabled: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  headerInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1C1E',
    letterSpacing: -0.3,
  },
  gradeText: {
    fontSize: 13,
    color: '#6C757D',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  vanStatusCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  vanStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vanStatusIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  vanStatusInfo: {
    flex: 1,
  },
  vanStatusLabel: {
    fontSize: 9,
    color: '#ADB5BD',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  vanStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212529',
  },
  timesContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F3F5',
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#F1F3F5',
  },
  timeLabel: {
    fontSize: 9,
    color: '#ADB5BD',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeSmallIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  actionFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
    paddingTop: 12,
  },
  actionHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionHint: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  actionArrow: {
    fontSize: 16,
    color: theme.colors.primary,
    marginLeft: 6,
    fontWeight: 'bold',
  },
  actionHintDisabled: {
    fontSize: 12,
    color: '#ADB5BD',
    fontWeight: '600',
  },
});
