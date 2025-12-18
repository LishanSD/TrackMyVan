/**
 * Notification Context for Driver-App
 *
 * Global notification state management with Firestore listener integration
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Notification, NotificationHandler } from '../types/notificationTypes';
import { subscribeToNewMessages } from '../services/messageNotificationService';
import { subscribeToStudentRequests } from '../services/studentRequestNotificationService';
import { useAuth } from './AuthContext';

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

  // Define removeNotification first since addNotification depends on it
  const removeNotification = useCallback((id: string) => {
    console.log('[NotificationContext] Removing notification:', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Use useCallback to prevent stale closure issues
  const addNotification = useCallback(
    (notification: Notification) => {
      console.log('[NotificationContext] Adding notification:', notification);
      setNotifications((prev) => [notification, ...prev]);

      // Auto-remove after duration (10s display + 1s animation buffer)
      setTimeout(() => {
        removeNotification(notification.id);
      }, 11000);
    },
    [removeNotification]
  );

  // Set up Firestore listeners for notifications
  useEffect(() => {
    if (!user) {
      console.log('[NotificationContext] No user, skipping listeners');
      return;
    }

    console.log('[NotificationContext] Setting up listeners for driver:', user.uid);

    // Centralized notification handler
    const handleNotification: NotificationHandler = (notification) => {
      console.log('[NotificationContext] Received notification from Firestore:', notification);
      addNotification(notification);
    };

    // Subscribe to new messages from parents
    const unsubscribeMessages = subscribeToNewMessages(user.uid, handleNotification);

    // Subscribe to student request changes
    const unsubscribeStudentRequests = subscribeToStudentRequests(user.uid, handleNotification);

    // Cleanup on unmount
    return () => {
      console.log('[NotificationContext] Cleaning up Firestore listeners');
      unsubscribeMessages();
      unsubscribeStudentRequests();
    };
  }, [user, addNotification]);

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
