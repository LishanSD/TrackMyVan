/**
 * Toast Container Component
 *
 * Container for all active toast notifications
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNotifications } from '../../context/NotificationContext';
import { Toast } from './Toast';

export const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onDismiss={() => removeNotification(notification.id)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50, // Below status bar
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});
