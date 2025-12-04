import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          <Text className="mb-4 text-3xl font-bold text-gray-900">Dashboard</Text>

          {/* Trip Status Card */}
          <View className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
            <Text className="mb-2 text-lg font-semibold text-gray-900">Trip Status</Text>
            <Text className="text-sm text-gray-500">No active trip</Text>
          </View>

          {/* Today's Summary Card */}
          <View className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
            <Text className="mb-2 text-lg font-semibold text-gray-900">Today's Summary</Text>
            <Text className="text-sm text-gray-500">Students: 0 picked up, 0 dropped off</Text>
          </View>

          {/* Quick Actions */}
          <TouchableOpacity className="rounded-2xl bg-blue-600 p-6 shadow-md active:bg-blue-700">
            <Text className="mb-2 text-lg font-semibold text-white">Start Trip</Text>
            <Text className="text-sm text-blue-100">Tap to begin tracking</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
