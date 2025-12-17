import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert,
  Platform,
  // TouchableOpacity removed
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
// Firestore Imports
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
  FieldValue,
} from 'firebase/firestore';
// Realtime DB Imports
import { ref, set } from 'firebase/database';
// Import database (RTDB) and firestore (FS) from config
import { firestore, database } from '../../src/config/firebaseConfig';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import {
  TripType,
  ChildActionEvent,
  LocationRecord,
  StudentStatus,
  Student,
} from '../../src/types/types';

// --- CONFIGURATION ---
const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

// --- BACKGROUND LOCATION TASK DEFINITION ---
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

// --- STUDENT LIST COMPONENT ---
interface StudentListProps {
  students: Student[];
  onUpdateStatus: (studentId: string, action: ChildActionEvent) => Promise<void>;
  tripType: TripType;
}

const StudentList: React.FC<StudentListProps> = ({ students, onUpdateStatus, tripType }) => {
  // State to track which specific student button is being pressed
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

    return (
      <View key={student.id} style={styles.studentCard}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.studentStatus}>
            Status: {(student.currentVanStatus ?? 'NOT_PICKED_UP').replace(/_/g, ' ')}
          </Text>
        </View>
        <View style={styles.actionButtonsColumn}>
          {action ? (
            // CONVERTED: TouchableWithoutFeedback
            <TouchableWithoutFeedback
              onPress={() => action && onUpdateStatus(student.id, action)}
              onPressIn={() => setPressedStudentId(student.id)}
              onPressOut={() => setPressedStudentId(null)}>
              {/* Style applied to the View, NOT the Touchable */}
              <View style={[styles.statusButton, style, isPressed && { opacity: 0.5 }]}>
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
                  pressedNotAttendedId === student.id && { opacity: 0.5 },
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
        <Text style={styles.listTitle}>Active Students ({activeStudents.length})</Text>
      )}
      {activeStudents.map(renderStudent)}

      {completedStudents.length > 0 && (
        <>
          <Text style={styles.listTitle}>Completed ({completedStudents.length})</Text>
          {completedStudents.map(renderStudent)}
        </>
      )}
    </View>
  );
};

// --- DASHBOARD SCREEN ---
export default function DashboardScreen() {
  const { user } = useAuth();
  const [isTripActive, setIsTripActive] = useState(false);
  const [tripStatusText, setTripStatusText] = useState('No active trip');

  // Press states for visual feedback
  const [isPressingStartEnd, setIsPressingStartEnd] = useState(false);
  const [pressedTripType, setPressedTripType] = useState<TripType | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [tripType, setTripType] = useState<TripType>('MORNING');

  const driverId = user?.uid;

  useEffect(() => {
    const checkTaskStatus = async () => {
      if (await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)) {
        setIsTripActive(true);
        setTripStatusText('Trip Active. Location tracking in progress.');
      }
    };
    checkTaskStatus();

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Logic for app state changes if needed
    };

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

      setStudents(fetchedStudents);

      const tripId = driverId + '_' + Date.now();
      const tripDocRef = doc(firestore, 'trips', tripId);
      const initialChildrenStatus = fetchedStudents.map((s) => ({
        childId: s.id,
        status: 'NOT_PICKED_UP',
      }));
      const today = new Date().toISOString().split('T')[0];

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
      Alert.alert('Trip Started', 'Real-time location sharing is now active.');
    } catch (error) {
      console.error('Error starting trip:', error);
      Alert.alert('Error', 'Failed to start trip. Check logs.');
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
      await AsyncStorage.removeItem('currentTripId');
      setCurrentTripId(null);
      setStudents([]);
      setIsTripActive(false);
      setTripStatusText('No active trip');
      Alert.alert('Trip Ended', 'Location tracking has stopped.');
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
  const actionButtonTitle = isTripActive ? 'End Trip' : 'Start Trip';
  const actionButtonText = isTripActive ? 'Tap to stop tracking' : 'Tap to begin tracking';
  const actionHandler = isTripActive ? handleEndTrip : handleStartTrip;
  const tripStatusColor = isTripActive ? theme.colors.success : theme.colors.text.secondary;

  const buttonStyle = {
    ...(isTripActive ? styles.actionButtonEnd : styles.actionButtonStart),
    opacity: isPressingStartEnd ? 0.8 : 1.0,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.dashboardTitle}>Dashboard</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trip Status</Text>
            <Text style={[styles.cardText, { color: tripStatusColor, fontWeight: 'bold' }]}>
              {tripStatusText}
            </Text>
          </View>

          {/* Trip Type Selector - CONVERTED to TouchableWithoutFeedback */}
          {!isTripActive && (
            <View style={styles.tripTypeContainer}>
              <Text style={styles.tripTypeLabel}>Select Trip:</Text>
              <View style={styles.tripTypeButtons}>
                {/* Morning Button */}
                <TouchableWithoutFeedback
                  onPress={() => setTripType('MORNING')}
                  onPressIn={() => setPressedTripType('MORNING')}
                  onPressOut={() => setPressedTripType(null)}>
                  <View
                    style={[
                      styles.tripTypeButton,
                      tripType === 'MORNING' && styles.tripTypeActive,
                      pressedTripType === 'MORNING' && { opacity: 0.5 },
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
                {/* Afternoon Button - Note: No whitespace between Touchables */}
                <TouchableWithoutFeedback
                  onPress={() => setTripType('AFTERNOON')}
                  onPressIn={() => setPressedTripType('AFTERNOON')}
                  onPressOut={() => setPressedTripType(null)}>
                  <View
                    style={[
                      styles.tripTypeButton,
                      tripType === 'AFTERNOON' && styles.tripTypeActive,
                      pressedTripType === 'AFTERNOON' && { opacity: 0.5 },
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

          {/* Quick Actions - Already converted */}
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

// --- STYLES ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  container: { padding: theme.spacing.lg },
  dashboardTitle: {
    marginBottom: theme.spacing.md,
    fontSize: 30,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  card: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  cardTitle: {
    marginBottom: theme.spacing.xs,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  cardText: { fontSize: 14, color: theme.colors.text.secondary },
  tripTypeContainer: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tripTypeLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  tripTypeButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  tripTypeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginHorizontal: theme.spacing.xs,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tripTypeActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tripTypeButtonText: { fontSize: 16, fontWeight: '600', color: theme.colors.text.primary },
  tripTypeActiveText: { color: theme.colors.surface },
  actionButtonStart: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  actionButtonEnd: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.error,
    padding: theme.spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  actionButtonTitle: {
    marginBottom: theme.spacing.xs,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.surface,
  },
  actionButtonText: { fontSize: 14, color: '#fee2e2' },
  listContainer: { marginTop: theme.spacing.lg },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.xs,
  },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 5,
    borderLeftColor: theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
      },
      android: { elevation: 1 },
    }),
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '600', color: theme.colors.text.primary },
  studentStatus: { fontSize: 12, color: theme.colors.text.secondary, marginTop: 2 },
  actionButtonsColumn: { alignItems: 'flex-end' },
  statusButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  pickupButton: { backgroundColor: theme.colors.secondary },
  dropoffButton: { backgroundColor: theme.colors.warning },
  notAttendedButton: { backgroundColor: theme.colors.error, marginTop: theme.spacing.xs },
  completeButton: { backgroundColor: theme.colors.border },
  statusButtonText: { color: theme.colors.surface, fontWeight: 'bold', fontSize: 12 },
});
