import { Stack } from 'expo-router';
import { useAppTheme } from '../../utils/AppThemeContext';

/**
 * AuthLayout
 *
 * This component defines the navigation stack for authentication-related screens (Login and Signup).
 * It is used as a nested layout within the app's routing structure, specifically for the /auth route.
 *
 * Key behaviors:
 * - Hides the default header so that each screen (login, signup) can control its own header/UI.
 * - Applies the current theme's background color to ensure visual consistency, especially during transitions.
 * - Uses a fade animation for smoother navigation between auth screens.
 *
 * Usage:
 * This layout is automatically applied to all screens nested under the /auth route.
 */
export default function AuthLayout() {
  // Access the current theme (light/dark) from the app's theme context
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        // Set the background color for all auth screens to match the theme
        contentStyle: { backgroundColor: theme.colors.background },
        // Hide the default header; individual screens can show their own if needed
        headerShown: false,
        // Use a fade animation for transitions between auth screens
        animation: 'fade',
      }}
    >
      {/* Login screen configuration */}
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'Sign In' // Title shown in navigation (if header is enabled)
        }} 
      />
      {/* Signup screen configuration */}
      <Stack.Screen 
        name="signup" 
        options={{ 
          title: 'Create Account' // Title shown in navigation (if header is enabled)
        }} 
      />
    </Stack>
  );
}