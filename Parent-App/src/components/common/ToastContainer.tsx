/**
 * Toast Container Component
 *
 * Manages display of multiple toast notifications
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Toast } from './Toast';
import { Notification } from '../../types/notificationTypes';

interface ToastContainerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  notifications,
  onDismiss,
  maxVisible = 3,
}) => {
  // Show only the most recent notifications
  const visibleNotifications = notifications.slice(0, maxVisible);

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {visibleNotifications.map((notification) => (
        <Toast key={notification.id} notification={notification} onDismiss={onDismiss} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
    alignItems: 'center',
    paddingTop: 10,
    pointerEvents: 'box-none',
  },
});
