import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
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

const { width } = Dimensions.get('window');

export default function StudentsScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    const statusFiltered =
      filter === 'all' ? students : students.filter((s) => s.status === filter);

    if (!searchQuery.trim()) return statusFiltered;

    const query = searchQuery.toLowerCase();

    return statusFiltered.filter((s) => {
      const fields = [s.name, s.parentName, s.grade];
      return fields.some((field) => field?.toLowerCase().includes(query));
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return theme.colors.success;
      case 'pending':
        return '#F59E0B'; // Warning/Orange
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
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredStudents = getFilteredStudents();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>My Students</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="notifications-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time" size={20} color="#D97706" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statNumber}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending Requests</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statNumber}>{approvedCount}</Text>
              <Text style={styles.statLabel}>Active Students</Text>
            </View>
          </View>
        </View>

        {/* Search & Filter Section */}
        <View style={styles.controlsContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search students..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
              onPress={() => setFilter('all')}>
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
              onPress={() => setFilter('pending')}>
              <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
                Pending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'approved' && styles.filterTabActive]}
              onPress={() => setFilter('approved')}>
              <Text style={[styles.filterText, filter === 'approved' && styles.filterTextActive]}>
                Approved
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Student List */}
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? 'No matches found'
                : filter === 'all'
                  ? 'No students added yet'
                  : `No ${filter} students`}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery.trim()
                ? 'Try searching for a different name.'
                : 'Wait for parents to add their children.'}
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
      </ScrollView>

      {/* Detail View Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            {/* Modal Handle */}
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeaderBar}>
              <Text style={styles.modalHeaderTitle}>Student Details</Text>
              <TouchableOpacity
                style={styles.closeIconButton}
                onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}>
              {selectedStudent && (
                <>
                  <View style={styles.profileHeader}>
                    <View style={styles.avatarLarge}>
                      <Text style={styles.avatarTextLarge}>{selectedStudent.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.profileHeaderText}>
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
                  </View>

                  <View style={styles.infoGrid}>
                    <View style={styles.infoCard}>
                      <Text style={styles.label}>Age</Text>
                      <Text style={styles.value}>
                        {selectedStudent.age ? `${selectedStudent.age} years` : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.infoCard}>
                      <Text style={styles.label}>Grade</Text>
                      <Text style={styles.value}>{selectedStudent.grade ?? 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="person-circle-outline" size={20} color="#4B5563" />
                      <Text style={styles.detailSectionTitle}>Parent Information</Text>
                    </View>
                    <View style={styles.infoContainer}>
                      <View style={styles.infoRow}>
                        <Text style={styles.label}>Name</Text>
                        <Text style={styles.valueSmall}>{selectedStudent.parentName ?? 'N/A'}</Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.label}>Phone</Text>
                        <Text style={styles.valueSmall}>
                          {selectedStudent.parentPhone ?? 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.label}>Email</Text>
                        <Text style={styles.valueSmall}>
                          {selectedStudent.parentEmail ?? 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="map-outline" size={20} color="#4B5563" />
                      <Text style={styles.detailSectionTitle}>Locations</Text>
                    </View>

                    <View style={styles.mapRow}>
                      <View style={styles.mapWrapper}>
                        <Text style={styles.mapLabel}>Home</Text>
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
                          />
                        </MapView>
                      </View>

                      <View style={styles.mapWrapper}>
                        <Text style={styles.mapLabel}>School</Text>
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
                          />
                        </MapView>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="calendar-outline" size={20} color="#4B5563" />
                      <Text style={styles.detailSectionTitle}>Attendance (Last 14 Days)</Text>
                    </View>
                    <AttendanceHistory
                      attendanceHistory={attendanceHistory}
                      loading={attendanceLoading}
                      error={attendanceError}
                    />
                  </View>

                  {/* Spacer for bottom actions */}
                  <View style={{ height: 80 }} />
                </>
              )}
            </ScrollView>

            {/* Sticky Bottom Actions */}
            {selectedStudent && selectedStudent.status === 'pending' && (
              <View style={styles.stickyFooter}>
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
                  <Text style={styles.modalApproveButtonText}>Approve Request</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  headerButton: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  controlsContainer: {
    marginBottom: 20,
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  filterTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  modalHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  closeIconButton: {
    padding: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  modalScrollContent: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarTextLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileHeaderText: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  valueSmall: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  mapRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mapWrapper: {
    flex: 1,
  },
  mapLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  detailMap: {
    height: 120,
    width: '100%',
    borderRadius: 12,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  modalRejectButton: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  modalRejectButtonText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 16,
  },
  modalApproveButton: {
    flex: 1.5,
    backgroundColor: theme.colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalApproveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
