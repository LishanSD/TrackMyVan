import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';
import { Student, ChildStatus } from '../../src/types/types';
import StudentListItem from '../../src/components/StudentListItem';
import AttendanceHistory from '../../src/components/AttendanceHistory';
import {
  approveStudent,
  rejectStudent,
  subscribeToDriverStudents,
  fetchAttendanceHistory,
} from '../../src/services/studentService';

export default function StudentsScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  // Detail view modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<ChildStatus[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribe = subscribeToDriverStudents(
      user.uid,
      (list) => {
        setStudents(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [user]);

  const handleApprove = async (studentId: string) => {
    try {
      await approveStudent(studentId);
      Alert.alert('Success', 'Student approved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleReject = async (studentId: string) => {
    Alert.alert('Confirm Rejection', 'Are you sure you want to reject this student request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await rejectStudent(studentId);
            Alert.alert('Success', 'Student request rejected');
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const viewStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setAttendanceHistory([]);
    setAttendanceError(null);
    setDetailModalVisible(true);
  };

  const getFilteredStudents = () => {
    if (filter === 'all') return students;
    return students.filter((s) => s.status === filter);
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

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  useEffect(() => {
    if (!detailModalVisible || !selectedStudent) return;
    let isMounted = true;

    const fetchAttendance = async () => {
      setAttendanceLoading(true);
      setAttendanceError(null);

      try {
        const records = await fetchAttendanceHistory(selectedStudent.id, 14);
        if (!isMounted) return;
        setAttendanceHistory(records);
      } catch (err) {
        console.error('Failed to load attendance history', err);
        if (isMounted) {
          setAttendanceError('Unable to load attendance history right now.');
        }
      } finally {
        if (isMounted) {
          setAttendanceLoading(false);
        }
      }
    };

    fetchAttendance();

    return () => {
      isMounted = false;
    };
  }, [detailModalVisible, selectedStudent]);

  const pendingCount = students.filter((s) => s.status === 'pending').length;
  const approvedCount = students.filter((s) => s.status === 'approved').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const filteredStudents = getFilteredStudents();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.title}>My Students</Text>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{approvedCount}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
              onPress={() => setFilter('all')}>
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                All ({students.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
              onPress={() => setFilter('pending')}>
              <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
                Pending ({pendingCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'approved' && styles.filterTabActive]}
              onPress={() => setFilter('approved')}>
              <Text style={[styles.filterText, filter === 'approved' && styles.filterTextActive]}>
                Approved ({approvedCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Student List */}
          {filteredStudents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {filter === 'all' ? 'No students yet' : `No ${filter} students`}
              </Text>
              <Text style={styles.emptySubtext}>
                Students will appear here when parents add them
              </Text>
            </View>
          ) : (
            filteredStudents.map((student) => (
              <StudentListItem
                key={student.id}
                student={student}
                onPress={viewStudentDetails}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Detail View Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedStudent && (
                <>
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailTitle}>{selectedStudent.name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            getStatusColor(selectedStudent.status ?? 'pending') + '20',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(selectedStudent.status ?? 'pending') },
                        ]}>
                        {getStatusText(selectedStudent.status ?? 'pending')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Student Info</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Age:</Text>
                      <Text style={styles.value}>
                        {selectedStudent.age ? `${selectedStudent.age} years` : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Grade:</Text>
                      <Text style={styles.value}>{selectedStudent.grade ?? 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Parent Info</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Name:</Text>
                      <Text style={styles.valueSmall}>{selectedStudent.parentName ?? 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Phone:</Text>
                      <Text style={styles.valueSmall}>{selectedStudent.parentPhone ?? 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Email:</Text>
                      <Text style={styles.valueSmall}>{selectedStudent.parentEmail ?? 'N/A'}</Text>
                    </View>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Attendance History</Text>
                    <AttendanceHistory
                      attendanceHistory={attendanceHistory}
                      loading={attendanceLoading}
                      error={attendanceError}
                    />
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Home Location</Text>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={styles.detailMap}
                      initialRegion={{
                        ...selectedStudent.homeLocation,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}>
                      <Marker
                        coordinate={selectedStudent.homeLocation}
                        pinColor={theme.colors.primary}
                        title="Home"
                      />
                    </MapView>
                    <Text style={styles.coordinatesText}>
                      Lat: {selectedStudent.homeLocation.latitude.toFixed(6)}, Lng:{' '}
                      {selectedStudent.homeLocation.longitude.toFixed(6)}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>School Location</Text>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={styles.detailMap}
                      initialRegion={{
                        ...selectedStudent.schoolLocation,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}>
                      <Marker
                        coordinate={selectedStudent.schoolLocation}
                        pinColor={theme.colors.secondary}
                        title="School"
                      />
                    </MapView>
                    <Text style={styles.coordinatesText}>
                      Lat: {selectedStudent.schoolLocation.latitude.toFixed(6)}, Lng:{' '}
                      {selectedStudent.schoolLocation.longitude.toFixed(6)}
                    </Text>
                  </View>

                  {selectedStudent.status === 'pending' && (
                    <View style={styles.modalActionButtons}>
                      <TouchableOpacity
                        style={styles.modalRejectButton}
                        onPress={() => {
                          handleReject(selectedStudent.id);
                          setDetailModalVisible(false);
                        }}>
                        <Text style={styles.modalRejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.modalApproveButton}
                        onPress={() => {
                          handleApprove(selectedStudent.id);
                          setDetailModalVisible(false);
                        }}>
                        <Text style={styles.modalApproveButtonText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setDetailModalVisible(false)}>
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  filterTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.light,
    textAlign: 'center',
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
  },
  detailSection: {
    marginBottom: theme.spacing.lg,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  detailMap: {
    height: 200,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
  },
  coordinatesText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  modalRejectButton: {
    flex: 1,
    backgroundColor: theme.colors.error + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  modalRejectButtonText: {
    color: theme.colors.error,
    fontWeight: '600',
    fontSize: 16,
  },
  modalApproveButton: {
    flex: 1,
    backgroundColor: theme.colors.success,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  modalApproveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
