// Location coordinates interface
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

// Real-time driver/van location from Firebase Realtime Database
export interface DriverLocation {
  lat: number;
  lng: number;
  bearing: number; // Direction van is facing (0-360 degrees)
  timestamp: number; // Unix timestamp in milliseconds
}

// Student data model matching Firebase schema
export interface Student {
  id: string;
  name: string;
  age: string;
  grade: string;
  parentId: string;
  parentEmail: string;
  parentName: string;
  parentPhone: string;
  driverId: string;
  driverEmail: string;
  driverName: string;
  driverPhone: string;
  homeLocation: Location;
  schoolLocation: Location;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// Driver data model
export interface Driver {
  id: string;
  email: string;
  name: string;
  phone: string;
  vehicleNumber?: string;
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

// Parent data model
export interface Parent {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'parent';
  createdAt: string;
}

// Trip tracking (Firestore)
export interface Trip {
  id: string;
  driverId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  type: 'MORNING' | 'AFTERNOON';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startTime?: number; // timestamp
  endTime?: number; // timestamp
  children: Array<{ childId: string; status: string }>; // array of child objects with status
}

// Individual pickup/dropoff status
export interface PickupStatus {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  time?: number; // timestamp
  location?: Location;
}

// Daily child status (Firestore)
export interface ChildStatus {
  childId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  morningPickup: PickupStatus;
  schoolDropoff: PickupStatus;
  schoolPickup: PickupStatus;
  homeDropoff: PickupStatus;
  currentStatus: 'AT_HOME' | 'IN_VAN' | 'AT_SCHOOL';
}
