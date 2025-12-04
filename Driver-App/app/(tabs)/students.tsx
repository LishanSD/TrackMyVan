import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StudentsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          <Text className="mb-6 text-3xl font-bold text-gray-900">Students</Text>

          <View className="rounded-2xl bg-white p-6 shadow-sm">
            <Text className="text-center text-base text-gray-500">
              Student list will appear here
            </Text>
          </View>

          {/* Sample placeholder for future student cards */}
          <View className="mt-4 rounded-xl bg-white p-4 shadow-sm">
            <Text className="text-sm text-gray-400">
              Student cards with pickup/drop-off status will be listed here
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
