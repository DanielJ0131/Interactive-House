import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  Platform, 
  ScrollView, 
  KeyboardAvoidingView, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../utils/AppThemeContext';
import { auth, db } from '../../utils/firebaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { INITIAL_DEVICE_DATA } from '../../data/deviceDefaults';
import { getArduinoDevicesDocRef } from '../../utils/firestorePaths';


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
 * SignupScreen
 *
 * This component renders the signup screen for the Interactive House app.
 * It allows users to create a new account with name, email, and password.
 *
 * Features:
 * - Form validation for all fields
 * - Password and confirm password fields with visibility toggles
 * - Firebase Auth integration for account creation
 * - Firestore integration for user/device profile setup
 * - Error handling and loading state
 * - Themed UI with support for light/dark mode
 * - Navigation to login and home screens
 * - Responsive layout with keyboard avoidance
 */
export default function SignupScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  // State for toggling password visibility (for both password fields)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  /**
   * Handles signup form submission.
   * Validates input, creates user in Firebase Auth, sets up Firestore profile, and handles errors.
   */
  const handleSignup = async () => {
    const nextErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      general?: string;
    } = {};

    const cleanName = name.trim().replace(/\s+/g, ' ');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      nextErrors.name = 'Please enter your full name.';
    }

    if (!cleanEmail) {
      nextErrors.email = 'Please enter your email address.';
    }

    if (!password) {
      nextErrors.password = 'Please enter a password.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (password && password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrors({});

    try {
      const userCredential = await withTimeout(createUserWithEmailAndPassword(auth, cleanEmail, password), AUTH_TIMEOUT_MS);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: cleanName });

      const arduinoDocRef = getArduinoDevicesDocRef(db);
      const arduinoDocSnap = await getDoc(arduinoDocRef);
      const deviceWritePromise = arduinoDocSnap.exists()
        ? Promise.resolve()
        : setDoc(arduinoDocRef, INITIAL_DEVICE_DATA);
      const userDocRef = doc(db, 'users', user.email!);

      await Promise.all([
        deviceWritePromise,
        setDoc(userDocRef, {
          name: cleanName,
          createdAt: new Date().toISOString(),
          role: 'user',
        }),
      ]);

      // Hard cleanup: make sure legacy fields are not persisted on new accounts.
      await updateDoc(userDocRef, {
        email: deleteField(),
        nameKey: deleteField(),
      });

      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/hub') }
      ]);
      
    } catch (error: any) {
      const nextErrors: {
        name?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
        general?: string;
      } = {};

      switch (error.code) {
        case 'auth/email-already-in-use':
          nextErrors.email = 'This email is already registered. Try logging in.';
          break;
        case 'auth/invalid-email':
          nextErrors.email = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          nextErrors.password = 'Password should be at least 6 characters.';
          break;
        case 'permission-denied':
          nextErrors.general = 'Permission denied while creating your profile. Please contact support.';
          break;
        default:
          nextErrors.general = error?.message || 'Could not create account.';
      }

      setErrors(nextErrors);
    } finally {
      setIsSubmitting(false);
    }
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

            {/* Header Section: Title and subtitle */}
            <View className="mt-8">
              <Text style={{ color: theme.colors.text }} className="text-4xl font-bold mb-2">Create Account</Text>
              <Text style={{ color: theme.colors.mutedText }} className="mb-8">Start your Interactive House journey today.</Text>
            </View>

            {/* Form Section: Name, Email, Password, Confirm Password */}
            <View className="space-y-4">
              {/* General error message */}
              {errors.general && (
                <Text style={{ color: theme.colors.danger }} className="mb-3 ml-1 font-medium">{errors.general}</Text>
              )}

              {/* Name input */}
              <Text style={{ color: theme.colors.text }} className="mb-1 ml-1 font-medium">Full Name</Text>
              {errors.name && (
                <Text style={{ color: theme.colors.danger }} className="mb-2 ml-1 text-xs font-medium">{errors.name}</Text>
              )}
              <TextInput
                placeholder="Name Example"
                placeholderTextColor={theme.colors.subtleText}
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  if (errors.name || errors.general) {
                    setErrors((prev) => ({ ...prev, name: undefined, general: undefined }));
                  }
                }}
                style={{ backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }}
                className="border p-4 rounded-2xl mb-4"
              />

              {/* Email input */}
              <Text style={{ color: theme.colors.text }} className="mb-1 ml-1 font-medium">Email Address</Text>
              {errors.email && (
                <Text style={{ color: theme.colors.danger }} className="mb-2 ml-1 text-xs font-medium">{errors.email}</Text>
              )}
              <TextInput
                placeholder="name@example.com"
                placeholderTextColor={theme.colors.subtleText}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (errors.email || errors.general) {
                    setErrors((prev) => ({ ...prev, email: undefined, general: undefined }));
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }}
                className="border p-4 rounded-2xl mb-4"
              />

              {/* Password input with visibility toggle */}
              <Text style={{ color: theme.colors.text }} className="mb-1 ml-1 font-medium">Password</Text>
              {errors.password && (
                <Text style={{ color: theme.colors.danger }} className="mb-2 ml-1 text-xs font-medium">{errors.password}</Text>
              )}
              <View className="relative mb-4">
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.subtleText}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (errors.password || errors.confirmPassword || errors.general) {
                      setErrors((prev) => ({
                        ...prev,
                        password: undefined,
                        confirmPassword: undefined,
                        general: undefined,
                      }));
                    }
                  }}
                  style={{ backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }}
                  className="border p-4 pr-12 rounded-2xl"
                  secureTextEntry={!isPasswordVisible}
                />
                {/* Eye icon to toggle password visibility */}
                <Pressable
                  testID="password-visibility-toggle"
                  onPress={() => setIsPasswordVisible((v) => !v)}
                  style={{ position: 'absolute', right: 16, top: 16 }}
                >
                  <MaterialCommunityIcons
                    name={isPasswordVisible ? 'eye-off' : 'eye'}
                    size={24}
                    color={theme.colors.subtleText}
                  />
                </Pressable>
              </View>

              {/* Confirm password input with visibility toggle */}
              <Text style={{ color: theme.colors.text }} className="mb-1 ml-1 font-medium">Confirm Password</Text>
              {errors.confirmPassword && (
                <Text style={{ color: theme.colors.danger }} className="mb-2 ml-1 text-xs font-medium">{errors.confirmPassword}</Text>
              )}
              <View className="relative mb-4">
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.subtleText}
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    if (errors.confirmPassword || errors.general) {
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined, general: undefined }));
                    }
                  }}
                  style={{ backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }}
                  className="border p-4 pr-12 rounded-2xl"
                  secureTextEntry={!isConfirmPasswordVisible}
                />
                {/* Eye icon to toggle confirm password visibility */}
                <Pressable
                  testID="confirm-password-visibility-toggle"
                  onPress={() => setIsConfirmPasswordVisible((v) => !v)}
                  style={{ position: 'absolute', right: 16, top: 16 }}
                >
                  <MaterialCommunityIcons
                    name={isConfirmPasswordVisible ? 'eye-off' : 'eye'}
                    size={24}
                    color={theme.colors.subtleText}
                  />
                </Pressable>
              </View>

              {/* Submit button */}
              <Pressable
                onPress={handleSignup}
                disabled={isSubmitting}
                style={{ backgroundColor: isSubmitting ? theme.colors.surfaceStrong : theme.colors.accent }}
                className="p-5 rounded-2xl mt-4"
              >
                {isSubmitting ? (
                  <ActivityIndicator color={theme.colors.accentText} />
                ) : (
                  <Text style={{ color: theme.colors.accentText }} className="text-center font-bold text-lg">Create Account</Text>
                )}
              </Pressable>
            </View>

            {/* Redirect to Login link */}
            <View className="flex-row justify-center mt-10">
              <Text style={{ color: theme.colors.mutedText }}>Already have an account? </Text>
              <Link href="/login" asChild>
                <Pressable>
                  <Text style={{ color: theme.colors.accent }} className="font-bold">Sign In</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}