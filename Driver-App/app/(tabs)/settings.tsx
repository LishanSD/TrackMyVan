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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
  const { user, userProfile, logout, updateUserProfile, uploadProfilePicture } = useAuth();
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
      let profilePicUrl = formData.profilePic;

      if (selectedImage) {
        profilePicUrl = await uploadProfilePicture(selectedImage);
      }

      await updateUserProfile({
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
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <View style={styles.innerContainer}>
        <Text style={[styles.headerText, { color: theme.colors.text.primary }]}>Settings</Text>

        <View style={[styles.profileHeaderCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.profileMainRow}>
            <View style={[styles.profilePicContainer, { borderColor: theme.colors.border }]}>
              {userProfile?.profilePic ? (
                <Image source={{ uri: userProfile.profilePic }} style={styles.profilePic} />
              ) : (
                <View style={[styles.profilePic, styles.profilePicPlaceholder]}>
                  <Text style={styles.placeholderEmoji}>👤</Text>
                </View>
              )}
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.headerName, { color: theme.colors.text.primary }]}>
                {userProfile?.name || user?.displayName || 'Not set'}
              </Text>
              <Text style={[styles.headerEmail, { color: theme.colors.text.secondary }]}>
                {user?.email}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsGrid}>
            <View style={styles.gridItem}>
              <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Phone</Text>
              <Text style={[styles.value, { color: theme.colors.text.primary }]}>
                {userProfile?.phone || 'Not set'}
              </Text>
            </View>
            {userProfile?.vanModel && (
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
                  Van Model
                </Text>
                <Text style={[styles.value, { color: theme.colors.text.primary }]}>
                  {userProfile.vanModel}
                </Text>
              </View>
            )}
            {userProfile?.licensePlateNo && (
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
                  License Plate
                </Text>
                <Text style={[styles.value, { color: theme.colors.text.primary }]}>
                  {userProfile.licensePlateNo}
                </Text>
              </View>
            )}
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
            onPress={() => Alert.alert('Info', 'Change password feature coming soon')}
            activeOpacity={0.7}>
            <Text style={[styles.buttonText, { color: theme.colors.text.primary }]}>
              Change Password
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>App Settings</Text>

          <TouchableOpacity
            style={[
              styles.cardButton,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
              },
            ]}
            onPress={() => Alert.alert('Info', 'Notifications settings coming soon')}
            activeOpacity={0.7}>
            <Text style={[styles.buttonText, { color: theme.colors.text.primary }]}>
              Notifications
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cardButton}
            onPress={() => Alert.alert('Info', 'Privacy settings coming soon')}
            activeOpacity={0.7}>
            <Text style={[styles.buttonText, { color: theme.colors.text.primary }]}>Privacy</Text>
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
          TrackMyVan Driver App v1.0.0
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

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                  Van Model
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.colors.text.primary, borderColor: theme.colors.border },
                  ]}
                  value={formData.vanModel}
                  onChangeText={(text) => setFormData({ ...formData, vanModel: text })}
                  placeholder="e.g., Toyota Hiace"
                  placeholderTextColor={theme.colors.text.light}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                  License Plate Number
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.colors.text.primary, borderColor: theme.colors.border },
                  ]}
                  value={formData.licensePlateNo}
                  onChangeText={(text) => setFormData({ ...formData, licensePlateNo: text })}
                  placeholder="e.g., ABC-1234"
                  placeholderTextColor={theme.colors.text.light}
                  autoCapitalize="characters"
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  innerContainer: {
    padding: theme.spacing.lg,
  },
  headerText: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  profileHeaderCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    overflow: 'hidden',
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  profilePicPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  profilePicPlaceholderText: {
    fontSize: 36,
    marginBottom: 4,
  },
  profilePicPlaceholderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerEmail: {
    fontSize: 14,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    minWidth: '45%',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
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
  cardButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
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
    maxHeight: '92%',
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
    borderRadius: 55,
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
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
  saveButton: {},
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
