import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { firestore, database } from '../../src/config/firebaseConfig';
import { useAuth } from '../../src/context/AuthContext';
import { useTrip } from '../../src/context/TripContext';
import { calculateOptimalRoute } from '../../src/services/routeOptimizationService';
import { theme } from '../../src/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { TripType, ChildActionEvent, StudentStatus, Student } from '../../src/types/types';

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location Task Error:', error.message);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const latestLocation = locations[0];
    const driverId = await AsyncStorage.getItem('driverId');

    if (!driverId) {
      console.error('Driver ID not found. Stopping updates.');
      return;
    }

    try {
      const vanLocationRef = ref(database, `locations/${driverId}`);
      const locationData = {
        lat: latestLocation.coords.latitude,
        lng: latestLocation.coords.longitude,
        speed: latestLocation.coords.speed || 0,
        bearing: latestLocation.coords.heading || 0,
        timestamp: Date.now(),
      };
      await set(vanLocationRef, locationData);
    } catch (e) {
      console.error('Error sending location to Realtime DB:', e);
    }
  }
});

interface StudentListProps {
  students: Student[];
  onUpdateStatus: (studentId: string, action: ChildActionEvent) => Promise<void>;
  tripType: TripType;
}

const StudentList: React.FC<StudentListProps> = ({ students, onUpdateStatus, tripType }) => {
  const [pressedStudentId, setPressedStudentId] = useState<string | null>(null);
  const [pressedNotAttendedId, setPressedNotAttendedId] = useState<string | null>(null);

  const getActionDetails = (student: Student) => {
    if (student.currentVanStatus === 'NOT_ATTENDED') {
      return {
        label: 'Not Attended',
        action: null,
        style: styles.notAttendedButton,
      };
    }

    if (tripType === 'MORNING') {
      if (student.currentVanStatus === 'NOT_PICKED_UP') {
        return {
          label: 'Pick Up',
          action: 'PICKUP' as ChildActionEvent,
          style: styles.pickupButton,
        };
      }
      if (student.currentVanStatus === 'IN_VAN') {
        return {
          label: 'Drop Off (School)',
          action: 'DROPOFF' as ChildActionEvent,
          style: styles.dropoffButton,
        };
      }
    }

    if (tripType === 'AFTERNOON') {
      if (student.currentVanStatus === 'NOT_PICKED_UP') {
        return {
          label: 'Pick Up (School)',
          action: 'PICKUP' as ChildActionEvent,
          style: styles.pickupButton,
        };
      }
      if (student.currentVanStatus === 'IN_VAN') {
        return {
          label: 'Drop Off (Home)',
          action: 'DROPOFF' as ChildActionEvent,
          style: styles.dropoffButton,
        };
      }
    }

    return { label: 'Complete', action: null, style: styles.completeButton };
  };

  const activeStudents = students.filter(
    (s) => s.currentVanStatus !== 'DROPPED_OFF' && s.currentVanStatus !== 'NOT_ATTENDED'
  );
  const completedStudents = students.filter(
    (s) => s.currentVanStatus === 'DROPPED_OFF' || s.currentVanStatus === 'NOT_ATTENDED'
  );

  const renderStudent = (student: Student) => {
    const { label, action, style } = getActionDetails(student);
    const isPressed = pressedStudentId === student.id;

    const displayStatus = (student.currentVanStatus ?? 'NOT_PICKED_UP')
      .replace(/_/g, ' ')
      .toLowerCase();

    return (
      <View key={student.id} style={styles.studentCard}>
        <View style={styles.studentInfo}>
          {student.profilePic ? (
            <Image source={{ uri: student.profilePic }} style={styles.studentAvatar} />
          ) : (
            <View style={styles.studentAvatarPlaceholder}>
              <Text style={styles.studentAvatarText}>{student.name.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.studentInfoText}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentStatus}>
              Status: <Text style={styles.statusValue}>{displayStatus}</Text>
            </Text>
          </View>
        </View>
        <View style={styles.actionButtonsColumn}>
          {action ? (
            <TouchableWithoutFeedback
              onPress={() => action && onUpdateStatus(student.id, action)}
              onPressIn={() => setPressedStudentId(student.id)}
              onPressOut={() => setPressedStudentId(null)}>
              <View style={[styles.statusButton, style, isPressed && styles.pressedOpacity]}>
                <Text style={styles.statusButtonText}>{label}</Text>
              </View>
            </TouchableWithoutFeedback>
          ) : (
            <View style={[styles.statusButton, style || styles.completeButton]}>
              <Text style={styles.statusButtonText}>{label}</Text>
            </View>
          )}

          {student.currentVanStatus === 'NOT_PICKED_UP' && (
            <TouchableWithoutFeedback
              onPress={() => onUpdateStatus(student.id, 'NOT_ATTENDED')}
              onPressIn={() => setPressedNotAttendedId(student.id)}
              onPressOut={() => setPressedNotAttendedId(null)}>
              <View
                style={[
                  styles.statusButton,
                  styles.notAttendedButton,
                  pressedNotAttendedId === student.id && styles.pressedOpacity,
                ]}>
                <Text style={styles.statusButtonText}>Not Attended</Text>
              </View>
            </TouchableWithoutFeedback>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.listContainer}>
      {activeStudents.length > 0 && (
        <>
          <Text style={styles.listTitle}>Active Students ({activeStudents.length})</Text>
          {activeStudents.map(renderStudent)}
        </>
      )}

      {completedStudents.length > 0 && (
        <>
          <Text style={styles.listTitle}>Completed ({completedStudents.length})</Text>
          {completedStudents.map(renderStudent)}
        </>
      )}
    </View>
  );
};

export default function DashboardScreen() {
  const { user, userProfile } = useAuth();
  const { setTripData, endTrip: endTripContext } = useTrip();
  const router = useRouter();
  const [isTripActive, setIsTripActive] = useState(false);
  const [tripStatusText, setTripStatusText] = useState('No active trip');
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  const [isPressingStartEnd, setIsPressingStartEnd] = useState(false);
  const [pressedTripType, setPressedTripType] = useState<TripType | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [tripType, setTripType] = useState<TripType>('MORNING');

  const driverId = user?.uid;

  useEffect(() => {
    const checkTaskStatus = async () => {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      const storedTripId = await AsyncStorage.getItem('currentTripId');
      const storedTripType = (await AsyncStorage.getItem('currentTripType')) as TripType | null;

      if (isRegistered && storedTripId) {
        setCurrentTripId(storedTripId);
        if (storedTripType === 'MORNING' || storedTripType === 'AFTERNOON') {
          setTripType(storedTripType);
        }
        setIsTripActive(true);
        setTripStatusText(`Trip IN_PROGRESS: ${storedTripType ?? tripType}`);
      } else if (isRegistered && !storedTripId) {
        try {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        } catch (e) {
          console.error('Failed to stop orphaned location task:', e);
        }
        setIsTripActive(false);
        setCurrentTripId(null);
        setTripStatusText('No active trip');
      } else {
        setIsTripActive(false);
        setCurrentTripId(null);
        setTripStatusText('No active trip');
      }
    };
    checkTaskStatus();

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {};

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isTripActive]);

  const getCurrentLocationData = async () => {
    const location = await Location.getCurrentPositionAsync({});
    return {
      time: serverTimestamp(),
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
    };
  };

  const handleUpdateChildStatus = async (childId: string, action: ChildActionEvent) => {
    if (!currentTripId || !driverId) {
      Alert.alert('Error', 'No active trip found.');
      return;
    }

    try {
      const locationData = await getCurrentLocationData();
      const date = new Date().toISOString().split('T')[0];

      let newVanStatus: Student['currentVanStatus'];
      let newOverallStatus: 'AT_HOME' | 'IN_VAN' | 'AT_SCHOOL';

      const baseRecord = {
        time: locationData.time,
        location: locationData.location,
        tripId: currentTripId,
      };

      let updateData: Partial<StudentStatus>;

      if (action === 'PICKUP') {
        const pickupKey = tripType === 'MORNING' ? 'morningPickup' : 'schoolPickup';
        newVanStatus = 'IN_VAN';
        newOverallStatus = 'IN_VAN';
        updateData = {
          [pickupKey]: {
            status: 'COMPLETED',
            ...baseRecord,
          },
          currentStatus: newOverallStatus,
        };
      } else if (action === 'DROPOFF') {
        const dropoffKey = tripType === 'MORNING' ? 'schoolDropoff' : 'homeDropoff';
        newVanStatus = 'DROPPED_OFF';
        newOverallStatus = tripType === 'MORNING' ? 'AT_SCHOOL' : 'AT_HOME';
        updateData = {
          [dropoffKey]: {
            status: 'COMPLETED',
            ...baseRecord,
          },
          currentStatus: newOverallStatus,
        };
      } else {
        const pickupKey = tripType === 'MORNING' ? 'morningPickup' : 'schoolPickup';
        const dropoffKey = tripType === 'MORNING' ? 'schoolDropoff' : 'homeDropoff';
        newVanStatus = 'NOT_ATTENDED';
        newOverallStatus = tripType === 'MORNING' ? 'AT_HOME' : 'AT_SCHOOL';

        const notAttendedRecord = {
          status: 'NOT_ATTENDED' as const,
          ...baseRecord,
        };

        updateData = {
          [pickupKey]: notAttendedRecord,
          [dropoffKey]: notAttendedRecord,
          currentStatus: newOverallStatus,
        };
      }

      const childStatusDocRef = doc(firestore, 'childStatus', childId, 'dates', date);
      await setDoc(childStatusDocRef, updateData, { merge: true });

      const tripDocRef = doc(firestore, 'trips', currentTripId);
      const tripDocSnapshot = await getDoc(tripDocRef);

      if (tripDocSnapshot.exists()) {
        const tripData = tripDocSnapshot.data();
        const existingChildrenArray = tripData.children || [];
        const updatedChildrenArray = existingChildrenArray.map(
          (child: { childId: string; status: string }) => {
            if (child.childId === childId) {
              return { childId: childId, status: newVanStatus };
            }
            return child;
          }
        );

        await updateDoc(tripDocRef, { children: updatedChildrenArray });
      }

      setStudents((prevStudents) =>
        prevStudents.map((s) => (s.id === childId ? { ...s, currentVanStatus: newVanStatus } : s))
      );

      Alert.alert(
        'Success',
        `${action} recorded for ${students.find((s) => s.id === childId)?.name || 'student'}.`
      );
    } catch (e) {
      console.error('Error updating child status:', e);
      Alert.alert('Error', 'Failed to update child status.');
    }
  };

  const handleStartTrip = async () => {
    if (!driverId) {
      Alert.alert('Error', 'Driver ID not found. Please log in again.');
      return;
    }
    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) return;

    setIsCalculatingRoute(true);

    try {
      const studentsQuery = query(
        collection(firestore, 'students'),
        where('driverId', '==', driverId),
        where('status', '==', 'approved')
      );
      const studentSnapshot = await getDocs(studentsQuery);
      const fetchedStudents: Student[] = studentSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            currentVanStatus: 'NOT_PICKED_UP',
            ...doc.data(),
          }) as Student
      );

      if (fetchedStudents.length === 0) {
        Alert.alert('No Students', 'You have no approved students for this trip.');
        setIsCalculatingRoute(false);
        return;
      }

      setStudents(fetchedStudents);

      console.log('Calculating optimal route...');
      const today = new Date().toISOString().split('T')[0];
      const optimizedRoute = await calculateOptimalRoute(
        driverId,
        today,
        tripType,
        undefined,
        true
      );

      console.log('Route calculated:', optimizedRoute.id);

      const tripId = driverId + '_' + Date.now();
      const tripDocRef = doc(firestore, 'trips', tripId);
      const initialChildrenStatus = fetchedStudents.map((s) => ({
        childId: s.id,
        status: 'NOT_PICKED_UP',
      }));

      await setDoc(tripDocRef, {
        driverId: driverId,
        date: today,
        type: tripType,
        status: 'IN_PROGRESS',
        startTime: serverTimestamp(),
        endTime: null,
        children: initialChildrenStatus,
      });

      setCurrentTripId(tripId);
      await AsyncStorage.setItem('driverId', driverId);
      await AsyncStorage.setItem('currentTripId', tripId);
      await AsyncStorage.setItem('currentTripType', tripType);

      setTripData(tripId, tripType, optimizedRoute);

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 10,
        timeInterval: 5000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Van Tracking Active',
          notificationBody: 'Your location is being shared with parents.',
          notificationColor: theme.colors.primary,
        },
      });

      setIsTripActive(true);
      setTripStatusText(`Trip IN_PROGRESS: ${tripType}`);
      setIsCalculatingRoute(false);

      const routeInfo = `Route optimized: ${optimizedRoute.waypoints.length} stops, ${(optimizedRoute.totalDistance / 1000).toFixed(1)} km`;
      Alert.alert('Trip Started', `${routeInfo}\n\nReal-time location sharing is now active.`);
    } catch (error) {
      console.error('Error starting trip:', error);
      setIsCalculatingRoute(false);
      Alert.alert('Error', `Failed to start trip: ${error}`);
    }
  };

  const handleEndTrip = async () => {
    if (!driverId || !currentTripId) return;
    try {
      if (await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      await updateDoc(doc(firestore, 'trips', currentTripId), {
        status: 'COMPLETED',
        endTime: serverTimestamp(),
      });

      endTripContext();

      await AsyncStorage.removeItem('currentTripId');
      setCurrentTripId(null);
      setStudents([]);
      setIsTripActive(false);
      setTripStatusText('No active trip');

      Alert.alert('Trip Ended', 'Location tracking has stopped.', [
        {
          text: 'OK',
          onPress: () => {
            router.push('/(tabs)/map');
          },
        },
      ]);
    } catch (error) {
      console.error('Error ending trip:', error);
      Alert.alert('Error', 'Failed to stop trip tracking. Please check logs.');
    }
  };

  const requestPermissions = async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Foreground location permission is required to start the trip.'
      );
      return false;
    }
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Background Location Required',
          'Background location permission is essential for real-time tracking.'
        );
        return false;
      }
    }
    return true;
  };

  const actionButtonStyle = isTripActive ? styles.actionButtonEnd : styles.actionButtonStart;
  const actionButtonTitle = isTripActive
    ? 'End Trip'
    : isCalculatingRoute
      ? 'Calculating Route...'
      : 'Start Trip';
  const actionButtonText = isTripActive
    ? 'Tap to stop tracking'
    : isCalculatingRoute
      ? 'Please wait'
      : 'Tap to begin tracking';
  const actionHandler = isTripActive ? handleEndTrip : handleStartTrip;
  const tripStatusColor = isTripActive ? theme.colors.success : theme.colors.text.secondary;

  const buttonStyle = {
    ...(isTripActive ? styles.actionButtonEnd : styles.actionButtonStart),
    opacity: isPressingStartEnd || isCalculatingRoute ? 0.9 : 1.0,
    transform: [{ scale: isPressingStartEnd ? 0.98 : 1 }],
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.dashboardHeader}>
            <View style={styles.dashboardTitleContainer}>
              <Text style={styles.dashboardTitle}>Dashboard</Text>
            </View>
            {userProfile?.profilePic && (
              <Image source={{ uri: userProfile.profilePic }} style={styles.dashboardProfilePic} />
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trip Status</Text>
            <Text style={[styles.cardText, { color: tripStatusColor }]}>
              {tripStatusText.replace(/_/g, ' ').toLowerCase()}
            </Text>
          </View>

          {!isTripActive && (
            <View style={styles.tripTypeContainer}>
              <Text style={styles.tripTypeLabel}>Select Trip:</Text>
              <View style={styles.tripTypeButtons}>
                <TouchableWithoutFeedback
                  onPress={() => setTripType('MORNING')}
                  onPressIn={() => setPressedTripType('MORNING')}
                  onPressOut={() => setPressedTripType(null)}>
                  <View
                    style={[
                      styles.tripTypeButton,
                      tripType === 'MORNING' && styles.tripTypeActive,
                      pressedTripType === 'MORNING' && styles.pressedOpacity,
                    ]}>
                    <Text
                      style={[
                        styles.tripTypeButtonText,
                        tripType === 'MORNING' && styles.tripTypeActiveText,
                      ]}>
                      Morning
                    </Text>
                  </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback
                  onPress={() => setTripType('AFTERNOON')}
                  onPressIn={() => setPressedTripType('AFTERNOON')}
                  onPressOut={() => setPressedTripType(null)}>
                  <View
                    style={[
                      styles.tripTypeButton,
                      tripType === 'AFTERNOON' && styles.tripTypeActive,
                      pressedTripType === 'AFTERNOON' && styles.pressedOpacity,
                    ]}>
                    <Text
                      style={[
                        styles.tripTypeButtonText,
                        tripType === 'AFTERNOON' && styles.tripTypeActiveText,
                      ]}>
                      Afternoon
                    </Text>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </View>
          )}

          <TouchableWithoutFeedback
            onPress={actionHandler}
            onPressIn={() => setIsPressingStartEnd(true)}
            onPressOut={() => setIsPressingStartEnd(false)}>
            <View style={buttonStyle}>
              <Text style={styles.actionButtonTitle}>{actionButtonTitle}</Text>
              <Text style={styles.actionButtonText}>{actionButtonText}</Text>
            </View>
          </TouchableWithoutFeedback>

          {isTripActive && students.length > 0 && (
            <StudentList
              students={students}
              onUpdateStatus={handleUpdateChildStatus}
              tripType={tripType}
            />
          )}
        </View>
      </ScrollView>
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
    paddingBottom: 40,
  },
  container: {
    padding: 20,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  dashboardTitleContainer: {
    flex: 1,
  },
  dashboardTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  dashboardProfilePic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardTitle: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#9CA3AF',
  },
  cardText: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  tripTypeContainer: {
    marginBottom: 24,
  },
  tripTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  tripTypeButtons: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
  },
  tripTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripTypeActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tripTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tripTypeActiveText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  actionButtonStart: {
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    padding: 20,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 30,
  },
  actionButtonEnd: {
    borderRadius: 16,
    backgroundColor: '#EF4444',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 30,
  },
  actionButtonTitle: {
    marginBottom: 4,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  listContainer: {
    marginTop: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  studentAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  studentInfoText: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  studentStatus: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusValue: {
    fontWeight: '700',
    color: '#374151',
    textTransform: 'capitalize',
  },
  actionButtonsColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  pickupButton: {
    backgroundColor: theme.colors.primary,
  },
  dropoffButton: {
    backgroundColor: theme.colors.primary,
  },
  notAttendedButton: {
    backgroundColor: '#FECACA', // Light red
  },
  completeButton: {
    backgroundColor: '#E5E7EB',
  },
  pressedOpacity: {
    opacity: 0.7,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
