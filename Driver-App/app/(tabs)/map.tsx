import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 items-center justify-center p-6">
        <View className="items-center rounded-2xl bg-white p-8 shadow-md">
          <Text className="mb-2 text-2xl font-bold text-gray-900">Map View</Text>
          <Text className="text-center text-sm text-gray-500">
            Real-time tracking map will be displayed here
          </Text>
          <Text className="mt-4 text-xs text-gray-400">Google Maps integration coming soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
