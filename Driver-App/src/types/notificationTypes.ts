/**
 * Notification Types for Driver-App
 *
 * Flexible type system for different notification categories
 */

// Notification categories for easy extensibility
export enum NotificationCategory {
  MESSAGE = 'MESSAGE',
  STUDENT_REQUEST = 'STUDENT_REQUEST',
  SYSTEM = 'SYSTEM',
}

// Base notification interface
export interface BaseNotification {
  id: string;
  timestamp: number;
  category: NotificationCategory;
  title: string;
  message: string;
  parentId?: string;
  studentId?: string;
}

// Message notifications - when parents send messages to driver
export interface NewMessageNotification extends BaseNotification {
  category: NotificationCategory.MESSAGE;
  type: 'NEW_MESSAGE';
  messageId: string;
  senderName?: string;
  parentId: string;
  studentId?: string;
  studentName?: string;
}

// Student request notifications - when new students request approval
export interface NewStudentRequestNotification extends BaseNotification {
  category: NotificationCategory.STUDENT_REQUEST;
  type: 'NEW_STUDENT_REQUEST';
  studentId: string;
  studentName: string;
  parentName?: string;
  parentId?: string;
}

// Student withdrawn notification - when a pending request is withdrawn
export interface StudentWithdrawnNotification extends BaseNotification {
  category: NotificationCategory.STUDENT_REQUEST;
  type: 'STUDENT_WITHDRAWN';
  studentId: string;
  studentName?: string;
}

// Union type of all notifications
export type Notification =
  | NewMessageNotification
  | NewStudentRequestNotification
  | StudentWithdrawnNotification;

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
    case NotificationCategory.MESSAGE:
      return {
        backgroundColor: '#3b82f6', // blue
        iconColor: '#fff',
        icon: '💬',
      };
    case NotificationCategory.STUDENT_REQUEST:
      return {
        backgroundColor: '#10b981', // green
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
