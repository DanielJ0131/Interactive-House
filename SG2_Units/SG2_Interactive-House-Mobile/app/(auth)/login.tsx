
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../../utils/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useGuest } from '../../utils/GuestContext';
import { useAppTheme } from '../../utils/AppThemeContext';


// Timeout for authentication requests (in milliseconds)
const AUTH_TIMEOUT_MS = 8_000;


/**
 * Utility function to add a timeout to a promise.
 * Used to prevent hanging on slow network requests.
 * @param promise The promise to race against the timeout
 * @param ms Timeout in milliseconds
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Request timed out. Please check your connection and try again.'));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}


/**
 * LoginScreen
 *
 * This component renders the login screen for the Interactive House app.
 * It provides authentication via email/password (using Firebase Auth) and a guest login option.
 *
 * Features:
 * - Email/password login with error handling and loading state
 * - Guest login (bypasses authentication)
 * - Password visibility toggle
 * - Themed UI with support for light/dark mode
 * - Navigation to signup and home screens
 * - Responsive layout with keyboard avoidance
 */
export default function LoginScreen() {
  // Navigation router
  const router = useRouter();
  // Guest context setter
  const { setIsGuest } = useGuest();
  // App theme (colors, etc.)
  const { theme } = useAppTheme();
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Loading and error state
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  // Password visibility toggle
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  /**
   * Handles login with email and password.
   * Shows loading indicator and error messages as needed.
   */
  const handleLogin = async () => {
    // Validate input
    if (!email || !password) {
      setLoginError('Please enter both email and password.');
      return;
    }

    setLoginError(null);
    setIsLoading(true);

    try {
      // Attempt sign-in with timeout
      await withTimeout(signInWithEmailAndPassword(auth, email.trim(), password), AUTH_TIMEOUT_MS);
      setLoginError(null);
      // Navigate to main hub on success
      router.replace('/(tabs)/hub');
    } catch (error: any) {
      // Handle known Firebase Auth errors
      let errorMessage = 'An unexpected error occurred.';

      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This user account has been disabled.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = error.message || 'Something went wrong.';
      }

      setLoginError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles guest login (no authentication).
   * Sets guest state and navigates to main hub.
   */
  const handleGuestLogin = () => {
    setLoginError(null);
    setIsGuest(true);
    router.replace('/(tabs)/hub');
  };

  // --- UI Rendering ---
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Keyboard avoidance for input fields */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 justify-center p-8">

            {/* Back Button (top left) */}
            <View className="absolute top-4 left-4 z-10">
              <Pressable
                onPress={() => router.replace('/')}
                className="flex-row items-center p-2 active:opacity-60"
              >
                <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.accent} />
                <Text style={{ color: theme.colors.accent }} className="font-bold text-lg">Back</Text>
              </Pressable>
            </View>
            
            {/* Header Section: App icon and welcome text */}
            <View className="items-center mb-10 mt-8">
              <View style={{ backgroundColor: theme.colors.accentSoft }} className="p-4 rounded-3xl mb-4">
                <MaterialCommunityIcons name="shield-home" size={60} color={theme.colors.accent} />
              </View>
              <Text style={{ color: theme.colors.text }} className="text-3xl font-bold tracking-tight">Welcome Back</Text>
              <Text style={{ color: theme.colors.mutedText }} className="text-lg mt-2">Sign in to control your home</Text>
            </View>

            {/* Form Section: Email and Password fields */}
            <View className="space-y-4">
              {/* Email input */}
              <View>
                <Text style={{ color: theme.colors.text }} className="mb-2 ml-1 font-medium">Email Address</Text>
                <TextInput
                  style={{ backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }}
                  className="border p-4 rounded-2xl mb-4"
                  placeholder="name@example.com"
                  placeholderTextColor={theme.colors.subtleText}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (loginError) {
                      setLoginError(null);
                    }
                  }}
                  autoComplete="email"
                  textContentType="emailAddress"
                  importantForAutofill="yes"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>

              {/* Password input with visibility toggle */}
              <View>
                <Text style={{ color: theme.colors.text }} className="mb-2 ml-1 font-medium">Password</Text>
                <View className="relative">
                  <TextInput
                    style={{ backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }}
                    className="border p-4 pr-12 rounded-2xl"
                    placeholder="••••••••"
                    placeholderTextColor={theme.colors.subtleText}
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (loginError) {
                        setLoginError(null);
                      }
                    }}
                    autoComplete="password"
                    textContentType="password"
                    importantForAutofill="yes"
                    // Hide/show password based on toggle
                    secureTextEntry={!isPasswordVisible}
                    editable={!isLoading}
                  />
                  {/* Eye icon to toggle password visibility */}
                  <TouchableOpacity
                    testID="password-visibility-toggle"
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                    style={{ position: 'absolute', right: 16, top: 16 }}
                  >
                    <MaterialCommunityIcons
                      name={isPasswordVisible ? "eye-off" : "eye"}
                      size={24}
                      color={theme.colors.subtleText}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Action Buttons: Sign In and Guest Login */}
            <View className="mt-8">
              {/* Error message display */}
              {loginError && (
                <View style={{ backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger }} className="mb-4 rounded-2xl border p-3">
                  <Text style={{ color: theme.colors.danger }} className="text-sm font-medium">{loginError}</Text>
                </View>
              )}
              {/* Sign In button */}
              <Pressable
                testID="sign-in-button"
                style={{ backgroundColor: isLoading ? theme.colors.surfaceStrong : theme.colors.accent }}
                className="p-5 rounded-2xl items-center"
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.accentText} />
                ) : (
                  <Text style={{ color: theme.colors.accentText }} className="font-bold text-lg">Sign In</Text>
                )}
              </Pressable>

              {/* Guest login button */}
              <Pressable
                testID="guest-login-button"
                className="mt-6 py-2 active:opacity-60"
                onPress={handleGuestLogin}
                disabled={isLoading}
              >
                <View className="flex-row justify-center items-center">
                  <Text style={{ color: theme.colors.subtleText }} className="font-semibold text-base">Continue as Guest </Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color={theme.colors.subtleText} />
                </View>
              </Pressable>
            </View>

            {/* Redirect to Signup link */}
            <View className="flex-row justify-center mt-8">
              <Text style={{ color: theme.colors.mutedText }}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text style={{ color: theme.colors.accent }} className="font-bold">Sign Up</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}