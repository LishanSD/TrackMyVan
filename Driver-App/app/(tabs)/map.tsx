import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Map View</Text>
          <Text style={styles.subtitle}>Real-time tracking map will be displayed here</Text>
          <Text style={styles.note}>Google Maps integration coming soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // SafeAreaView (className="flex-1 bg-gray-50")
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb', // bg-gray-50
  },
  // View (className="flex-1 items-center justify-center p-6")
  container: {
    flex: 1,
    alignItems: 'center', // items-center
    justifyContent: 'center', // justify-center
    padding: 24, // p-6
  },
  // Inner View/Card (className="items-center rounded-2xl bg-white p-8 shadow-md")
  card: {
    alignItems: 'center', // items-center
    borderRadius: 16, // rounded-2xl
    backgroundColor: '#ffffff', // bg-white
    padding: 32, // p-8
    shadowColor: '#000', // shadow-md
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3, // Android shadow
  },
  // Title Text (className="mb-2 text-2xl font-bold text-gray-900")
  title: {
    marginBottom: 8, // mb-2
    fontSize: 24, // text-2xl
    fontWeight: 'bold',
    color: '#111827', // text-gray-900
  },
  // Subtitle Text (className="text-center text-sm text-gray-500")
  subtitle: {
    textAlign: 'center',
    fontSize: 14, // text-sm
    color: '#6b7280', // text-gray-500
  },
  // Note Text (className="mt-4 text-xs text-gray-400")
  note: {
    marginTop: 16, // mt-4
    fontSize: 12, // text-xs
    color: '#9ca3af', // text-gray-400
  },
});
