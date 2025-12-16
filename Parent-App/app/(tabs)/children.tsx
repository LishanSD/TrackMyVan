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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAuth } from '../../src/context/AuthContext';
import { firestore } from '../../src/config/firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { theme } from '../../src/theme/theme';

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

  // Form fields
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childGrade, setChildGrade] = useState('');
  const [homeLocation, setHomeLocation] = useState<Location | null>(null);
  const [schoolLocation, setSchoolLocation] = useState<Location | null>(null);

  // Map modal state
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectingLocation, setSelectingLocation] = useState<LocationType>(null);
  const [tempMarker, setTempMarker] = useState<Location | null>(null);

  // Detail view modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  // Default map region (Sri Lanka - Colombo)
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

    if (selectingLocation === 'home') {
      setHomeLocation(tempMarker);
    } else if (selectingLocation === 'school') {
      setSchoolLocation(tempMarker);
    }

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
    setDetailModalVisible(true);
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
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>My Children</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.addButtonText}>+ Add Child</Text>
            </TouchableOpacity>
          </View>

          {children.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No children added yet</Text>
              <Text style={styles.emptySubtext}>Tap "Add Child" to assign a child to a driver</Text>
            </View>
          ) : (
            children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={styles.childCard}
                onPress={() => viewChildDetails(child)}
                activeOpacity={0.7}>
                <View style={styles.cardHeader}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(child.status) + '20' },
                    ]}>
                    <Text style={[styles.statusText, { color: getStatusColor(child.status) }]}>
                      {getStatusText(child.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.label}>Age:</Text>
                  <Text style={styles.value}>{child.age} years</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.label}>Grade:</Text>
                  <Text style={styles.value}>{child.grade}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.label}>Driver:</Text>
                  <Text style={styles.value}>{child.driverName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Phone:</Text>
                  <Text style={styles.value}>{child.driverPhone}</Text>
                </View>

                <Text style={styles.tapHint}>Tap to view locations</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Child Modal */}
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
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Add Child</Text>

              {/* Driver Search Section */}
              <Text style={styles.sectionTitle}>1. Search Driver</Text>
              <TextInput
                style={styles.input}
                placeholder="Driver's Email"
                value={searchDriverEmail}
                onChangeText={setSearchDriverEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={searchDriver}
                disabled={searchingDriver}>
                {searchingDriver ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.searchButtonText}>Search Driver</Text>
                )}
              </TouchableOpacity>

              {driverFound && (
                <View style={styles.driverFoundCard}>
                  <Text style={styles.driverFoundTitle}>✓ Driver Found!</Text>
                  <Text style={styles.driverFoundText}>Name: {driverFound.name}</Text>
                  <Text style={styles.driverFoundText}>Email: {driverFound.email}</Text>
                  <Text style={styles.driverFoundText}>Phone: {driverFound.phone}</Text>
                </View>
              )}

              {/* Child Details Section */}
              <Text style={styles.sectionTitle}>2. Child Details</Text>
              <TextInput
                style={styles.input}
                placeholder="Child's Name"
                value={childName}
                onChangeText={setChildName}
              />
              <TextInput
                style={styles.input}
                placeholder="Age"
                value={childAge}
                onChangeText={setChildAge}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Grade"
                value={childGrade}
                onChangeText={setChildGrade}
              />

              {/* Locations Section */}
              <Text style={styles.sectionTitle}>3. Locations</Text>

              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => openLocationPicker('home')}>
                <Text style={styles.locationButtonLabel}>Home Location</Text>
                <Text style={styles.locationButtonText}>
                  {homeLocation
                    ? `✓ Selected (${homeLocation.latitude.toFixed(4)}, ${homeLocation.longitude.toFixed(4)})`
                    : 'Tap to select on map'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => openLocationPicker('school')}>
                <Text style={styles.locationButtonLabel}>School Location</Text>
                <Text style={styles.locationButtonText}>
                  {schoolLocation
                    ? `✓ Selected (${schoolLocation.latitude.toFixed(4)}, ${schoolLocation.longitude.toFixed(4)})`
                    : 'Tap to select on map'}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    resetForm();
                    setModalVisible(false);
                  }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={addChild}>
                  <Text style={styles.submitButtonText}>Add Child</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Map Selection Modal */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        onRequestClose={() => setMapModalVisible(false)}>
        <SafeAreaView style={styles.mapModalContainer}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>
              Select {selectingLocation === 'home' ? 'Home' : 'School'} Location
            </Text>
            <Text style={styles.mapSubtitle}>Tap on the map to place marker</Text>
          </View>

          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={
              tempMarker
                ? {
                    ...tempMarker,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }
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

          <View style={styles.mapButtons}>
            <TouchableOpacity
              style={styles.mapCancelButton}
              onPress={() => {
                setMapModalVisible(false);
                setTempMarker(null);
              }}>
              <Text style={styles.mapCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapConfirmButton} onPress={confirmLocation}>
              <Text style={styles.mapConfirmButtonText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Detail View Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedChild && (
                <>
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailTitle}>{selectedChild.name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(selectedChild.status) + '20' },
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(selectedChild.status) },
                        ]}>
                        {getStatusText(selectedChild.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Student Info</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Age:</Text>
                      <Text style={styles.value}>{selectedChild.age} years</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Grade:</Text>
                      <Text style={styles.value}>{selectedChild.grade}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Driver Info</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Name:</Text>
                      <Text style={styles.value}>{selectedChild.driverName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Phone:</Text>
                      <Text style={styles.value}>{selectedChild.driverPhone}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Email:</Text>
                      <Text style={styles.valueSmall}>{selectedChild.driverEmail}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Home Location</Text>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={styles.detailMap}
                      initialRegion={{
                        ...selectedChild.homeLocation,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}>
                      <Marker
                        coordinate={selectedChild.homeLocation}
                        pinColor={theme.colors.primary}
                        title="Home"
                      />
                    </MapView>
                    <Text style={styles.coordinatesText}>
                      Lat: {selectedChild.homeLocation.latitude.toFixed(6)}, Lng:{' '}
                      {selectedChild.homeLocation.longitude.toFixed(6)}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>School Location</Text>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={styles.detailMap}
                      initialRegion={{
                        ...selectedChild.schoolLocation,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}>
                      <Marker
                        coordinate={selectedChild.schoolLocation}
                        pinColor={theme.colors.secondary}
                        title="School"
                      />
                    </MapView>
                    <Text style={styles.coordinatesText}>
                      Lat: {selectedChild.schoolLocation.latitude.toFixed(6)}, Lng:{' '}
                      {selectedChild.schoolLocation.longitude.toFixed(6)}
                    </Text>
                  </View>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
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
  childCard: {
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
  childName: {
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
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  driverFoundCard: {
    backgroundColor: theme.colors.success + '10',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  driverFoundTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  driverFoundText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  locationButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  locationButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  locationButtonText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.border,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.text.secondary,
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mapHeader: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  mapSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  map: {
    flex: 1,
  },
  mapButtons: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  mapCancelButton: {
    flex: 1,
    backgroundColor: theme.colors.border,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  mapCancelButtonText: {
    color: theme.colors.text.secondary,
    fontWeight: '600',
    fontSize: 16,
  },
  mapConfirmButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  mapConfirmButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
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
