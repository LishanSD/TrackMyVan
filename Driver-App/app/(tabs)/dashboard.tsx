import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
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
  FieldValue, // <-- ADDED for serverTimestamp type consistency
} from 'firebase/firestore';
// Realtime DB Imports
import { ref, set } from 'firebase/database';
// Import database (RTDB) and firestore (FS) from config
import { firestore, database } from '../../src/config/firebaseConfig';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- TYPE DEFINITIONS ---
type TripType = 'MORNING' | 'AFTERNOON';
type ChildActionEvent = 'PICKUP' | 'DROPOFF';

// Location structure for recording events
interface LocationRecord {
  status: 'COMPLETED' | 'PENDING';
  time: FieldValue;
  location: {
    latitude: number;
    longitude: number;
  };
  tripId: string;
}

// The missing interface for the Firestore document /childStatus/{childId}/dates/{date}
interface StudentStatus {
  morningPickup: LocationRecord;
  schoolDropoff: LocationRecord;
  schoolPickup: LocationRecord;
  homeDropoff: LocationRecord;
  currentStatus: 'AT_HOME' | 'IN_VAN' | 'AT_SCHOOL';
}

interface Student {
  id: string;
  name: string;
  driverId: string;
  parentId: string;
  // This status reflects their current state relative to the van
  currentVanStatus: 'NOT_PICKED_UP' | 'IN_VAN' | 'DROPPED_OFF';
  homeLocation: { latitude: number; longitude: number };
  schoolLocation: { latitude: number; longitude: number };
}

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
      console.error('Driver ID not found in AsyncStorage for background task. Stopping updates.');
      return;
    }

    try {
      // ----------------------------------------------------
      // REALTIME DATABASE UPDATE: /locations/{driverId}
      // ----------------------------------------------------
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
  // Determine the next action and status based on trip type and current status
  const getActionDetails = (student: Student) => {
    // --- MORNING TRIP LOGIC ---
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
      // If Morning trip and status is DROPPED_OFF, it falls through to Complete.
    } // --- AFTERNOON TRIP LOGIC ---

    if (tripType === 'AFTERNOON') {
      // Check 1: Ready for School Pick Up
      // We assume NOT_PICKED_UP means they need to be picked up from school.
      // If the status is DROPPED_OFF (meaning dropped at home), they are COMPLETE.
      if (student.currentVanStatus === 'NOT_PICKED_UP') {
        return {
          label: 'Pick Up (School)',
          action: 'PICKUP' as ChildActionEvent,
          style: styles.pickupButton,
        };
      }

      // Check 2: Ready for Home Drop Off
      if (student.currentVanStatus === 'IN_VAN') {
        return {
          label: 'Drop Off (Home)',
          action: 'DROPOFF' as ChildActionEvent,
          style: styles.dropoffButton,
        };
      }
    } // --- DEFAULT: COMPLETE ---
    // If the status is DROPPED_OFF (for morning or afternoon),
    // or any other unhandled state, the student is complete for this trip.

    return { label: 'Complete', action: null, style: styles.completeButton };
  };

  const activeStudents = students.filter((s) => s.currentVanStatus !== 'DROPPED_OFF');
  const completedStudents = students.filter((s) => s.currentVanStatus === 'DROPPED_OFF');

  const renderStudent = (student: Student) => {
    const { label, action, style } = getActionDetails(student);

    return (
      <View key={student.id} style={styles.studentCard}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.studentStatus}>
            Status: {student.currentVanStatus.replace(/_/g, ' ')}
          </Text>
        </View>
        {action ? (
          <TouchableOpacity
            style={[styles.statusButton, style]}
            onPress={() => action && onUpdateStatus(student.id, action)}>
            <Text style={styles.statusButtonText}>{label}</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.statusButton, styles.completeButton]}>
            <Text style={styles.statusButtonText}>{label}</Text>
          </View>
        )}
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
  const [isPressing, setIsPressing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [tripType, setTripType] = useState<TripType>('MORNING');

  const driverId = user?.uid;

  // Function to get the current timestamp and location data
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

  // --- CHILD STATUS UPDATE HANDLER ---
  const handleUpdateChildStatus = async (childId: string, action: ChildActionEvent) => {
    if (!currentTripId || !driverId) {
      Alert.alert('Error', 'No active trip found.');
      return;
    }

    try {
      const locationData = await getCurrentLocationData();
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      // Determine status updates

      let updateKey: keyof StudentStatus;
      let newVanStatus: Student['currentVanStatus'];
      let newOverallStatus: 'AT_HOME' | 'IN_VAN' | 'AT_SCHOOL';

      if (action === 'PICKUP') {
        updateKey = tripType === 'MORNING' ? 'morningPickup' : 'schoolPickup';
        newVanStatus = 'IN_VAN';
        newOverallStatus = 'IN_VAN';
      } else {
        // DROPOFF
        updateKey = tripType === 'MORNING' ? 'schoolDropoff' : 'homeDropoff';
        newVanStatus = 'DROPPED_OFF';
        newOverallStatus = tripType === 'MORNING' ? 'AT_SCHOOL' : 'AT_HOME';
      }

      const updateData: Partial<StudentStatus> = {
        [updateKey]: {
          status: 'COMPLETED',
          time: locationData.time,
          location: locationData.location,
          tripId: currentTripId,
        },
        currentStatus: newOverallStatus,
      }; // --- TRANSACTION 1: Update the /childStatus/{childId}/dates/{date} document ---

      const childStatusDocRef = doc(firestore, 'childStatus', childId, 'dates', date);
      await setDoc(childStatusDocRef, updateData, { merge: true }); // --- TRANSACTION 2: Update the 'children' array in /trips/{currentTripId} ---

      const tripDocRef = doc(firestore, 'trips', currentTripId);
      const tripDocSnapshot = await getDoc(tripDocRef);

      if (tripDocSnapshot.exists()) {
        const tripData = tripDocSnapshot.data();
        const existingChildrenArray = tripData.children || []; // Get the existing array

        // Create the new updated array
        const updatedChildrenArray = existingChildrenArray.map(
          (child: { childId: string; status: string }) => {
            if (child.childId === childId) {
              // Found the student, update their status
              return {
                childId: childId,
                status: newVanStatus, // e.g., 'IN_VAN' or 'DROPPED_OFF'
              };
            }
            return child; // Return other children unchanged
          }
        );

        // Write the full updated array back to the trip document
        await updateDoc(tripDocRef, {
          children: updatedChildrenArray,
        });
      } // 3. Update the local student list state (for UI refresh)

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

  // --- START TRIP HANDLER (No change) ---
  const handleStartTrip = async () => {
    if (!driverId) {
      Alert.alert('Error', 'Driver ID not found. Please log in again.');
      return;
    }

    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) return;

    try {
      // 0. Fetch students for the driver
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
            currentVanStatus: 'NOT_PICKED_UP', // Initial status when trip starts
            ...doc.data(),
          }) as Student
      ); // Cast to Student type

      setStudents(fetchedStudents);

      // 1. Record Trip Start Time in Firestore
      const tripId = driverId + '_' + Date.now();
      const tripDocRef = doc(firestore, 'trips', tripId);

      const initialChildrenStatus = fetchedStudents.map((s) => ({
        childId: s.id,
        status: 'NOT_PICKED_UP', // Status relative to the van
      }));

      const today = new Date().toISOString().split('T')[0];

      await setDoc(tripDocRef, {
        driverId: driverId,
        date: today,
        type: tripType, // Use state
        status: 'IN_PROGRESS',
        startTime: serverTimestamp(),
        endTime: null,
        children: initialChildrenStatus,
      });

      setCurrentTripId(tripId); // Save trip ID to state
      await AsyncStorage.setItem('driverId', driverId);
      await AsyncStorage.setItem('currentTripId', tripId); // Save for background task/End Trip

      // 2. Start Background Location Tracking
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

  // --- END TRIP HANDLER (No change) ---
  const handleEndTrip = async () => {
    if (!driverId || !currentTripId) return;

    try {
      // 1. Stop Background Location Tracking
      if (await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      // 2. Update Trip Status in Firestore
      await updateDoc(doc(firestore, 'trips', currentTripId), {
        status: 'COMPLETED',
        endTime: serverTimestamp(),
      });

      // 3. Clear stored state
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

  // --- LOCATION PERMISSIONS & CHECK (No change) ---
  const requestPermissions = async () => {
    // ... (Keep existing code) ...
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
          'Background location permission is essential for real-time tracking when the app is minimized. Please grant it in your phone settings.'
        );
        return false;
      }
    }
    return true;
  };

  // --- CLEANUP ON UNMOUNT (No change) ---
  useEffect(() => {
    return () => {
      // ... (Keep existing cleanup code) ...
    };
  }, []);

  // Conditional styling and rendering logic
  const actionButtonStyle = isTripActive ? styles.actionButtonEnd : styles.actionButtonStart;
  const actionButtonTitle = isTripActive ? 'End Trip' : 'Start Trip';
  const actionButtonText = isTripActive ? 'Tap to stop tracking' : 'Tap to begin tracking';
  const actionHandler = isTripActive ? handleEndTrip : handleStartTrip;
  const tripStatusColor = isTripActive ? theme.colors.success : theme.colors.text.secondary;

  const buttonStyle = {
    ...(isTripActive ? styles.actionButtonEnd : styles.actionButtonStart),
    opacity: isPressing ? 0.8 : 1.0,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.dashboardTitle}>Dashboard</Text>

          {/* Trip Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trip Status</Text>
            <Text style={[styles.cardText, { color: tripStatusColor, fontWeight: 'bold' }]}>
              {tripStatusText}
            </Text>
          </View>

          {/* Trip Type Selector (Only visible before trip starts) */}
          {!isTripActive && (
            <View style={styles.tripTypeContainer}>
              <Text style={styles.tripTypeLabel}>Select Trip:</Text>
              <View style={styles.tripTypeButtons}>
                <TouchableOpacity
                  style={[styles.tripTypeButton, tripType === 'MORNING' && styles.tripTypeActive]}
                  onPress={() => setTripType('MORNING')}>
                  <Text
                    style={[
                      styles.tripTypeButtonText,
                      tripType === 'MORNING' && styles.tripTypeActiveText,
                    ]}>
                    Morning
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tripTypeButton, tripType === 'AFTERNOON' && styles.tripTypeActive]}
                  onPress={() => setTripType('AFTERNOON')}>
                  <Text
                    style={[
                      styles.tripTypeButtonText,
                      tripType === 'AFTERNOON' && styles.tripTypeActiveText,
                    ]}>
                    Afternoon
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quick Actions (Start/End Trip) */}
          <TouchableWithoutFeedback
            onPress={actionHandler}
            onPressIn={() => setIsPressing(true)}
            onPressOut={() => setIsPressing(false)}>
            <View style={buttonStyle}>
              <Text style={styles.actionButtonTitle}>{actionButtonTitle}</Text>
              <Text style={styles.actionButtonText}>{actionButtonText}</Text>
            </View>
          </TouchableWithoutFeedback>

          {/* Student List (Only visible when trip is active) */}
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

// --- STYLES (UPDATED) ---
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

  // Trip Type Selector Styles
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
  tripTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
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
  tripTypeActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tripTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  tripTypeActiveText: {
    color: theme.colors.surface, // White text
  },

  // Action Button Styles (Kept)
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

  // Student List Styles
  listContainer: {
    marginTop: theme.spacing.lg,
  },
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
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  studentStatus: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  statusButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  pickupButton: {
    backgroundColor: theme.colors.secondary, // green
  },
  dropoffButton: {
    backgroundColor: theme.colors.warning, // amber
  },
  completeButton: {
    backgroundColor: theme.colors.border, // gray-200
  },
  statusButtonText: {
    color: theme.colors.surface, // white
    fontWeight: 'bold',
    fontSize: 12,
  },
});
