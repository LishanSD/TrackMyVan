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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/context/AuthContext';
import { firestore, storage } from '../../src/config/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { theme } from '../../src/theme/theme';
import { ChildStatus, PickupStatus } from '../../src/types/types';
import { deleteChild } from '../../src/services/childrenService';

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
  profilePic?: string;
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
  const [childProfilePic, setChildProfilePic] = useState<string | null>(null);
  const [selectedChildImage, setSelectedChildImage] = useState<string | null>(null);

  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectingLocation, setSelectingLocation] = useState<LocationType>(null);
  const [tempMarker, setTempMarker] = useState<Location | null>(null);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<ChildStatus[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [editChildName, setEditChildName] = useState('');
  const [editChildAge, setEditChildAge] = useState('');
  const [editChildGrade, setEditChildGrade] = useState('');
  const [editHomeLocation, setEditHomeLocation] = useState<Location | null>(null);
  const [editSchoolLocation, setEditSchoolLocation] = useState<Location | null>(null);
  const [editingLocation, setEditingLocation] = useState<LocationType>(null);
  const [editMapModalVisible, setEditMapModalVisible] = useState(false);
  const [editTempMarker, setEditTempMarker] = useState<Location | null>(null);
  const [updatingChild, setUpdatingChild] = useState(false);
  const [editChildProfilePic, setEditChildProfilePic] = useState<string | null>(null);
  const [selectedEditImage, setSelectedEditImage] = useState<string | null>(null);

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

  const pickChildImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'We need camera roll permissions to upload profile pictures.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedChildImage(result.assets[0].uri);
    }
  };

  const pickEditChildImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'We need camera roll permissions to upload profile pictures.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedEditImage(result.assets[0].uri);
    }
  };

  const uploadChildProfilePicture = async (uri: string, childId?: string): Promise<string> => {
    if (!user) {
      throw new Error('User must be logged in to upload profile picture');
    }

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      // Validate file size (5MB limit)
      if (blob.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
      }

      // Validate file type
      if (!blob.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      const filename = `child-profile-pics/${childId || 'new'}_${user.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      // Upload with metadata
      await uploadBytes(storageRef, blob, {
        contentType: blob.type || 'image/jpeg',
        customMetadata: {
          uploadedBy: user.uid,
          uploadedAt: new Date().toISOString(),
        },
      });

      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error: any) {
      throw new Error(`Failed to upload profile picture: ${error.message}`);
    }
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
      let profilePicUrl = childProfilePic || undefined;

      if (selectedChildImage) {
        profilePicUrl = await uploadChildProfilePicture(selectedChildImage);
      }

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
        profilePic: profilePicUrl,
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
    setChildProfilePic(null);
    setSelectedChildImage(null);
  };

  const viewChildDetails = (child: Child) => {
    setSelectedChild(child);
    setAttendanceHistory([]);
    setAttendanceError(null);
    setDetailModalVisible(true);
  };

  const openEditModal = (child: Child) => {
    setEditingChild(child);
    setEditChildName(child.name);
    setEditChildAge(child.age);
    setEditChildGrade(child.grade);
    setEditHomeLocation(child.homeLocation);
    setEditSchoolLocation(child.schoolLocation);
    setEditChildProfilePic(child.profilePic || null);
    setSelectedEditImage(null);
    setDetailModalVisible(false);
    setEditModalVisible(true);
  };

  const openEditLocationPicker = (type: LocationType) => {
    setEditingLocation(type);
    const currentLocation = type === 'home' ? editHomeLocation : editSchoolLocation;
    setEditTempMarker(currentLocation);
    setEditMapModalVisible(true);
  };

  const confirmEditLocation = () => {
    if (!editTempMarker) {
      Alert.alert('Error', 'Please select a location on the map');
      return;
    }
    if (editingLocation === 'home') setEditHomeLocation(editTempMarker);
    else if (editingLocation === 'school') setEditSchoolLocation(editTempMarker);
    setEditMapModalVisible(false);
    setEditTempMarker(null);
  };

  const handleEditMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setEditTempMarker({ latitude, longitude });
  };

  const updateChild = async () => {
    if (!editingChild) return;
    if (!editChildName.trim() || !editChildAge.trim() || !editChildGrade.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (!editHomeLocation || !editSchoolLocation) {
      Alert.alert('Error', 'Please select both home and school locations');
      return;
    }
    setUpdatingChild(true);
    try {
      let profilePicUrl = editChildProfilePic || undefined;

      if (selectedEditImage) {
        profilePicUrl = await uploadChildProfilePicture(selectedEditImage, editingChild.id);
      }

      const childRef = doc(firestore, 'students', editingChild.id);
      await updateDoc(childRef, {
        name: editChildName.trim(),
        age: editChildAge.trim(),
        grade: editChildGrade.trim(),
        homeLocation: editHomeLocation,
        schoolLocation: editSchoolLocation,
        profilePic: profilePicUrl,
      });
      Alert.alert('Success', 'Child information updated successfully');
      setEditModalVisible(false);
      resetEditForm();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUpdatingChild(false);
    }
  };

  const resetEditForm = () => {
    setEditingChild(null);
    setEditChildName('');
    setEditChildAge('');
    setEditChildGrade('');
    setEditHomeLocation(null);
    setEditSchoolLocation(null);
    setEditingLocation(null);
    setEditTempMarker(null);
    setEditChildProfilePic(null);
    setSelectedEditImage(null);
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

  const handleRemoveChild = () => {
    if (!selectedChild) return;

    Alert.alert(
      'Remove Child',
      'Are you sure you want to remove this child? This action cannot be undone and you will lose all tracking history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChild(selectedChild.id);
              Alert.alert('Success', 'Child removed successfully');
              setDetailModalVisible(false);
              setSelectedChild(null);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
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
                  <View style={styles.cardHeaderLeft}>
                    {child.profilePic ? (
                      <Image source={{ uri: child.profilePic }} style={styles.childAvatar} />
                    ) : (
                      <View style={styles.childAvatarPlaceholder}>
                        <Text style={styles.childAvatarText}>{child.name.charAt(0)}</Text>
                      </View>
                    )}
                    <Text style={styles.childName}>{child.name}</Text>
                  </View>
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

              <View style={styles.profilePicEditContainer}>
                <TouchableOpacity
                  onPress={pickChildImage}
                  style={styles.profilePicEditButton}
                  activeOpacity={0.9}>
                  {selectedChildImage || childProfilePic ? (
                    <Image
                      source={{ uri: selectedChildImage || childProfilePic || '' }}
                      style={styles.profilePicEdit}
                    />
                  ) : (
                    <View style={styles.profilePicPlaceholder}>
                      <Text style={styles.profilePicPlaceholderText}>📷</Text>
                      <Text style={styles.profilePicPlaceholderLabel}>Add Photo</Text>
                    </View>
                  )}
                  <View style={[styles.editBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.editBadgeText}>✎</Text>
                  </View>
                </TouchableOpacity>
              </View>

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

                    <View style={styles.detailHeaderActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openEditModal(selectedChild)}
                        activeOpacity={0.7}>
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.editButton, { backgroundColor: '#FEE2E2', marginLeft: 8 }]}
                        onPress={handleRemoveChild}
                        activeOpacity={0.7}>
                        <Text style={[styles.editButtonText, { color: theme.colors.error }]}>Remove</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={{ marginLeft: 16 }}>
                        <Text style={styles.closeX}>✕</Text>
                      </TouchableOpacity>
                    </View>
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

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          resetEditForm();
          setEditModalVisible(false);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Edit Child</Text>

              <View style={styles.profilePicEditContainer}>
                <TouchableOpacity
                  onPress={pickEditChildImage}
                  style={styles.profilePicEditButton}
                  activeOpacity={0.9}>
                  {selectedEditImage || editChildProfilePic ? (
                    <Image
                      source={{ uri: selectedEditImage || editChildProfilePic || '' }}
                      style={styles.profilePicEdit}
                    />
                  ) : (
                    <View style={styles.profilePicPlaceholder}>
                      <Text style={styles.profilePicPlaceholderText}>📷</Text>
                      <Text style={styles.profilePicPlaceholderLabel}>Add Photo</Text>
                    </View>
                  )}
                  <View style={[styles.editBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.editBadgeText}>✎</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionHeading}>Student Profile</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={editChildName}
                onChangeText={setEditChildName}
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="Age"
                  value={editChildAge}
                  onChangeText={setEditChildAge}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Grade"
                  value={editChildGrade}
                  onChangeText={setEditChildGrade}
                />
              </View>

              <Text style={styles.sectionHeading}>Update Locations</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => openEditLocationPicker('home')}>
                <Text style={styles.pickerLabel}>🏠 Home Location</Text>
                <Text style={styles.pickerValue}>
                  {editHomeLocation ? 'Location Locked' : 'Select on map'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => openEditLocationPicker('school')}>
                <Text style={styles.pickerLabel}>🏫 School Location</Text>
                <Text style={styles.pickerValue}>
                  {editSchoolLocation ? 'Location Locked' : 'Select on map'}
                </Text>
              </TouchableOpacity>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => {
                    resetEditForm();
                    setEditModalVisible(false);
                  }}
                  disabled={updatingChild}>
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={updateChild}
                  disabled={updatingChild}>
                  {updatingChild ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editMapModalVisible}
        animationType="slide"
        onRequestClose={() => setEditMapModalVisible(false)}>
        <SafeAreaView style={styles.mapFullscreen}>
          <View style={styles.mapToolbar}>
            <Text style={styles.mapToolbarTitle}>
              Pin {editingLocation === 'home' ? 'Home' : 'School'}
            </Text>
          </View>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.mapWidget}
            initialRegion={
              editTempMarker
                ? { ...editTempMarker, latitudeDelta: 0.01, longitudeDelta: 0.01 }
                : defaultRegion
            }
            onPress={handleEditMapPress}>
            {editTempMarker && (
              <Marker
                coordinate={editTempMarker}
                pinColor={
                  editingLocation === 'home' ? theme.colors.primary : theme.colors.secondary
                }
              />
            )}
          </MapView>
          <View style={styles.mapFooter}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => {
                setEditMapModalVisible(false);
                setEditTempMarker(null);
              }}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={confirmEditLocation}>
              <Text style={styles.btnPrimaryText}>Set Location</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  childAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  childAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
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
  detailHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
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
  profilePicEditContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePicEditButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  profilePicEdit: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  profilePicPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicPlaceholderText: {
    fontSize: 32,
    marginBottom: 4,
  },
  profilePicPlaceholderLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  editBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
