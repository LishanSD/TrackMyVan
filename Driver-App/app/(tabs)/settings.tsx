// CHANGED: Removed all nativewind className usage and replaced with StyleSheet

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';

export default function SettingsScreen() {
  const { user, userProfile, logout, updateProfile, uploadProfilePicture } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    phone: userProfile?.phone || '',
    vanModel: userProfile?.vanModel || '',
    licensePlateNo: userProfile?.licensePlateNo || '',
    profilePic: userProfile?.profilePic || '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await logout();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleEditProfile = () => {
    setFormData({
      name: userProfile?.name || '',
      phone: userProfile?.phone || '',
      vanModel: userProfile?.vanModel || '',
      licensePlateNo: userProfile?.licensePlateNo || '',
      profilePic: userProfile?.profilePic || '',
    });
    setSelectedImage(null);
    setEditModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll permissions to upload profile pictures.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      Alert.alert('Error', 'Name and phone number are required');
      return;
    }

    setSaving(true);
    try {
      let profilePicUrl = formData.profilePic;

      // Upload new image if selected
      if (selectedImage) {
        profilePicUrl = await uploadProfilePicture(selectedImage);
      }

      await updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        vanModel: formData.vanModel.trim() || undefined,
        licensePlateNo: formData.licensePlateNo.trim() || undefined,
        profilePic: profilePicUrl || undefined,
      });

      Alert.alert('Success', 'Profile updated successfully');
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.innerContainer}>
        {/* Header */}
        {/* CHANGED: Replaced className props with style */}
        <Text style={[styles.headerText, { color: theme.colors.text.primary }]}>Settings</Text>

        {/* Profile Section */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
            Profile Information
          </Text>

          {userProfile?.profilePic && (
            <View style={styles.profilePicContainer}>
              <Image
                source={{ uri: userProfile.profilePic }}
                style={styles.profilePic}
              />
            </View>
          )}

          <View style={styles.infoBlock}>
            <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Name</Text>
            <Text style={[styles.value, { color: theme.colors.text.primary }]}>
              {userProfile?.name || user?.displayName || 'Not set'}
            </Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Phone</Text>
            <Text style={[styles.value, { color: theme.colors.text.primary }]}>
              {userProfile?.phone || 'Not set'}
            </Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Email</Text>
            <Text style={[styles.value, { color: theme.colors.text.primary }]}>
              {user?.email || 'Not set'}
            </Text>
          </View>

          {userProfile?.vanModel && (
            <View style={styles.infoBlock}>
              <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Van Model</Text>
              <Text style={[styles.value, { color: theme.colors.text.primary }]}>
                {userProfile.vanModel}
              </Text>
            </View>
          )}

          {userProfile?.licensePlateNo && (
            <View style={styles.infoBlock}>
              <Text style={[styles.label, { color: theme.colors.text.secondary }]}>License Plate</Text>
              <Text style={[styles.value, { color: theme.colors.text.primary }]}>
                {userProfile.licensePlateNo}
              </Text>
            </View>
          )}
        </View>

        {/* Account Settings */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
            Account Settings
          </Text>

          <TouchableOpacity
            style={[styles.cardButton, { borderColor: theme.colors.border }]}
            onPress={handleEditProfile}>
            <Text style={{ color: theme.colors.text.primary }}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardButton, { borderColor: theme.colors.border }]}
            onPress={() => Alert.alert('Info', 'Change password feature coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Change Password</Text>
          </TouchableOpacity>
        </View>

        {/* App Settings */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>App Settings</Text>

          <TouchableOpacity
            style={[styles.cardButton, { borderColor: theme.colors.border }]}
            onPress={() => Alert.alert('Info', 'Notifications settings coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardButton, { borderColor: theme.colors.border }]}
            onPress={() => Alert.alert('Info', 'Privacy settings coming soon')}>
            <Text style={{ color: theme.colors.text.primary }}>Privacy</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.colors.error }]}
          onPress={handleLogout}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.logoutText}>Logout</Text>
          )}
        </TouchableOpacity>

        {/* Version Info */}
        <Text style={[styles.versionText, { color: theme.colors.text.light }]}>
          TrackMyVan Driver App v1.0.0
        </Text>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                Edit Profile
              </Text>

              {/* Profile Picture */}
              <View style={styles.profilePicEditContainer}>
                <TouchableOpacity onPress={pickImage} style={styles.profilePicEditButton}>
                  {(selectedImage || formData.profilePic) ? (
                    <Image
                      source={{ uri: selectedImage || formData.profilePic }}
                      style={styles.profilePicEdit}
                    />
                  ) : (
                    <View style={styles.profilePicPlaceholder}>
                      <Text style={styles.profilePicPlaceholderText}>📷</Text>
                      <Text style={styles.profilePicPlaceholderLabel}>Add Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Name */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                  Name *
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.text.primary, borderColor: theme.colors.border }]}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.colors.text.light}
                />
              </View>

              {/* Phone */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                  Phone Number *
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.text.primary, borderColor: theme.colors.border }]}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Enter your phone number"
                  placeholderTextColor={theme.colors.text.light}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Van Model */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                  Van Model
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.text.primary, borderColor: theme.colors.border }]}
                  value={formData.vanModel}
                  onChangeText={(text) => setFormData({ ...formData, vanModel: text })}
                  placeholder="e.g., Toyota Hiace"
                  placeholderTextColor={theme.colors.text.light}
                />
              </View>

              {/* License Plate */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                  License Plate Number
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.text.primary, borderColor: theme.colors.border }]}
                  value={formData.licensePlateNo}
                  onChangeText={(text) => setFormData({ ...formData, licensePlateNo: text })}
                  placeholder="e.g., ABC-1234"
                  placeholderTextColor={theme.colors.text.light}
                  autoCapitalize="characters"
                />
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { borderColor: theme.colors.border }]}
                  onPress={() => setEditModalVisible(false)}
                  disabled={saving}>
                  <Text style={[styles.modalButtonText, { color: theme.colors.text.primary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSaveProfile}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonTextSave}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // CHANGED: Replacing flex-1
  container: {
    flex: 1,
  },
  innerContainer: {
    padding: theme.spacing.lg,
  },

  // Header
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: theme.spacing.lg,
  },

  // Cards
  card: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },

  // Text blocks
  infoBlock: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Buttons inside cards
  cardButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderTopWidth: 1,
  },

  // Logout
  logoutButton: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Version text
  versionText: {
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    fontSize: 13,
  },

  // Profile Picture
  profilePicContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.border,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: theme.spacing.lg,
  },
  profilePicEditContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  profilePicEditButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  profilePicEdit: {
    width: '100%',
    height: '100%',
  },
  profilePicPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicPlaceholderText: {
    fontSize: 32,
    marginBottom: 4,
  },
  profilePicPlaceholderLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    // backgroundColor handled inline
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
