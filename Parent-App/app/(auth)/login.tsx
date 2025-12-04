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
      style={[styles.keyboardAvoidingView, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Sign in to track your child's van
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
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

            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Password</Text>
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
            style={[styles.loginButton, styles.mb4, { backgroundColor: theme.colors.primary }]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signUpLinkContainer}>
            <Text style={{ color: theme.colors.text.secondary }}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')} disabled={loading}>
              <Text style={[styles.signUpLinkText, { color: theme.colors.primary }]}>Sign Up</Text>
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
  // View (className="flex-1 justify-center px-6")
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24, // px-6
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
  // Login Button (className="mb-4 rounded-xl py-4")
  loginButton: {
    borderRadius: 12, // rounded-xl
    paddingVertical: 16, // py-4
    // Background color is applied inline because it uses the theme object
  },
  // Login Button Text (className="text-center text-base font-semibold text-white")
  loginButtonText: {
    textAlign: 'center',
    fontSize: 16, // text-base
    fontWeight: '600', // font-semibold
    color: '#ffffff', // text-white (assumed standard white)
  },
  // Sign Up Link Container (className="flex-row justify-center")
  signUpLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  // Sign Up Link Text (className="font-semibold")
  signUpLinkText: {
    fontWeight: '600', // font-semibold
    // Color is applied inline because it uses the theme object
  },
});
