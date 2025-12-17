import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Student } from '../types/types';
import { theme } from '../theme/theme';

type Props = {
  student: Student;
  onPress: (student: Student) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return theme.colors.success;
    case 'pending':
      return '#F59E0B'; // Warning Orange
    case 'rejected':
      return theme.colors.error;
    default:
      return theme.colors.text.secondary;
  }
};

const getStatusText = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

const StudentListItem: React.FC<Props> = ({ student, onPress, onApprove, onReject }) => {
  const status = student.status ?? 'pending';
  const statusColor = getStatusColor(status);

  return (
    <TouchableOpacity
      key={student.id}
      style={styles.card}
      onPress={() => onPress(student)}
      activeOpacity={0.7}>
      {/* Header: Avatar, Name, Status */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.name} numberOfLines={1}>
            {student.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{getStatusText(status)}</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
      </View>

      <View style={styles.divider} />

      {/* Student Details Grid */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.statText}>{student.age ? `${student.age} years` : 'N/A'}</Text>
        </View>
        <View style={styles.verticalDivider} />
        <View style={styles.statItem}>
          <Ionicons name="school-outline" size={16} color="#6B7280" />
          <Text style={styles.statText}>{student.grade ?? 'Grade N/A'}</Text>
        </View>
      </View>

      {/* Parent Details */}
      <View style={styles.parentContainer}>
        <View style={styles.parentRow}>
          <Ionicons name="person-outline" size={14} color="#9CA3AF" style={styles.iconFixed} />
          <Text style={styles.parentText} numberOfLines={1}>
            {student.parentName ?? 'No Parent Name'}
          </Text>
        </View>
        <View style={styles.parentRow}>
          <Ionicons name="call-outline" size={14} color="#9CA3AF" style={styles.iconFixed} />
          <Text style={styles.parentText} numberOfLines={1}>
            {student.parentPhone ?? 'No Phone'}
          </Text>
        </View>
      </View>

      {/* Action Area */}
      {status === 'pending' ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={(e) => {
              e.stopPropagation();
              onReject(student.id);
            }}>
            <Ionicons name="close" size={18} color={theme.colors.error} />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.approveButton}
            onPress={(e) => {
              e.stopPropagation();
              onApprove(student.id);
            }}>
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.footerRow}>
          <Text style={styles.tapHint}>Tap to view details & locations</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  headerContent: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  verticalDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E5E7EB',
  },
  statText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  parentContainer: {
    marginBottom: 16,
    gap: 6,
    paddingHorizontal: 4,
  },
  parentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconFixed: {
    width: 20,
    textAlign: 'center',
    marginRight: 8,
  },
  parentText: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 6,
  },
  rejectButtonText: {
    color: theme.colors.error,
    fontWeight: '600',
    fontSize: 14,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  footerRow: {
    alignItems: 'center',
    marginTop: -8,
  },
  tapHint: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});

export default StudentListItem;
