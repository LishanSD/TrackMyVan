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
  SYSTEM = 'SYSTEM',
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

// Union type of all notifications
export type Notification =
  | TripStartedNotification
  | TripEndedNotification
  | ChildPickedUpNotification
  | ChildDroppedOffNotification;

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
    case NotificationCategory.DRIVER:
      return {
        backgroundColor: '#f59e0b', // amber
        iconColor: '#fff',
        icon: '👤',
      };
    case NotificationCategory.SYSTEM:
      return {
        backgroundColor: '#6b7280', // gray
        iconColor: '#fff',
        icon: 'ℹ️',
      };
  }
};
