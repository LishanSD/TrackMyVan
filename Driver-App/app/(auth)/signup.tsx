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
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-8">
          {/* Header */}
          <View className="mb-8">
            <Text className="mb-2 text-4xl font-bold" style={{ color: theme.colors.text.primary }}>
              Create Account
            </Text>
            <Text className="text-base" style={{ color: theme.colors.text.secondary }}>
              Sign up to start tracking
            </Text>
          </View>

          {/* Form */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium" style={{ color: theme.colors.text.primary }}>
              Full Name
            </Text>
            <TextInput
              className="mb-4 rounded-xl px-4 py-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                color: theme.colors.text.primary,
              }}
              placeholder="John Doe"
              placeholderTextColor={theme.colors.text.light}
              value={name}
              onChangeText={setName}
              editable={!loading}
            />

            <Text className="mb-2 text-sm font-medium" style={{ color: theme.colors.text.primary }}>
              Email
            </Text>
            <TextInput
              className="mb-4 rounded-xl px-4 py-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                color: theme.colors.text.primary,
              }}
              placeholder="driver@example.com"
              placeholderTextColor={theme.colors.text.light}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <Text className="mb-2 text-sm font-medium" style={{ color: theme.colors.text.primary }}>
              Phone Number
            </Text>
            <TextInput
              className="mb-4 rounded-xl px-4 py-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                color: theme.colors.text.primary,
              }}
              placeholder="0771234567"
              placeholderTextColor={theme.colors.text.light}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!loading}
            />

            <Text className="mb-2 text-sm font-medium" style={{ color: theme.colors.text.primary }}>
              Password
            </Text>
            <TextInput
              className="mb-4 rounded-xl px-4 py-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                color: theme.colors.text.primary,
              }}
              placeholder="Enter your password"
              placeholderTextColor={theme.colors.text.light}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            <Text className="mb-2 text-sm font-medium" style={{ color: theme.colors.text.primary }}>
              Confirm Password
            </Text>
            <TextInput
              className="rounded-xl px-4 py-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                color: theme.colors.text.primary,
              }}
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
            className="mb-4 rounded-xl py-4"
            style={{ backgroundColor: theme.colors.primary }}
            onPress={handleSignUp}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-center text-base font-semibold text-white">Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View className="flex-row justify-center">
            <Text style={{ color: theme.colors.text.secondary }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')} disabled={loading}>
              <Text className="font-semibold" style={{ color: theme.colors.primary }}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
