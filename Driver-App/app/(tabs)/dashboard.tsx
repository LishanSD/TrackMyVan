import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.dashboardTitle}>Dashboard</Text>

          {/* Trip Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trip Status</Text>
            <Text style={styles.cardText}>No active trip</Text>
          </View>

          {/* Today's Summary Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Summary</Text>
            <Text style={styles.cardText}>Students: 0 picked up, 0 dropped off</Text>
          </View>

          {/* Quick Actions */}
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonTitle}>Start Trip</Text>
            <Text style={styles.actionButtonText}>Tap to begin tracking</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // SafeAreaView (className="flex-1 bg-gray-50")
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb', // gray-50
  },
  // ScrollView (className="flex-1")
  scrollView: {
    flex: 1,
  },
  // View (className="p-6")
  container: {
    padding: 24, // p-6
  },
  // Dashboard Title (className="mb-4 text-3xl font-bold text-gray-900")
  dashboardTitle: {
    marginBottom: 16, // mb-4
    fontSize: 30, // text-3xl
    fontWeight: 'bold',
    color: '#111827', // text-gray-900
  },
  // Card (className="mb-4 rounded-2xl bg-white p-6 shadow-sm")
  card: {
    marginBottom: 16, // mb-4
    borderRadius: 16, // rounded-2xl
    backgroundColor: '#ffffff', // bg-white
    padding: 24, // p-6
    shadowColor: '#000', // shadow-sm
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1, // Android shadow
  },
  // Card Title (className="mb-2 text-lg font-semibold text-gray-900")
  cardTitle: {
    marginBottom: 8, // mb-2
    fontSize: 18, // text-lg
    fontWeight: '600', // font-semibold
    color: '#111827', // text-gray-900
  },
  // Card Text (className="text-sm text-gray-500")
  cardText: {
    fontSize: 14, // text-sm
    color: '#6b7280', // text-gray-500
  },
  // Quick Actions Button (className="rounded-2xl bg-blue-600 p-6 shadow-md active:bg-blue-700")
  actionButton: {
    borderRadius: 16, // rounded-2xl
    backgroundColor: '#2563eb', // bg-blue-600
    padding: 24, // p-6
    shadowColor: '#000', // shadow-md
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3, // Android shadow
    // Note: React Native StyleSheet doesn't have an equivalent for 'active:bg-blue-700' directly.
    // This is typically handled using state or the 'underlayColor' prop on a TouchableOpacity.
  },
  // Action Button Title (className="mb-2 text-lg font-semibold text-white")
  actionButtonTitle: {
    marginBottom: 8, // mb-2
    fontSize: 18, // text-lg
    fontWeight: '600', // font-semibold
    color: '#ffffff', // text-white
  },
  // Action Button Text (className="text-sm text-blue-100")
  actionButtonText: {
    fontSize: 14, // text-sm
    color: '#dbeafe', // text-blue-100
  },
});
