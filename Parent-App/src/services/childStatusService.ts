import { firestore } from '../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ChildStatus, PickupStatus } from '../types/types';

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Convert Firestore timestamp to milliseconds
 */
const toMillis = (
  value?: number | { seconds: number; nanoseconds?: number } | any
): number | undefined => {
  if (!value) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'seconds' in value) {
    return value.seconds * 1000 + ((value.nanoseconds ?? 0) / 1_000_000);
  }
  return undefined;
};

/**
 * Convert PickupStatus timestamps from Firestore format to number
 */
const convertPickupStatus = (status: any): PickupStatus => {
  if (!status) return { status: 'PENDING' };
  return {
    status: status.status || 'PENDING',
    time: toMillis(status.time),
    location: status.location,
  };
};

export const getChildStatus = async (
  childId: string,
  date: string
): Promise<ChildStatus | null> => {
  try {
    const statusDoc = await getDoc(doc(firestore, 'childStatus', childId, 'dates', date));

    if (!statusDoc.exists()) {
      return null;
    }

    const data = statusDoc.data();

    return {
      childId,
      date,
      currentStatus: data.currentStatus || 'AT_HOME',
      morningPickup: convertPickupStatus(data.morningPickup),
      schoolDropoff: convertPickupStatus(data.schoolDropoff),
      schoolPickup: convertPickupStatus(data.schoolPickup),
      homeDropoff: convertPickupStatus(data.homeDropoff),
    } as ChildStatus;
  } catch (error) {
    console.error('Error fetching child status:', error);
    return null;
  }
};

/**
 * Get child status for today
 * @param childId - The student's ID
 * @returns Promise<ChildStatus | null>
 */
export const getChildStatusToday = async (childId: string): Promise<ChildStatus | null> => {
  return getChildStatus(childId, getTodayDateString());
};

/**
 * Get the current location status of a child
 * @param childId - The student's ID
 * @returns Promise<'AT_HOME' | 'IN_VAN' | 'AT_SCHOOL' | null>
 */
export const getCurrentStatus = async (
  childId: string
): Promise<'AT_HOME' | 'IN_VAN' | 'AT_SCHOOL' | null> => {
  try {
    const status = await getChildStatusToday(childId);
    return status?.currentStatus || null;
  } catch (error) {
    console.error('Error fetching current status:', error);
    return null;
  }
};

/**
 * Create a default/empty PickupStatus
 */
const createDefaultPickupStatus = (): PickupStatus => ({
  status: 'PENDING',
});

/**
 * Create a default ChildStatus for today
 * @param childId - The student's ID
 * @returns ChildStatus with default values
 */
export const createDefaultChildStatus = (childId: string): ChildStatus => {
  return {
    childId,
    date: getTodayDateString(),
    morningPickup: createDefaultPickupStatus(),
    schoolDropoff: createDefaultPickupStatus(),
    schoolPickup: createDefaultPickupStatus(),
    homeDropoff: createDefaultPickupStatus(),
    currentStatus: 'AT_HOME',
  };
};

/**
 * Get child status for today, or create default if not exists
 * @param childId - The student's ID
 * @returns Promise<ChildStatus>
 */
export const getChildStatusTodayOrDefault = async (childId: string): Promise<ChildStatus> => {
  const status = await getChildStatusToday(childId);
  return status || createDefaultChildStatus(childId);
};

/**
 * Get the next scheduled action for a child based on their current status
 * @param status - The child's current status
 * @returns string describing next action or null
 */
export const getNextAction = (status: ChildStatus): string | null => {
  const { currentStatus, morningPickup, schoolDropoff, schoolPickup, homeDropoff } = status;

  if (currentStatus === 'AT_HOME') {
    if (morningPickup.status === 'PENDING') {
      return 'Morning pickup pending';
    }
    if (homeDropoff.status === 'COMPLETED') {
      return 'At home';
    }
  }

  if (currentStatus === 'IN_VAN') {
    if (morningPickup.status === 'COMPLETED' && schoolDropoff.status !== 'COMPLETED') {
      return 'En route to school';
    }
    if (schoolPickup.status === 'COMPLETED' && homeDropoff.status !== 'COMPLETED') {
      return 'En route home';
    }
  }

  if (currentStatus === 'AT_SCHOOL') {
    if (schoolDropoff.status === 'COMPLETED' && schoolPickup.status === 'PENDING') {
      return 'At school';
    }
  }

  return null;
};
