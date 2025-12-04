import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <Text style={styles.headerTitle}>Settings</Text>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Account</Text>
            <View style={styles.card}>
              <TouchableOpacity style={[styles.settingItem, styles.borderBottom]}>
                <View>
                  <Text style={styles.itemTitle}>Profile</Text>
                  <Text style={styles.itemSubtitle}>Manage your profile information</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem}>
                <View>
                  <Text style={styles.itemTitle}>Child Information</Text>
                  <Text style={styles.itemSubtitle}>Update child details</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Notifications</Text>
            <View style={styles.card}>
              {/* Push Toggle - ON state */}
              <TouchableOpacity style={[styles.settingItem, styles.borderBottom]}>
                <View>
                  <Text style={styles.itemTitle}>Push Notifications</Text>
                  <Text style={styles.itemSubtitle}>Pickup and drop-off alerts</Text>
                </View>
                <View style={styles.toggleTrackOn}>
                  <View style={styles.toggleThumb} />
                </View>
              </TouchableOpacity>

              {/* SMS Toggle - OFF state */}
              <TouchableOpacity style={styles.settingItem}>
                <View>
                  <Text style={styles.itemTitle}>SMS Notifications</Text>
                  <Text style={styles.itemSubtitle}>Receive SMS updates</Text>
                </View>
                <View style={styles.toggleTrackOff}>
                  <View style={styles.toggleThumb} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* App Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>App</Text>
            <View style={styles.card}>
              <TouchableOpacity style={[styles.settingItem, styles.borderBottom]}>
                <Text style={styles.itemTitle}>Privacy Policy</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.settingItem, styles.borderBottom]}>
                <Text style={styles.itemTitle}>Terms of Service</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.itemTitle}>About</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* App Version */}
          <View style={styles.appVersionContainer}>
            <Text style={styles.appVersionText}>TrackMyVan Parent</Text>
            <Text style={styles.appVersionText}>Version 1.0.0</Text>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
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
  // Header Title (className="mb-6 text-3xl font-bold text-gray-900")
  headerTitle: {
    marginBottom: 24, // mb-6
    fontSize: 30, // text-3xl
    fontWeight: 'bold',
    color: '#111827', // text-gray-900
  },
  // Section Wrapper (className="mb-6")
  section: {
    marginBottom: 24, // mb-6
  },
  // Section Header (className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500")
  sectionHeader: {
    marginBottom: 12, // mb-3
    fontSize: 12, // text-xs
    fontWeight: '600', // font-semibold
    textTransform: 'uppercase', // uppercase
    letterSpacing: 1.5, // tracking-wider
    color: '#6b7280', // text-gray-500
  },
  // Card Container (className="overflow-hidden rounded-2xl bg-white shadow-sm")
  card: {
    overflow: 'hidden',
    borderRadius: 16, // rounded-2xl
    backgroundColor: '#ffffff', // bg-white
    shadowColor: '#000', // shadow-sm
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1, // Android shadow
  },
  // Setting Item TouchableOpacity (className="flex-row items-center justify-between p-6 active:bg-gray-50")
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24, // p-6
    // Note: active:bg-gray-50 is a touch interaction style, often handled by `underlayColor` on TouchableHighlight or similar.
  },
  // Separator (className="border-b border-gray-200")
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb', // border-gray-200
  },
  // Item Title (className="text-base font-medium text-gray-900")
  itemTitle: {
    fontSize: 16, // text-base
    fontWeight: '500', // font-medium
    color: '#111827', // text-gray-900
  },
  // Item Subtitle (className="mt-1 text-sm text-gray-500")
  itemSubtitle: {
    marginTop: 4, // mt-1
    fontSize: 14, // text-sm
    color: '#6b7280', // text-gray-500
  },
  // Chevron (className="text-gray-400")
  chevron: {
    fontSize: 18,
    color: '#9ca3af', // text-gray-400
  },

  // Toggle Track ON (className="h-7 w-12 items-end justify-center rounded-full bg-blue-600 px-1")
  toggleTrackOn: {
    height: 28, // h-7
    width: 48, // w-12
    justifyContent: 'center',
    alignItems: 'flex-end', // items-end
    borderRadius: 14, // half of height
    backgroundColor: '#2563eb', // bg-blue-600
    paddingHorizontal: 4, // px-1 (approx)
  },
  // Toggle Track OFF (className="h-7 w-12 justify-center rounded-full bg-gray-200 px-1")
  toggleTrackOff: {
    height: 28, // h-7
    width: 48, // w-12
    justifyContent: 'center',
    alignItems: 'flex-start', // items-start (to mimic the off state)
    borderRadius: 14,
    backgroundColor: '#e5e7eb', // bg-gray-200
    paddingHorizontal: 4, // px-1 (approx)
  },
  // Toggle Thumb (className="h-5 w-5 rounded-full bg-white")
  toggleThumb: {
    height: 20, // h-5
    width: 20, // w-5
    borderRadius: 10,
    backgroundColor: '#ffffff', // bg-white
  },

  // App Version Container (className="mb-4 mt-8 items-center")
  appVersionContainer: {
    marginBottom: 16, // mb-4
    marginTop: 32, // mt-8
    alignItems: 'center',
  },
  // App Version Text (className="text-xs text-gray-400")
  appVersionText: {
    fontSize: 12, // text-xs
    color: '#9ca3af', // text-gray-400
  },
  // Logout Button (className="mt-4 rounded-xl bg-red-50 py-4 active:bg-red-100")
  logoutButton: {
    marginTop: 16, // mt-4
    borderRadius: 12, // rounded-xl
    backgroundColor: '#fef2f2', // bg-red-50
    paddingVertical: 16, // py-4
    // Note: active:bg-red-100 is a touch interaction style
  },
  // Logout Button Text (className="text-center font-semibold text-red-600")
  logoutButtonText: {
    textAlign: 'center',
    fontWeight: '600', // font-semibold
    color: '#dc2626', // text-red-600
  },
});
