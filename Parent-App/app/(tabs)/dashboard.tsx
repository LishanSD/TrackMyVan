import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.dashboardTitle}>Dashboard</Text>
            <Text style={styles.dashboardSubtitle}>Track your child's van in real-time</Text>
          </View>

          {/* Child Info Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Child</Text>
            <View style={styles.childInfoRow}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>👦</Text>
              </View>
              <View style={styles.childDetails}>
                <Text style={styles.childName}>Child Name</Text>
                <Text style={styles.childStatus}>No pickup today</Text>
              </View>
            </View>
          </View>

          {/* Today's Activity */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Activity</Text>
            <View style={styles.activityPlaceholder}>
              <Text style={styles.activityIcon}>📋</Text>
              <Text style={styles.activityText}>No activity yet today</Text>
            </View>
          </View>

          {/* Quick Actions/Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              You'll receive notifications when your child is picked up or dropped off
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
  // Header (className="mb-6")
  header: {
    marginBottom: 24, // mb-6
  },
  // Dashboard Title (className="mb-1 text-3xl font-bold text-gray-900")
  dashboardTitle: {
    marginBottom: 4, // mb-1
    fontSize: 30, // text-3xl
    fontWeight: 'bold',
    color: '#111827', // text-gray-900
  },
  // Dashboard Subtitle (className="text-sm text-gray-500")
  dashboardSubtitle: {
    fontSize: 14, // text-sm
    color: '#6b7280', // text-gray-500
  },
  // Card base style (className="mb-4 rounded-2xl bg-white p-6 shadow-sm")
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
  // Card Title (className="text-lg font-semibold text-gray-900")
  cardTitle: {
    fontSize: 18, // text-lg
    fontWeight: '600', // font-semibold
    color: '#111827', // text-gray-900
  },

  // Van Status Header (className="mb-4 flex-row items-center justify-between")
  vanStatusHeader: {
    marginBottom: 16, // mb-4
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Status Pill (className="rounded-full bg-gray-100 px-3 py-1")
  statusPill: {
    borderRadius: 9999, // rounded-full
    backgroundColor: '#f3f4f6', // bg-gray-100
    paddingHorizontal: 12, // px-3
    paddingVertical: 4, // py-1
  },
  // Status Pill Text (className="text-xs font-medium text-gray-600")
  statusPillText: {
    fontSize: 12, // text-xs
    fontWeight: '500', // font-medium
    color: '#4b5563', // text-gray-600
  },
  // Card Text (className="mb-4 text-sm text-gray-500")
  cardText: {
    marginBottom: 16, // mb-4
    fontSize: 14, // text-sm
    color: '#6b7280', // text-gray-500
  },
  // Track Button (className="rounded-xl bg-blue-600 py-3 active:bg-blue-700")
  trackButton: {
    borderRadius: 12, // rounded-xl
    backgroundColor: '#2563eb', // bg-blue-600
    paddingVertical: 12, // py-3
    // Note: 'active:bg-blue-700' is an interaction style not directly supported by StyleSheet
  },
  // Track Button Text (className="text-center font-semibold text-white")
  trackButtonText: {
    textAlign: 'center',
    fontWeight: '600', // font-semibold
    color: '#ffffff', // text-white
  },

  // Child Info Card styles
  // Card Title (className="mb-4 text-lg font-semibold text-gray-900") - Already defined as cardTitle
  // Child Info Row (className="flex-row items-center")
  childInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Avatar Container (className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-blue-100")
  avatarContainer: {
    marginRight: 16, // mr-4
    height: 48, // h-12
    width: 48, // w-12
    alignItems: 'center', // items-center
    justifyContent: 'center', // justify-center
    borderRadius: 24, // rounded-full (half of h/w 48)
    backgroundColor: '#dbeafe', // bg-blue-100
  },
  // Avatar Text (className="text-2xl")
  avatarText: {
    fontSize: 24, // text-2xl
  },
  // Child Details View (className="flex-1")
  childDetails: {
    flex: 1,
  },
  // Child Name (className="text-base font-medium text-gray-900")
  childName: {
    fontSize: 16, // text-base
    fontWeight: '500', // font-medium
    color: '#111827', // text-gray-900
  },
  // Child Status (className="text-sm text-gray-500")
  childStatus: {
    fontSize: 14, // text-sm
    color: '#6b7280', // text-gray-500
  },

  // Today's Activity styles
  // Activity Placeholder (className="items-center py-8")
  activityPlaceholder: {
    alignItems: 'center', // items-center
    paddingVertical: 32, // py-8
  },
  // Activity Icon (className="mb-2 text-6xl")
  activityIcon: {
    marginBottom: 8, // mb-2
    fontSize: 60, // text-6xl
  },
  // Activity Text (className="text-center text-sm text-gray-400")
  activityText: {
    textAlign: 'center',
    fontSize: 14, // text-sm
    color: '#9ca3af', // text-gray-400
  },

  // Quick Actions/Info Box (className="mt-4 rounded-xl bg-blue-50 p-4")
  infoBox: {
    marginTop: 16, // mt-4
    borderRadius: 12, // rounded-xl
    backgroundColor: '#eff6ff', // bg-blue-50
    padding: 16, // p-4
  },
  // Info Box Text (className="text-center text-xs text-blue-600")
  infoBoxText: {
    textAlign: 'center',
    fontSize: 12, // text-xs
    color: '#2563eb', // text-blue-600
  },
});
