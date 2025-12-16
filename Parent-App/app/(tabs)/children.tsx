import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChildrenScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.title}>Children</Text>

          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>Children list will appear here</Text>
          </View>

          {/* Sample placeholder for future children cards */}
          <View style={styles.sampleCard}>
            <Text style={styles.sampleCardText}>
              Children cards with pickup/drop-off status will be listed here
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // SafeAreaView (className="flex-1 bg-gray-50")
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb', // bg-gray-50
  },
  // ScrollView (className="flex-1")
  scrollView: {
    flex: 1,
  },
  // View (className="p-6")
  container: {
    padding: 24, // p-6
  },
  // Title Text (className="mb-6 text-3xl font-bold text-gray-900")
  title: {
    marginBottom: 24, // mb-6
    fontSize: 30, // text-3xl
    fontWeight: 'bold',
    color: '#111827', // text-gray-900
  },
  // Placeholder Card (className="rounded-2xl bg-white p-6 shadow-sm")
  placeholderCard: {
    borderRadius: 16, // rounded-2xl
    backgroundColor: '#ffffff', // bg-white
    padding: 24, // p-6
    shadowColor: '#000', // shadow-sm
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1, // Android shadow
  },
  // Placeholder Text (className="text-center text-base text-gray-500")
  placeholderText: {
    textAlign: 'center',
    fontSize: 16, // text-base
    color: '#6b7280', // text-gray-500
  },
  // Sample Placeholder Card (className="mt-4 rounded-xl bg-white p-4 shadow-sm")
  sampleCard: {
    marginTop: 16, // mt-4
    borderRadius: 12, // rounded-xl
    backgroundColor: '#ffffff', // bg-white
    padding: 16, // p-4
    shadowColor: '#000', // shadow-sm
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1, // Android shadow
  },
  // Sample Card Text (className="text-sm text-gray-400")
  sampleCardText: {
    fontSize: 14, // text-sm
    color: '#9ca3af', // text-gray-400
  },
});
