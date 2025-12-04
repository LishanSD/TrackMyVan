import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Header */}
          <Text className="mb-6 text-3xl font-bold text-gray-900">Settings</Text>

          {/* Account Section */}
          <View className="mb-6">
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Account
            </Text>
            <View className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <TouchableOpacity className="flex-row items-center justify-between border-b border-gray-200 p-6 active:bg-gray-50">
                <View>
                  <Text className="text-base font-medium text-gray-900">Profile</Text>
                  <Text className="mt-1 text-sm text-gray-500">
                    Manage your profile information
                  </Text>
                </View>
                <Text className="text-gray-400">›</Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between p-6 active:bg-gray-50">
                <View>
                  <Text className="text-base font-medium text-gray-900">Child Information</Text>
                  <Text className="mt-1 text-sm text-gray-500">Update child details</Text>
                </View>
                <Text className="text-gray-400">›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notifications Section */}
          <View className="mb-6">
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Notifications
            </Text>
            <View className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <TouchableOpacity className="flex-row items-center justify-between border-b border-gray-200 p-6 active:bg-gray-50">
                <View>
                  <Text className="text-base font-medium text-gray-900">Push Notifications</Text>
                  <Text className="mt-1 text-sm text-gray-500">Pickup and drop-off alerts</Text>
                </View>
                <View className="h-7 w-12 items-end justify-center rounded-full bg-blue-600 px-1">
                  <View className="h-5 w-5 rounded-full bg-white" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between p-6 active:bg-gray-50">
                <View>
                  <Text className="text-base font-medium text-gray-900">SMS Notifications</Text>
                  <Text className="mt-1 text-sm text-gray-500">Receive SMS updates</Text>
                </View>
                <View className="h-7 w-12 justify-center rounded-full bg-gray-200 px-1">
                  <View className="h-5 w-5 rounded-full bg-white" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* App Section */}
          <View className="mb-6">
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              App
            </Text>
            <View className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <TouchableOpacity className="flex-row items-center justify-between border-b border-gray-200 p-6 active:bg-gray-50">
                <Text className="text-base font-medium text-gray-900">Privacy Policy</Text>
                <Text className="text-gray-400">›</Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between border-b border-gray-200 p-6 active:bg-gray-50">
                <Text className="text-base font-medium text-gray-900">Terms of Service</Text>
                <Text className="text-gray-400">›</Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between p-6 active:bg-gray-50">
                <Text className="text-base font-medium text-gray-900">About</Text>
                <Text className="text-gray-400">›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* App Version */}
          <View className="mb-4 mt-8 items-center">
            <Text className="text-xs text-gray-400">TrackMyVan Parent</Text>
            <Text className="mt-1 text-xs text-gray-400">Version 1.0.0</Text>
          </View>

          {/* Logout Button */}
          <TouchableOpacity className="mt-4 rounded-xl bg-red-50 py-4 active:bg-red-100">
            <Text className="text-center font-semibold text-red-600">Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
