/**
 * Toast Notification Component
 *
 * Displays individual toast notification with auto-dismiss (no animation for visibility)
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Notification, getNotificationStyle } from '../../types/notificationTypes';

interface ToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  duration?: number; // in milliseconds
}

const { width } = Dimensions.get('window');

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const Toast: React.FC<ToastProps> = ({ notification, onDismiss, duration = 10000 }) => {
  // No animation - start visible immediately (animation causes visibility issues)
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  console.log('[Toast] Rendering toast:', notification.title, notification.message);

  useEffect(() => {
    console.log('[Toast] Toast mounted for:', notification.title);

    // Auto-dismiss timer only
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [notification.id]);

  const handleDismiss = () => {
    console.log('[Toast] Dismissing:', notification.title);
    onDismiss(notification.id);
  };

  const style = getNotificationStyle(notification.category);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: style.backgroundColor,
        },
      ]}>
      <TouchableOpacity activeOpacity={1} onPress={handleDismiss} style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{style.icon}</Text>
        </View>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{notification.title}</Text>
            <Text style={styles.timestamp}>{formatTime(notification.timestamp)}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width - 32,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 18,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
