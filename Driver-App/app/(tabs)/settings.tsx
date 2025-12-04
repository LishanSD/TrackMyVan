import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
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
        {
          text: 'Cancel',
          style: 'cancel',
        },
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
    <ScrollView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <View className="p-6">
        {/* Header */}
        <Text className="mb-6 text-3xl font-bold" style={{ color: theme.colors.text.primary }}>
          Settings
        </Text>

        {/* Profile Section */}
        <View className="mb-6 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
          <Text className="mb-3 text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
            Profile Information
          </Text>

          <View className="mb-3">
            <Text className="mb-1 text-sm" style={{ color: theme.colors.text.secondary }}>
              Name
            </Text>
            <Text className="text-base" style={{ color: theme.colors.text.primary }}>
              {user?.displayName || 'Not set'}
            </Text>
          </View>

          <View>
            <Text className="mb-1 text-sm" style={{ color: theme.colors.text.secondary }}>
              Email
            </Text>
            <Text className="text-base" style={{ color: theme.colors.text.primary }}>
              {user?.email || 'Not set'}
            </Text>
          </View>
        </View>

        {/* Account Settings */}
        <View className="mb-6 rounded-2xl" style={{ backgroundColor: theme.colors.surface }}>
          <Text
            className="p-4 pb-2 text-lg font-semibold"
            style={{ color: theme.colors.text.primary }}>
            Account Settings
          </Text>

          <TouchableOpacity
            className="border-t px-4 py-3"
            style={{ borderColor: theme.colors.border }}
            onPress={() => Alert.alert('Info', 'Edit profile feature coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="border-t px-4 py-3"
            style={{ borderColor: theme.colors.border }}
            onPress={() => Alert.alert('Info', 'Change password feature coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Change Password</Text>
          </TouchableOpacity>
        </View>

        {/* App Settings */}
        <View className="mb-6 rounded-2xl" style={{ backgroundColor: theme.colors.surface }}>
          <Text
            className="p-4 pb-2 text-lg font-semibold"
            style={{ color: theme.colors.text.primary }}>
            App Settings
          </Text>

          <TouchableOpacity
            className="border-t px-4 py-3"
            style={{ borderColor: theme.colors.border }}
            onPress={() => Alert.alert('Info', 'Notifications settings coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="border-t px-4 py-3"
            style={{ borderColor: theme.colors.border }}
            onPress={() => Alert.alert('Info', 'Privacy settings coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Privacy</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View className="mb-6 rounded-2xl" style={{ backgroundColor: theme.colors.surface }}>
          <Text
            className="p-4 pb-2 text-lg font-semibold"
            style={{ color: theme.colors.text.primary }}>
            About
          </Text>

          <TouchableOpacity
            className="border-t px-4 py-3"
            style={{ borderColor: theme.colors.border }}
            onPress={() => Alert.alert('TrackMyVan', 'Version 1.0.0')}>
            <Text style={{ color: theme.colors.text.primary }}>App Version</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="border-t px-4 py-3"
            style={{ borderColor: theme.colors.border }}
            onPress={() => Alert.alert('Info', 'Terms & Conditions coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Terms & Conditions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="border-t px-4 py-3"
            style={{ borderColor: theme.colors.border }}
            onPress={() => Alert.alert('Info', 'Privacy Policy coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          className="rounded-xl py-4"
          style={{ backgroundColor: theme.colors.error }}
          onPress={handleLogout}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">Logout</Text>
          )}
        </TouchableOpacity>

        {/* Version Info */}
        <Text className="mt-6 text-center text-sm" style={{ color: theme.colors.text.light }}>
          TrackMyVan Driver App v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
