import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
// Firestore Imports (Kept for the trip record, which is still in Firestore)
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
// Realtime DB Imports <-- NEW IMPORTS
import { ref, set } from 'firebase/database';
// Import database (RTDB) and firestore (FS) from config
import { firestore, database } from '../../src/config/firebaseConfig';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- CONFIGURATION ---
const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

// --- BACKGROUND LOCATION TASK DEFINITION ---
// Task to run in the background for continuous location updates
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
      // Optionally, stop the location task if driverId is missing
      // if (await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)) {
      //     await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      // }
      return;
    }

    try {
      // ----------------------------------------------------
      // REALTIME DATABASE UPDATE <-- MODIFIED
      // Path: van_locations/{driverId}
      // ----------------------------------------------------
      const vanLocationRef = ref(database, `van_locations/${driverId}`);

      const locationData = {
        driverId: driverId,
        latitude: latestLocation.coords.latitude,
        longitude: latestLocation.coords.longitude,
        speed: latestLocation.coords.speed,
        timestamp: new Date().toISOString(), // Use ISO string for RTDB timestamps
      };

      // Use 'set' to overwrite the location data for this driver, giving us the latest update
      await set(vanLocationRef, locationData);

      console.log(
        'Location sent to Realtime DB:',
        latestLocation.coords.latitude,
        latestLocation.coords.longitude
      );
    } catch (e) {
      console.error('Error sending location to Realtime DB:', e);
    }
  }
});

export default function DashboardScreen() {
  const { user } = useAuth();
  const [isTripActive, setIsTripActive] = useState(false);
  const [tripStatusText, setTripStatusText] = useState('No active trip');

  const driverId = user?.uid;

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

  // --- START TRIP HANDLER (No change, as the trip record stays in Firestore) ---
  const handleStartTrip = async () => {
    if (!driverId) {
      Alert.alert('Error', 'Driver ID not found. Please log in again.');
      return;
    }

    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) return;

    try {
      // 1. Record Trip Start Time in Firestore (Keep this in Firestore)
      const tripDocRef = doc(firestore, 'trips', driverId + '_' + Date.now());
      await setDoc(tripDocRef, {
        driverId: driverId,
        startTime: serverTimestamp(),
        status: 'active',
      });

      await AsyncStorage.setItem('driverId', driverId);
      // 2. Start Background Location Tracking (Location task will use RTDB)
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
      setTripStatusText('Trip Active. Location tracking in progress.');
      Alert.alert('Trip Started', 'Real-time location sharing is now active.');
    } catch (error) {
      console.error('Error starting trip:', error);
      Alert.alert('Error', 'Failed to start trip. Check logs.');
    }
  };

  // --- END TRIP HANDLER (No change) ---
  const handleEndTrip = async () => {
    if (!driverId) return;

    try {
      // 1. Stop Background Location Tracking
      if (await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      // 2. Update Trip Status in Firestore (Assumed logic)
      // ...

      setIsTripActive(false);
      setTripStatusText('No active trip');
      Alert.alert('Trip Ended', 'Location tracking has stopped.');
    } catch (error) {
      console.error('Error ending trip:', error);
      Alert.alert('Error', 'Failed to stop trip tracking. Please check logs.');
    }
  };

  // --- CLEANUP ON UNMOUNT (No change) ---
  useEffect(() => {
    return () => {
      // ... (Keep existing cleanup code) ...
    };
  }, []);

  // Conditional styling and rendering logic (No change)
  const actionButtonStyle = isTripActive ? styles.actionButtonEnd : styles.actionButtonStart;
  const actionButtonTitle = isTripActive ? 'End Trip' : 'Start Trip';
  const actionButtonText = isTripActive ? 'Tap to stop tracking' : 'Tap to begin tracking';
  const actionHandler = isTripActive ? handleEndTrip : handleStartTrip;
  const tripStatusColor = isTripActive ? theme.colors.success : theme.colors.text.secondary;

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

          {/* Today's Summary Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Summary</Text>
            <Text style={styles.cardText}>Students: 0 picked up, 0 dropped off</Text>
          </View>

          {/* Quick Actions */}
          <TouchableOpacity style={actionButtonStyle} onPress={actionHandler}>
            <Text style={styles.actionButtonTitle}>{actionButtonTitle}</Text>
            <Text style={styles.actionButtonText}>{actionButtonText}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ... (Keep existing styles) ...
const styles = StyleSheet.create({
  // ... (Keep existing styles) ...
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
      android: {
        elevation: 1,
      },
    }),
  },
  cardTitle: {
    marginBottom: theme.spacing.xs,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  cardText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
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
      android: {
        elevation: 3,
      },
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
      android: {
        elevation: 3,
      },
    }),
  },
  actionButtonTitle: {
    marginBottom: theme.spacing.xs,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.surface,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#fee2e2',
  },
});
