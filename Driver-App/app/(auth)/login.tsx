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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // Navigation will be handled automatically by _layout.tsx
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
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
        <View className="flex-1 justify-center px-6">
          {/* Header */}
          <View className="mb-8">
            <Text className="mb-2 text-4xl font-bold" style={{ color: theme.colors.text.primary }}>
              Welcome Back
            </Text>
            <Text className="text-base" style={{ color: theme.colors.text.secondary }}>
              Sign in to continue tracking
            </Text>
          </View>

          {/* Form */}
          <View className="mb-6">
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
              Password
            </Text>
            <TextInput
              className="rounded-xl px-4 py-3"
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
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className="mb-4 rounded-xl py-4"
            style={{ backgroundColor: theme.colors.primary }}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-center text-base font-semibold text-white">Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View className="flex-row justify-center">
            <Text style={{ color: theme.colors.text.secondary }}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')} disabled={loading}>
              <Text className="font-semibold" style={{ color: theme.colors.primary }}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
