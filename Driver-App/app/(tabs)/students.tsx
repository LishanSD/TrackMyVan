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
import { firestore } from '../../src/config/firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { theme } from '../../src/theme/theme';
import { Student, ChildStatus, PickupStatus } from '../../src/types/types';

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

    const q = query(collection(firestore, 'students'), where('driverId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentsData: Student[] = [];
      snapshot.forEach((doc) => {
        studentsData.push({ id: doc.id, ...doc.data() } as Student);
      });
      const getTime = (value?: string) => (value ? new Date(value).getTime() : 0);

      studentsData.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return getTime(b.createdAt) - getTime(a.createdAt);
      });
      setStudents(studentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleApprove = async (studentId: string) => {
    try {
      await updateDoc(doc(firestore, 'students', studentId), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
      });
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
            await updateDoc(doc(firestore, 'students', studentId), {
              status: 'rejected',
              rejectedAt: new Date().toISOString(),
            });
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

  useEffect(() => {
    if (!detailModalVisible || !selectedStudent) return;
    let isMounted = true;

    const fetchAttendance = async () => {
      setAttendanceLoading(true);
      setAttendanceError(null);

      try {
        const datesRef = collection(firestore, 'childStatus', selectedStudent.id, 'dates');
        const snapshot = await getDocs(datesRef);

        if (!isMounted) return;

        const records: ChildStatus[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          records.push({
            childId: selectedStudent.id,
            date: (data.date as string | undefined) ?? docSnap.id,
            ...data,
          } as ChildStatus);
        });

        records.sort((a, b) => {
          const getTime = (d?: string) => {
            if (!d) return 0;
            const t = new Date(d).getTime();
            return isNaN(t) ? 0 : t;
          };
          return getTime(b.date) - getTime(a.date);
        });

        setAttendanceHistory(records.slice(0, 14));
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
              <TouchableOpacity
                key={student.id}
                style={styles.studentCard}
                onPress={() => viewStudentDetails(student)}
                activeOpacity={0.7}>
                <View style={styles.cardHeader}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(student.status ?? 'pending') + '20' },
                    ]}>
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(student.status ?? 'pending') },
                      ]}>
                      {getStatusText(student.status ?? 'pending')}
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

                {(student.status ?? 'pending') === 'pending' ? (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleReject(student.id)}>
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApprove(student.id)}>
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.tapHint}>Tap to view locations</Text>
                )}
              </TouchableOpacity>
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
                    {attendanceLoading ? (
                      <View style={styles.attendanceLoading}>
                        <ActivityIndicator color={theme.colors.primary} />
                        <Text style={styles.attendanceSubtext}>Loading recent records...</Text>
                      </View>
                    ) : attendanceError ? (
                      <Text style={styles.attendanceError}>{attendanceError}</Text>
                    ) : attendanceHistory.length === 0 ? (
                      <Text style={styles.attendanceSubtext}>No attendance records yet.</Text>
                    ) : (
                      attendanceHistory.map((record) => {
                        const currentStatus = record.currentStatus ?? 'AT_HOME';
                        return (
                          <View key={record.date} style={styles.attendanceCard}>
                            <View style={styles.attendanceHeader}>
                              <Text style={styles.attendanceDate}>
                                {formatDateLabel(record.date)}
                              </Text>
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
                                      getPickupStatusColor(
                                        record.morningPickup?.status ?? 'PENDING'
                                      ) + '20',
                                  },
                                ]}>
                                <Text
                                  style={[
                                    styles.attendanceChipText,
                                    {
                                      color: getPickupStatusColor(
                                        record.morningPickup?.status ?? 'PENDING'
                                      ),
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
                                      getPickupStatusColor(
                                        record.schoolDropoff?.status ?? 'PENDING'
                                      ) + '20',
                                  },
                                ]}>
                                <Text
                                  style={[
                                    styles.attendanceChipText,
                                    {
                                      color: getPickupStatusColor(
                                        record.schoolDropoff?.status ?? 'PENDING'
                                      ),
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
                                      getPickupStatusColor(
                                        record.schoolPickup?.status ?? 'PENDING'
                                      ) + '20',
                                  },
                                ]}>
                                <Text
                                  style={[
                                    styles.attendanceChipText,
                                    {
                                      color: getPickupStatusColor(
                                        record.schoolPickup?.status ?? 'PENDING'
                                      ),
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
                                      getPickupStatusColor(
                                        record.homeDropoff?.status ?? 'PENDING'
                                      ) + '20',
                                  },
                                ]}>
                                <Text
                                  style={[
                                    styles.attendanceChipText,
                                    {
                                      color: getPickupStatusColor(
                                        record.homeDropoff?.status ?? 'PENDING'
                                      ),
                                    },
                                  ]}>
                                  {record.homeDropoff?.status ?? 'PENDING'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
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
