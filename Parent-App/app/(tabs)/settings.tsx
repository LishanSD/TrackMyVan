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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
  const { user, userProfile, logout, updateUserProfile, uploadProfilePicture, changePassword } = useAuth();

  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    phone: userProfile?.phone || '',
    profilePic: userProfile?.profilePic || '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });


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
      profilePic: userProfile?.profilePic || '',
    });
    setSelectedImage(null);
    setEditModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'We need camera roll permissions to upload profile pictures.'
      );
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
      const profilePicUrl = selectedImage 
        ? await uploadProfilePicture(selectedImage)
        : (formData.profilePic || null);

      await updateUserProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        profilePic: profilePicUrl,
      });

      Alert.alert('Success', 'Profile updated successfully');
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      Alert.alert('Success', 'Password changed successfully');
      setChangePasswordModalVisible(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
      <View style={styles.innerContainer}>
        <Text style={[styles.headerText, { color: theme.colors.text.primary }]}>Settings</Text>

        <View style={[styles.profileCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.profileInfoWrapper}>
            <View style={[styles.avatarWrapper, { borderColor: theme.colors.border }]}>
              {userProfile?.profilePic ? (
                <Image source={{ uri: userProfile.profilePic }} style={styles.profilePic} />
              ) : (
                <View style={styles.profilePicPlaceholder}>
                  <Text style={styles.placeholderEmoji}>👤</Text>
                </View>
              )}
            </View>
            <View style={styles.profileTextContent}>
              <Text style={[styles.userName, { color: theme.colors.text.primary }]}>
                {userProfile?.name || user?.displayName || 'Not set'}
              </Text>
              <Text style={[styles.userEmail, { color: theme.colors.text.secondary }]}>
                {user?.email}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Phone</Text>
            <Text style={[styles.value, { color: theme.colors.text.primary }]}>
              {userProfile?.phone || 'Not set'}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
            Account Settings
          </Text>

          <TouchableOpacity
            style={[
              styles.cardButton,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
              },
            ]}
            onPress={handleEditProfile}
            activeOpacity={0.7}>
            <Text style={[styles.buttonText, { color: theme.colors.text.primary }]}>
              Edit Profile
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cardButton}
            onPress={() => {
              setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
              });
              setChangePasswordModalVisible(true);
            }}
            activeOpacity={0.7}>
            <Text style={[styles.buttonText, { color: theme.colors.text.primary }]}>
              Change Password
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>



        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.colors.error }]}
          onPress={handleLogout}
          disabled={loading}
          activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.logoutText}>Logout</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: theme.colors.text.light }]}>
          TrackMyVan Parent App v1.0.0
        </Text>
      </View>

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeaderIndicator} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                Edit Profile
              </Text>

              <View style={styles.profilePicEditContainer}>
                <TouchableOpacity
                  onPress={pickImage}
                  style={styles.profilePicEditButton}
                  activeOpacity={0.9}>
                  {selectedImage || formData.profilePic ? (
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
                  <View style={[styles.editBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.editBadgeText}>✎</Text>
                  </View>
                </TouchableOpacity>
                {(selectedImage || formData.profilePic) && (
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => {
                      setFormData({ ...formData, profilePic: '' });
                      setSelectedImage(null);
                    }}>
                    <Text style={styles.removePhotoButtonText}>Remove Photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                  Name *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.colors.text.primary, borderColor: theme.colors.border },
                  ]}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.colors.text.light}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                  Phone Number *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.colors.text.primary, borderColor: theme.colors.border },
                  ]}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Enter your phone number"
                  placeholderTextColor={theme.colors.text.light}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setEditModalVisible(false)}
                  disabled={saving}>
                  <Text style={[styles.modalButtonText, { color: theme.colors.text.primary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
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

      <Modal
        visible={changePasswordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChangePasswordModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeaderIndicator} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                Change Password
              </Text>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                  Current Password *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.colors.text.primary, borderColor: theme.colors.border },
                  ]}
                  value={passwordData.currentPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
                  placeholder="Enter current password"
                  placeholderTextColor={theme.colors.text.light}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                  New Password *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.colors.text.primary, borderColor: theme.colors.border },
                  ]}
                  value={passwordData.newPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                  placeholder="Enter new password (min 6 chars)"
                  placeholderTextColor={theme.colors.text.light}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                  Confirm New Password *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.colors.text.primary, borderColor: theme.colors.border },
                  ]}
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                  placeholder="Confirm new password"
                  placeholderTextColor={theme.colors.text.light}
                  secureTextEntry
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setChangePasswordModalVisible(false)}
                  disabled={saving}>
                  <Text style={[styles.modalButtonText, { color: theme.colors.text.primary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={handleChangePassword}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonTextSave}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  innerContainer: {
    padding: 24,
  },
  headerText: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  profileCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  profileInfoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  profilePicPlaceholder: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  profilePicPlaceholderText: {
    fontSize: 32,
    marginBottom: 4,
  },
  profilePicPlaceholderLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  profileTextContent: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingsCard: {
    borderRadius: 20,
    paddingVertical: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 18,
    color: '#D1D5DB',
    fontWeight: '300',
  },
  logoutButton: {
    marginTop: 12,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 12,
    maxHeight: '90%',
  },
  modalHeaderIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 24,
    textAlign: 'center',
  },
  profilePicEditContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profilePicEditButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  profilePicEdit: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  editBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
    marginBottom: 20,
  },
  modalButton: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  saveButton: {
    // Additional styling can be added here if needed
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    opacity: 0.6,
  },
  removePhotoButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  removePhotoButtonText: {
    color: theme.colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
});
