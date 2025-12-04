import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          <Text className="mb-6 text-3xl font-bold text-gray-900">Settings</Text>

          <View className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <TouchableOpacity className="border-b border-gray-200 p-6 active:bg-gray-50">
              <Text className="text-base text-gray-900">Profile Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity className="border-b border-gray-200 p-6 active:bg-gray-50">
              <Text className="text-base text-gray-900">Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity className="border-b border-gray-200 p-6 active:bg-gray-50">
              <Text className="text-base text-gray-900">Privacy</Text>
            </TouchableOpacity>

            <TouchableOpacity className="p-6 active:bg-gray-50">
              <Text className="text-base text-gray-900">About</Text>
            </TouchableOpacity>
          </View>

          <View className="mt-6 rounded-xl bg-blue-50 p-4">
            <Text className="text-center text-xs text-blue-600">TrackMyVan v1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
