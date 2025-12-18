import { firestore } from '../config/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Trip } from '../types/types';

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Get all trips for a specific driver on a specific date
 * @param driverId - The driver's user ID
 * @param date - ISO date string (YYYY-MM-DD), defaults to today
 * @returns Promise<Trip[]>
 */
export const getTripsForDriver = async (
  driverId: string,
  date: string = getTodayDateString()
): Promise<Trip[]> => {
  try {
    const tripsRef = collection(firestore, 'trips');
    const q = query(tripsRef, where('driverId', '==', driverId), where('date', '==', date));

    const snapshot = await getDocs(q);

    const trips: Trip[] = [];
    snapshot.forEach((doc) => {
      trips.push({ id: doc.id, ...doc.data() } as Trip);
    });

    return trips;
  } catch (error) {
    console.error('Error fetching trips:', error);
    throw new Error('Failed to fetch trips');
  }
};

/**
 * Get today's trips for a driver
 * @param driverId - The driver's user ID
 * @returns Promise<Trip[]>
 */
export const getTodayTripsForDriver = async (driverId: string): Promise<Trip[]> => {
  return getTripsForDriver(driverId, getTodayDateString());
};

/**
 * Get the active trip for a driver (IN_PROGRESS status)
 * @param driverId - The driver's user ID
 * @returns Promise<Trip | null>
 */
export const getActiveTripForDriver = async (driverId: string): Promise<Trip | null> => {
  try {
    const tripsRef = collection(firestore, 'trips');
    const q = query(
      tripsRef,
      where('driverId', '==', driverId),
      where('status', '==', 'IN_PROGRESS')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // Return the first active trip (there should only be one)
    const firstDoc = snapshot.docs[0];
    return { id: firstDoc.id, ...firstDoc.data() } as Trip;
  } catch (error) {
    console.error('Error fetching active trip:', error);
    throw new Error('Failed to fetch active trip');
  }
};

/**
 * Get a specific trip by ID
 * @param tripId - The trip document ID
 * @returns Promise<Trip | null>
 */
export const getTripById = async (tripId: string): Promise<Trip | null> => {
  try {
    const tripDoc = await getDoc(doc(firestore, 'trips', tripId));

    if (!tripDoc.exists()) {
      return null;
    }

    return { id: tripDoc.id, ...tripDoc.data() } as Trip;
  } catch (error) {
    console.error('Error fetching trip:', error);
    throw new Error('Failed to fetch trip');
  }
};

/**
 * Check if a child is on an active trip
 * @param childId - The student's ID
 * @param driverId - The driver's user ID
 * @returns Promise<boolean>
 */
export const isChildOnActiveTrip = async (childId: string, driverId: string): Promise<boolean> => {
  try {
    const activeTrip = await getActiveTripForDriver(driverId);

    if (!activeTrip) {
      return false;
    }

    return activeTrip.children.some((child) => child.childId === childId);
  } catch (error) {
    console.error('Error checking child trip status:', error);
    return false;
  }
};
