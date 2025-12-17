import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
      return theme.colors.warning;
    case 'rejected':
      return theme.colors.error;
    default:
      return theme.colors.text.secondary;
  }
};

const getStatusText = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

const StudentListItem: React.FC<Props> = ({ student, onPress, onApprove, onReject }) => {
  const status = student.status ?? 'pending';

  return (
    <TouchableOpacity
      key={student.id}
      style={styles.studentCard}
      onPress={() => onPress(student)}
      activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.studentName}>{student.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
            {getStatusText(status)}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Age:</Text>
        <Text style={styles.value}>{student.age ? `${student.age} years` : 'N/A'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Grade:</Text>
        <Text style={styles.value}>{student.grade ?? 'N/A'}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Text style={styles.label}>Parent:</Text>
        <Text style={styles.valueSmall}>{student.parentName ?? 'N/A'}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>Phone:</Text>
        <Text style={styles.valueSmall}>{student.parentPhone ?? 'N/A'}</Text>
      </View>

      {status === 'pending' ? (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.rejectButton} onPress={() => onReject(student.id)}>
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveButton} onPress={() => onApprove(student.id)}>
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.tapHint}>Tap to view locations</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  studentCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
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
  infoRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    width: 80,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: theme.colors.text.primary,
    flex: 1,
  },
  valueSmall: {
    fontSize: 13,
    color: theme.colors.text.primary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: theme.colors.error + '20',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  rejectButtonText: {
    color: theme.colors.error,
    fontWeight: '600',
    fontSize: 14,
  },
  approveButton: {
    flex: 1,
    backgroundColor: theme.colors.success,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  tapHint: {
    fontSize: 12,
    color: theme.colors.primary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
});

export default StudentListItem;

