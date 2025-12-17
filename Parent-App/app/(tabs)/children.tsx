import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAuth } from '../../src/context/AuthContext';
import { firestore } from '../../src/config/firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { theme } from '../../src/theme/theme';
import { ChildStatus, PickupStatus } from '../../src/types/types';

const { width } = Dimensions.get('window');

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface Child {
  id: string;
  name: string;
  age: string;
  grade: string;
  driverEmail: string;
  driverName: string;
  driverPhone: string;
  status: 'pending' | 'approved' | 'rejected';
  homeLocation: Location;
  schoolLocation: Location;
  createdAt: string;
}

type LocationType = 'home' | 'school' | null;

export default function ChildrenScreen() {
  const { user, userProfile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchDriverEmail, setSearchDriverEmail] = useState('');
  const [driverFound, setDriverFound] = useState<any>(null);
  const [searchingDriver, setSearchingDriver] = useState(false);

  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childGrade, setChildGrade] = useState('');
  const [homeLocation, setHomeLocation] = useState<Location | null>(null);
  const [schoolLocation, setSchoolLocation] = useState<Location | null>(null);

  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectingLocation, setSelectingLocation] = useState<LocationType>(null);
  const [tempMarker, setTempMarker] = useState<Location | null>(null);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<ChildStatus[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const defaultRegion = {
    latitude: 6.9271,
    longitude: 79.8612,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    if (!user) return;
    const q = query(collection(firestore, 'students'), where('parentId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const childrenData: Child[] = [];
      snapshot.forEach((doc) => {
        childrenData.push({ id: doc.id, ...doc.data() } as Child);
      });
      setChildren(childrenData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const searchDriver = async () => {
    if (!searchDriverEmail.trim()) {
      Alert.alert('Error', 'Please enter driver email');
      return;
    }
    setSearchingDriver(true);
    try {
      const driversRef = collection(firestore, 'drivers');
      const q = query(driversRef, where('email', '==', searchDriverEmail.trim()));
      const snapshot = await new Promise<any>((resolve) => {
        const unsubscribe = onSnapshot(q, (snap) => {
          unsubscribe();
          resolve(snap);
        });
      });
      if (snapshot.empty) {
        Alert.alert('Not Found', 'No driver found with this email');
        setDriverFound(null);
      } else {
        const driverData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setDriverFound(driverData);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSearchingDriver(false);
    }
  };

  const openLocationPicker = (type: LocationType) => {
    setSelectingLocation(type);
    const currentLocation = type === 'home' ? homeLocation : schoolLocation;
    setTempMarker(currentLocation);
    setMapModalVisible(true);
  };

  const confirmLocation = () => {
    if (!tempMarker) {
      Alert.alert('Error', 'Please select a location on the map');
      return;
    }
    if (selectingLocation === 'home') setHomeLocation(tempMarker);
    else if (selectingLocation === 'school') setSchoolLocation(tempMarker);
    setMapModalVisible(false);
    setTempMarker(null);
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setTempMarker({ latitude, longitude });
  };

  const addChild = async () => {
    if (!childName.trim() || !childAge.trim() || !childGrade.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (!driverFound) {
      Alert.alert('Error', 'Please search and select a driver first');
      return;
    }
    if (!homeLocation || !schoolLocation) {
      Alert.alert('Error', 'Please select both home and school locations');
      return;
    }
    try {
      await addDoc(collection(firestore, 'students'), {
        name: childName.trim(),
        age: childAge.trim(),
        grade: childGrade.trim(),
        parentId: user?.uid,
        parentEmail: user?.email,
        parentName: userProfile?.name || '',
        parentPhone: userProfile?.phone || '',
        driverId: driverFound.id,
        driverEmail: driverFound.email,
        driverPhone: driverFound.phone,
        driverName: driverFound.name,
        homeLocation,
        schoolLocation,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Child added successfully. Waiting for driver approval.');
      resetForm();
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const resetForm = () => {
    setChildName('');
    setChildAge('');
    setChildGrade('');
    setSearchDriverEmail('');
    setDriverFound(null);
    setHomeLocation(null);
    setSchoolLocation(null);
  };

  const viewChildDetails = (child: Child) => {
    setSelectedChild(child);
    setAttendanceHistory([]);
    setAttendanceError(null);
    setDetailModalVisible(true);
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
    if (!detailModalVisible || !selectedChild) return;
    let isMounted = true;
    const fetchAttendance = async () => {
      setAttendanceLoading(true);
      try {
        const datesRef = collection(firestore, 'childStatus', selectedChild.id, 'dates');
        const snapshot = await getDocs(datesRef);
        if (!isMounted) return;
        const records: ChildStatus[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          records.push({
            childId: selectedChild.id,
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
        if (isMounted) setAttendanceError('Unable to load attendance history right now.');
      } finally {
        if (isMounted) setAttendanceLoading(false);
      }
    };
    fetchAttendance();
    return () => {
      isMounted = false;
    };
  }, [detailModalVisible, selectedChild]);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>My Children</Text>
              <Text style={styles.subtitle}>Manage enrollment and tracking</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {children.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>👶</Text>
              <Text style={styles.emptyText}>No children added yet</Text>
              <Text style={styles.emptySubtext}>Tap "Add Child" to assign a child to a driver</Text>
            </View>
          ) : (
            children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={[styles.childCard, { borderLeftColor: getStatusColor(child.status) }]}
                onPress={() => viewChildDetails(child)}
                activeOpacity={0.8}>
                <View style={styles.cardHeader}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(child.status) + '15' },
                    ]}>
                    <View
                      style={[styles.statusDot, { backgroundColor: getStatusColor(child.status) }]}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(child.status) }]}>
                      {child.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardGrid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.cardLabel}>Age</Text>
                    <Text style={styles.cardValue}>{child.age} yrs</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.cardLabel}>Grade</Text>
                    <Text style={styles.cardValue}>{child.grade}</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.driverSummary}>
                  <Text style={styles.driverLabel}>DRIVER</Text>
                  <Text style={styles.driverValue}>{child.driverName}</Text>
                </View>

                <View style={styles.tapIndicator}>
                  <Text style={styles.tapIndicatorText}>View Attendance & Locations ›</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          resetForm();
          setModalVisible(false);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Add Child</Text>

              <Text style={styles.sectionHeading}>1. Driver Assignment</Text>
              <View style={styles.searchWrapper}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Driver's Email Address"
                  value={searchDriverEmail}
                  onChangeText={setSearchDriverEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.searchIconButton}
                  onPress={searchDriver}
                  disabled={searchingDriver}>
                  {searchingDriver ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.searchIconText}>🔍</Text>
                  )}
                </TouchableOpacity>
              </View>

              {driverFound && (
                <View style={styles.driverFoundBox}>
                  <Text style={styles.driverBoxTitle}>Driver Verified</Text>
                  <Text style={styles.driverBoxName}>{driverFound.name}</Text>
                  <Text style={styles.driverBoxDetail}>{driverFound.phone}</Text>
                </View>
              )}

              <Text style={styles.sectionHeading}>2. Student Profile</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={childName}
                onChangeText={setChildName}
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="Age"
                  value={childAge}
                  onChangeText={setChildAge}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Grade"
                  value={childGrade}
                  onChangeText={setChildGrade}
                />
              </View>

              <Text style={styles.sectionHeading}>3. Set Locations</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => openLocationPicker('home')}>
                <Text style={styles.pickerLabel}>🏠 Home Location</Text>
                <Text style={styles.pickerValue}>
                  {homeLocation ? 'Location Locked' : 'Select on map'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => openLocationPicker('school')}>
                <Text style={styles.pickerLabel}>🏫 School Location</Text>
                <Text style={styles.pickerValue}>
                  {schoolLocation ? 'Location Locked' : 'Select on map'}
                </Text>
              </TouchableOpacity>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => {
                    resetForm();
                    setModalVisible(false);
                  }}>
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={addChild}>
                  <Text style={styles.btnPrimaryText}>Add Child</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={mapModalVisible}
        animationType="slide"
        onRequestClose={() => setMapModalVisible(false)}>
        <SafeAreaView style={styles.mapFullscreen}>
          <View style={styles.mapToolbar}>
            <Text style={styles.mapToolbarTitle}>
              Pin {selectingLocation === 'home' ? 'Home' : 'School'}
            </Text>
          </View>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.mapWidget}
            initialRegion={
              tempMarker
                ? { ...tempMarker, latitudeDelta: 0.01, longitudeDelta: 0.01 }
                : defaultRegion
            }
            onPress={handleMapPress}>
            {tempMarker && (
              <Marker
                coordinate={tempMarker}
                pinColor={
                  selectingLocation === 'home' ? theme.colors.primary : theme.colors.secondary
                }
              />
            )}
          </MapView>
          <View style={styles.mapFooter}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => {
                setMapModalVisible(false);
                setTempMarker(null);
              }}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={confirmLocation}>
              <Text style={styles.btnPrimaryText}>Set Location</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={detailModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedChild && (
                <>
                  <View style={styles.detailHeaderRow}>
                    <Text style={styles.detailSheetTitle}>{selectedChild.name}</Text>
                    <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                      <Text style={styles.closeX}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.logHeading}>ATTENDANCE LOG</Text>
                  {attendanceLoading ? (
                    <View style={styles.loaderBox}>
                      <ActivityIndicator color={theme.colors.primary} />
                    </View>
                  ) : attendanceHistory.length === 0 ? (
                    <Text style={styles.emptyLog}>No records for the last 14 days.</Text>
                  ) : (
                    attendanceHistory.map((record) => (
                      <View key={record.date} style={styles.logCard}>
                        <View style={styles.logDateRow}>
                          <Text style={styles.logDateText}>{formatDateLabel(record.date)}</Text>
                          <View
                            style={[
                              styles.logStatus,
                              {
                                backgroundColor:
                                  getCurrentStatusColor(record.currentStatus || 'AT_HOME') + '15',
                              },
                            ]}>
                            <Text
                              style={[
                                styles.logStatusText,
                                { color: getCurrentStatusColor(record.currentStatus || 'AT_HOME') },
                              ]}>
                              {formatCurrentStatus(record.currentStatus || 'AT_HOME')}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.logTimeline}>
                          <View style={styles.timePoint}>
                            <Text style={styles.timeLabel}>Pickup</Text>
                            <Text style={styles.timeVal}>
                              {formatTimestamp(record.morningPickup?.time)}
                            </Text>
                          </View>
                          <View style={styles.timePoint}>
                            <Text style={styles.timeLabel}>Dropoff</Text>
                            <Text style={styles.timeVal}>
                              {formatTimestamp(record.schoolDropoff?.time)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))
                  )}

                  <Text style={styles.logHeading}>LOCATIONS</Text>
                  <View style={styles.mapRow}>
                    <View style={styles.miniMapBox}>
                      <Text style={styles.miniMapLabel}>Home</Text>
                      <MapView
                        pointerEvents="none"
                        provider={PROVIDER_GOOGLE}
                        style={styles.miniMap}
                        initialRegion={{
                          ...selectedChild.homeLocation,
                          latitudeDelta: 0.005,
                          longitudeDelta: 0.005,
                        }}>
                        <Marker coordinate={selectedChild.homeLocation} />
                      </MapView>
                    </View>
                    <View style={styles.miniMapBox}>
                      <Text style={styles.miniMapLabel}>School</Text>
                      <MapView
                        pointerEvents="none"
                        provider={PROVIDER_GOOGLE}
                        style={styles.miniMap}
                        initialRegion={{
                          ...selectedChild.schoolLocation,
                          latitudeDelta: 0.005,
                          longitudeDelta: 0.005,
                        }}>
                        <Marker
                          coordinate={selectedChild.schoolLocation}
                          pinColor={theme.colors.secondary}
                        />
                      </MapView>
                    </View>
                  </View>
                  <View style={{ height: 40 }} />
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
  safeArea: { flex: 1, backgroundColor: '#F8F9FB' },
  scrollView: { flex: 1 },
  container: { padding: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  title: { fontSize: 32, fontWeight: '800', color: theme.colors.text.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: theme.colors.text.secondary, marginTop: 4 },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: theme.colors.text.primary, marginBottom: 8 },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  childCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderLeftWidth: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  childName: { fontSize: 20, fontWeight: '800', color: theme.colors.text.primary },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardGrid: { flexDirection: 'row', gap: 24 },
  gridItem: { flex: 0 },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardValue: { fontSize: 15, fontWeight: '700', color: theme.colors.text.primary },
  cardDivider: { height: 1, backgroundColor: '#F1F3F5', marginVertical: 16 },
  driverSummary: { marginBottom: 12 },
  driverLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.text.light,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  driverValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text.primary },
  tapIndicator: { marginTop: 4 },
  tapIndicatorText: { fontSize: 12, color: theme.colors.primary, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 16,
  },
  searchWrapper: { flexDirection: 'row', marginBottom: 16 },
  searchInput: {
    flex: 1,
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchIconButton: {
    backgroundColor: theme.colors.secondary,
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  searchIconText: { fontSize: 20 },
  driverFoundBox: {
    backgroundColor: '#EBFBEE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D3F9D8',
  },
  driverBoxTitle: { fontSize: 12, fontWeight: '800', color: '#2B8A3E', marginBottom: 4 },
  driverBoxName: { fontSize: 16, fontWeight: '700', color: '#2B8A3E' },
  driverBoxDetail: { fontSize: 13, color: '#2B8A3E', opacity: 0.8 },
  input: {
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  inputRow: { flexDirection: 'row', marginBottom: 4 },
  pickerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text.primary },
  pickerValue: { fontSize: 13, color: theme.colors.primary, fontWeight: '700' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 20 },
  btnPrimary: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#F1F3F5',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondaryText: { color: theme.colors.text.secondary, fontWeight: '700', fontSize: 16 },
  mapFullscreen: { flex: 1 },
  mapToolbar: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  mapToolbarTitle: { fontSize: 18, fontWeight: '800' },
  mapWidget: { flex: 1 },
  mapFooter: { flexDirection: 'row', padding: 20, gap: 12, backgroundColor: '#fff' },
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    height: '85%',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailSheetTitle: { fontSize: 24, fontWeight: '900', color: theme.colors.text.primary },
  closeX: { fontSize: 24, color: theme.colors.text.light },
  logHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.text.light,
    letterSpacing: 1.5,
    marginBottom: 16,
    marginTop: 8,
  },
  logCard: { backgroundColor: '#F8F9FB', borderRadius: 16, padding: 16, marginBottom: 12 },
  logDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logDateText: { fontSize: 15, fontWeight: '700', color: theme.colors.text.primary },
  logStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  logStatusText: { fontSize: 10, fontWeight: '800' },
  logTimeline: { flexDirection: 'row', gap: 32 },
  timePoint: { flex: 0 },
  timeLabel: { fontSize: 10, color: theme.colors.text.light, fontWeight: '700', marginBottom: 2 },
  timeVal: { fontSize: 14, fontWeight: '600' },
  emptyLog: { textAlign: 'center', padding: 20, color: theme.colors.text.light },
  loaderBox: { padding: 40 },
  mapRow: { flexDirection: 'row', gap: 12 },
  miniMapBox: { flex: 1 },
  miniMapLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    color: theme.colors.text.secondary,
  },
  miniMap: { height: 120, borderRadius: 16 },
});
