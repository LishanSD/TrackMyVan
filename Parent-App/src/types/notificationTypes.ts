/**
 * Notification Types
 *
 * Flexible type system for different notification categories
 */

// Notification categories for easy extensibility
export enum NotificationCategory {
  TRIP = 'TRIP',
  PICKUP = 'PICKUP',
  DROPOFF = 'DROPOFF',
  DRIVER = 'DRIVER',
  MESSAGE = 'MESSAGE',
  APPROVAL = 'APPROVAL',
  SYSTEM = 'SYSTEM',
  ATTENDANCE = 'ATTENDANCE',
}

// Base notification interface
export interface BaseNotification {
  id: string;
  timestamp: number;
  category: NotificationCategory;
  title: string;
  message: string;
  childId?: string;
  driverId?: string;
}

// Trip-related notifications
export interface TripStartedNotification extends BaseNotification {
  category: NotificationCategory.TRIP;
  type: 'TRIP_STARTED';
  tripId: string;
  tripType: 'MORNING' | 'AFTERNOON';
  affectedChildIds: string[];
}

export interface TripEndedNotification extends BaseNotification {
  category: NotificationCategory.TRIP;
  type: 'TRIP_ENDED';
  tripId: string;
  tripType: 'MORNING' | 'AFTERNOON';
}

// Child pickup notifications
export interface ChildPickedUpNotification extends BaseNotification {
  category: NotificationCategory.PICKUP;
  type: 'CHILD_PICKED_UP';
  childId: string;
  childName?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  pickupType: 'MORNING' | 'AFTERNOON';
}

// Child dropoff notifications
export interface ChildDroppedOffNotification extends BaseNotification {
  category: NotificationCategory.DROPOFF;
  type: 'CHILD_DROPPED_OFF';
  childId: string;
  childName?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  dropoffType: 'SCHOOL' | 'HOME';
}

// Message notifications
export interface NewMessageNotification extends BaseNotification {
  category: NotificationCategory.MESSAGE;
  type: 'NEW_MESSAGE';
  messageId: string;
  senderName?: string;
  studentId?: string;
  studentName?: string;
}

// Student approval notifications
export interface StudentApprovedNotification extends BaseNotification {
  category: NotificationCategory.APPROVAL;
  type: 'STUDENT_APPROVED';
  studentId: string;
  studentName?: string;
}

export interface StudentRejectedNotification extends BaseNotification {
  category: NotificationCategory.APPROVAL;
  type: 'STUDENT_REJECTED';
  studentId: string;
  studentName?: string;
}

// Child not attended notifications
export interface ChildNotAttendedNotification extends BaseNotification {
  category: NotificationCategory.ATTENDANCE;
  type: 'CHILD_NOT_ATTENDED';
  childId: string;
  childName?: string;
  time?: number;
}

// Union type of all notifications
export type Notification =
  | TripStartedNotification
  | TripEndedNotification
  | ChildPickedUpNotification
  | ChildDroppedOffNotification
  | ChildNotAttendedNotification
  | NewMessageNotification
  | StudentApprovedNotification
  | StudentRejectedNotification;

// Notification handler type
export type NotificationHandler = (notification: Notification) => void;

// Visual styling for notifications based on category
export interface NotificationStyle {
  backgroundColor: string;
  iconColor: string;
  icon: string;
}

export const getNotificationStyle = (category: NotificationCategory): NotificationStyle => {
  switch (category) {
    case NotificationCategory.TRIP:
      return {
        backgroundColor: '#3b82f6', // blue
        iconColor: '#fff',
        icon: '🚐',
      };
    case NotificationCategory.PICKUP:
      return {
        backgroundColor: '#10b981', // green
        iconColor: '#fff',
        icon: '👋',
      };
    case NotificationCategory.DROPOFF:
      return {
        backgroundColor: '#8b5cf6', // purple
        iconColor: '#fff',
        icon: '🏠',
      };
    case NotificationCategory.ATTENDANCE:
      return {
        backgroundColor: '#f59e0b', // amber/orange
        iconColor: '#fff',
        icon: '⚠️',
      };
    case NotificationCategory.DRIVER:
      return {
        backgroundColor: '#f59e0b', // amber
        iconColor: '#fff',
        icon: '👤',
      };
    case NotificationCategory.MESSAGE:
      return {
        backgroundColor: '#3b82f6', // blue
        iconColor: '#fff',
        icon: '💬',
      };
    case NotificationCategory.APPROVAL:
      return {
        backgroundColor: '#10b981', // green
        iconColor: '#fff',
        icon: '✅',
      };
    case NotificationCategory.SYSTEM:
      return {
        backgroundColor: '#6b7280', // gray
        iconColor: '#fff',
        icon: 'ℹ️',
      };
    default:
       return {
        backgroundColor: '#6b7280',
        iconColor: '#fff',
        icon: '🔔',
      };
  }
};
