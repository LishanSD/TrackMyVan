import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Header */}
          <View className="mb-6">
            <Text className="mb-1 text-3xl font-bold text-gray-900">Dashboard</Text>
            <Text className="text-sm text-gray-500">Track your child's van in real-time</Text>
          </View>

          {/* Van Status Card */}
          <View className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900">Van Status</Text>
              <View className="rounded-full bg-gray-100 px-3 py-1">
                <Text className="text-xs font-medium text-gray-600">Not Active</Text>
              </View>
            </View>
            <Text className="mb-4 text-sm text-gray-500">The van is currently not on a trip</Text>
            <TouchableOpacity className="rounded-xl bg-blue-600 py-3 active:bg-blue-700">
              <Text className="text-center font-semibold text-white">Track Van Location</Text>
            </TouchableOpacity>
          </View>

          {/* Child Info Card */}
          <View className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
            <Text className="mb-4 text-lg font-semibold text-gray-900">Your Child</Text>
            <View className="flex-row items-center">
              <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Text className="text-2xl">👦</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900">Child Name</Text>
                <Text className="text-sm text-gray-500">No pickup today</Text>
              </View>
            </View>
          </View>

          {/* Today's Activity */}
          <View className="rounded-2xl bg-white p-6 shadow-sm">
            <Text className="mb-4 text-lg font-semibold text-gray-900">Today's Activity</Text>
            <View className="items-center py-8">
              <Text className="mb-2 text-6xl">📋</Text>
              <Text className="text-center text-sm text-gray-400">No activity yet today</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mt-4 rounded-xl bg-blue-50 p-4">
            <Text className="text-center text-xs text-blue-600">
              You'll receive notifications when your child is picked up or dropped off
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
