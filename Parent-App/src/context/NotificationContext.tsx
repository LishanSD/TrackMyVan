/**
 * Notification Context
 *
 * Global notification state management with Firestore listener integration
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Notification,
  NotificationHandler,
  NotificationCategory,
} from '../types/notificationTypes';
import { subscribeTripStatusChanges } from '../services/tripNotificationService';
import { subscribeChildStatusChanges } from '../services/childStatusNotificationService';
import { useAuth } from './AuthContext';
import { getParentStudents } from '../services/childrenService';
import { Student } from '../types/types';

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Load parent's students on mount
  useEffect(() => {
    if (!user) {
      setStudents([]);
      return;
    }

    const loadStudents = async () => {
      try {
        const studentList = await getParentStudents(user.uid);
        setStudents(studentList);
        console.log('[NotificationContext] Loaded students for parent:', studentList.length);
      } catch (error) {
        console.error('[NotificationContext] Error loading students:', error);
      }
    };

    loadStudents();
  }, [user]);

  // Set up Firestore listeners for notifications
  useEffect(() => {
    if (!user || students.length === 0) {
      console.log('[NotificationContext] Skipping listeners - no user or no students');
      return;
    }

    const studentIds = students.map((student) => student.id);
    const studentNames = new Map(students.map((student) => [student.id, student.name]));

    // Get unique driver IDs from all students (supports multiple drivers)
    const driverIds = Array.from(
      new Set(students.map((student) => student.driverId).filter(Boolean))
    );

    if (driverIds.length === 0) {
      console.warn('[NotificationContext] No driver IDs found for students');
      return;
    }

    console.log('[NotificationContext] Setting up listeners for:', {
      driverIds,
      driverCount: driverIds.length,
      studentIds,
      studentCount: students.length,
    });

    // Centralized notification handler
    const handleNotification: NotificationHandler = (notification) => {
      console.log('[NotificationContext] Received notification:', notification);
      addNotification(notification);
    };

    // Subscribe to trip status changes from all unique drivers
    const unsubscribeTrips = subscribeTripStatusChanges(driverIds, studentIds, handleNotification);

    // Subscribe to child status changes
    const unsubscribeChildStatus = subscribeChildStatusChanges(
      studentIds,
      studentNames,
      handleNotification
    );

    // Cleanup on unmount
    return () => {
      console.log('[NotificationContext] Cleaning up Firestore listeners');
      unsubscribeTrips();
      unsubscribeChildStatus();
    };
  }, [user, students]);

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);

    // Auto-remove after duration (10s display + 1s animation buffer)
    setTimeout(() => {
      removeNotification(notification.id);
    }, 11000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const value: NotificationContextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
