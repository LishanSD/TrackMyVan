import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet, // Import StyleSheet
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme/theme';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSignUp = async () => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, name, phone);
      Alert.alert('Success', 'Account created successfully!');
      // Navigation will be handled automatically by _layout.tsx
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardAvoidingView, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Sign up to track your child's van
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                styles.mb4,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  color: theme.colors.text.primary,
                },
              ]}
              placeholder="John Doe"
              placeholderTextColor={theme.colors.text.light}
              value={name}
              onChangeText={setName}
              editable={!loading}
            />

            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                styles.mb4,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  color: theme.colors.text.primary,
                },
              ]}
              placeholder="parent@example.com"
              placeholderTextColor={theme.colors.text.light}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Phone Number</Text>
            <TextInput
              style={[
                styles.input,
                styles.mb4,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  color: theme.colors.text.primary,
                },
              ]}
              placeholder="0771234567"
              placeholderTextColor={theme.colors.text.light}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!loading}
            />

            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Password</Text>
            <TextInput
              style={[
                styles.input,
                styles.mb4,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  color: theme.colors.text.primary,
                },
              ]}
              placeholder="Enter your password"
              placeholderTextColor={theme.colors.text.light}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            <Text style={[styles.label, { color: theme.colors.text.primary }]}>
              Confirm Password
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  color: theme.colors.text.primary,
                },
              ]}
              placeholder="Confirm your password"
              placeholderTextColor={theme.colors.text.light}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.signUpButton, styles.mb4, { backgroundColor: theme.colors.primary }]}
            onPress={handleSignUp}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.signUpButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLinkContainer}>
            <Text style={{ color: theme.colors.text.secondary }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')} disabled={loading}>
              <Text style={[styles.loginLinkText, { color: theme.colors.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // KeyboardAvoidingView (className="flex-1")
  keyboardAvoidingView: {
    flex: 1,
    // Background color is applied inline because it uses the theme object
  },
  // ScrollView contentContainerStyle={{ flexGrow: 1 }}
  scrollViewContent: {
    flexGrow: 1,
  },
  // View (className="flex-1 justify-center px-6 py-8")
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24, // px-6
    paddingVertical: 32, // py-8 (added to ensure content isn't too close to top/bottom on smaller screens)
  },
  // Header View (className="mb-8")
  header: {
    marginBottom: 32, // mb-8
  },
  // Title Text (className="mb-2 text-4xl font-bold")
  title: {
    marginBottom: 8, // mb-2
    fontSize: 36, // text-4xl
    fontWeight: '700', // font-bold
    // Color is applied inline because it uses the theme object
  },
  // Subtitle Text (className="text-base")
  subtitle: {
    fontSize: 16, // text-base
    // Color is applied inline because it uses the theme object
  },
  // Form View (className="mb-6")
  form: {
    marginBottom: 24, // mb-6
  },
  // Label Text (className="mb-2 text-sm font-medium")
  label: {
    marginBottom: 8, // mb-2
    fontSize: 14, // text-sm
    fontWeight: '500', // font-medium
    // Color is applied inline because it uses the theme object
  },
  // TextInput (className="rounded-xl px-4 py-3")
  input: {
    borderRadius: 12, // rounded-xl
    paddingHorizontal: 16, // px-4
    paddingVertical: 12, // py-3
    // Colors/Borders are applied inline because they use the theme object
  },
  // Utility class for TextInput (className="mb-4")
  mb4: {
    marginBottom: 16, // mb-4
  },
  // Sign Up Button (className="mb-4 rounded-xl py-4")
  signUpButton: {
    borderRadius: 12, // rounded-xl
    paddingVertical: 16, // py-4
    // Background color is applied inline because it uses the theme object
  },
  // Sign Up Button Text (className="text-center text-base font-semibold text-white")
  signUpButtonText: {
    textAlign: 'center',
    fontSize: 16, // text-base
    fontWeight: '600', // font-semibold
    color: '#ffffff', // text-white (assumed standard white)
  },
  // Login Link Container (className="flex-row justify-center")
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  // Login Link Text (className="font-semibold")
  loginLinkText: {
    fontWeight: '600', // font-semibold
    // Color is applied inline because it uses the theme object
  },
});
