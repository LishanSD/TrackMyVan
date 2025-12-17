import { FieldValue } from 'firebase/firestore';

export type TripType = 'MORNING' | 'AFTERNOON';
export type ChildActionEvent = 'PICKUP' | 'DROPOFF' | 'NOT_ATTENDED';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface LocationRecord {
  status: 'COMPLETED' | 'PENDING' | 'NOT_ATTENDED';
  time: FieldValue;
  location: {
    latitude: number;
    longitude: number;
  };
  tripId: string;
}

export interface StudentStatus {
  morningPickup: LocationRecord;
  schoolDropoff: LocationRecord;
  schoolPickup: LocationRecord;
  homeDropoff: LocationRecord;
  currentStatus: 'AT_HOME' | 'IN_VAN' | 'AT_SCHOOL';
}

export type PickupStatusState = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface PickupStatus {
  status: PickupStatusState;
  time?: number | { seconds: number; nanoseconds: number };
  location?: Location;
}

export interface ChildStatus {
  childId: string;
  date: string;
  morningPickup: PickupStatus;
  schoolDropoff: PickupStatus;
  schoolPickup: PickupStatus;
  homeDropoff: PickupStatus;
  currentStatus: 'AT_HOME' | 'IN_VAN' | 'AT_SCHOOL';
}

export interface Student {
  id: string;
  name: string;
  age?: string;
  grade?: string;
  parentEmail?: string;
  parentName?: string;
  parentPhone?: string;
  parentId?: string;
  driverId?: string;
  driverEmail?: string;
  driverName?: string;
  driverPhone?: string;
  homeLocation: Location;
  schoolLocation: Location;
  status?: 'pending' | 'approved' | 'rejected';
  currentVanStatus?: 'NOT_PICKED_UP' | 'IN_VAN' | 'DROPPED_OFF' | 'NOT_ATTENDED';
  createdAt?: string;
}

export interface UserProfile {
  email: string;
  name: string;
  phone: string;
  role: 'driver';
  createdAt: string;
}

export type MessageSenderRole = 'driver' | 'parent';

export interface Message {
  id: string;
  driverId: string;
  parentId: string;
  studentId?: string;
  text: string;
  senderId: string;
  senderRole: MessageSenderRole;
  createdAt?: number | { seconds: number; nanoseconds: number };
  isBroadcast?: boolean;
}

export interface Trip {
  id: string;
  driverId: string;
  date: string;
  type: TripType;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startTime?: number | { seconds: number; nanoseconds: number };
  endTime?: number | { seconds: number; nanoseconds: number };
  children?: string[];
  notes?: string;
}
