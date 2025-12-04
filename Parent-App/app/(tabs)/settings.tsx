// CHANGED: Removed all nativewind className usage and replaced with StyleSheet

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await logout();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.innerContainer}>
        {/* Header */}
        {/* CHANGED: Replaced className props with style */}
        <Text style={[styles.headerText, { color: theme.colors.text.primary }]}>Settings</Text>

        {/* Profile Section */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
            Profile Information
          </Text>

          <View style={styles.infoBlock}>
            <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Name</Text>
            <Text style={[styles.value, { color: theme.colors.text.primary }]}>
              {user?.displayName || 'Not set'}
            </Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Email</Text>
            <Text style={[styles.value, { color: theme.colors.text.primary }]}>
              {user?.email || 'Not set'}
            </Text>
          </View>
        </View>

        {/* Account Settings */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
            Account Settings
          </Text>

          <TouchableOpacity
            style={[styles.cardButton, { borderColor: theme.colors.border }]}
            onPress={() => Alert.alert('Info', 'Edit profile feature coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardButton, { borderColor: theme.colors.border }]}
            onPress={() => Alert.alert('Info', 'Change password feature coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Change Password</Text>
          </TouchableOpacity>
        </View>

        {/* App Settings */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>App Settings</Text>

          <TouchableOpacity
            style={[styles.cardButton, { borderColor: theme.colors.border }]}
            onPress={() => Alert.alert('Info', 'Notifications settings coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardButton, { borderColor: theme.colors.border }]}
            onPress={() => Alert.alert('Info', 'Privacy settings coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Privacy</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>About</Text>

          <TouchableOpacity
            style={[styles.cardButton, { borderColor: theme.colors.border }]}
            onPress={() => Alert.alert('TrackMyVan', 'Version 1.0.0')}>
            <Text style={{ color: theme.colors.text.primary }}>App Version</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardButton, { borderColor: theme.colors.border }]}
            onPress={() => Alert.alert('Info', 'Terms & Conditions coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Terms & Conditions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardButton, { borderColor: theme.colors.border }]}
            onPress={() => Alert.alert('Info', 'Privacy Policy coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.colors.error }]}
          onPress={handleLogout}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.logoutText}>Logout</Text>
          )}
        </TouchableOpacity>

        {/* Version Info */}
        <Text style={[styles.versionText, { color: theme.colors.text.light }]}>
          TrackMyVan Parent App v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // CHANGED: Replacing flex-1
  container: {
    flex: 1,
  },
  innerContainer: {
    padding: theme.spacing.lg,
  },

  // Header
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: theme.spacing.lg,
  },

  // Cards
  card: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },

  // Text blocks
  infoBlock: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Buttons inside cards
  cardButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderTopWidth: 1,
  },

  // Logout
  logoutButton: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Version text
  versionText: {
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    fontSize: 13,
  },
});
