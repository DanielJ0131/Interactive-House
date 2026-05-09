// Tab navigation layout for the main app sections (Hub, AI, Music)
// Handles authentication, Firestore sync, guest mode, and theming
// Provides header actions: Emergency, Sign Out, and Modal (status)

import { MaterialCommunityIcons } from '@expo/vector-icons'; // Icon library
import { Link, Tabs, useRouter } from 'expo-router'; // Expo Router navigation
import { useState, useEffect } from 'react';
import { Platform, Pressable, View, Alert } from 'react-native';
import { cssInterop } from 'nativewind'; // NativeWind for Tailwind-like styling
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Firebase Auth
import { onSnapshotsInSync } from 'firebase/firestore'; // Firestore sync status
import { db, auth } from '../../utils/firebaseConfig'; // Firebase config
import { useGuest } from '../../utils/GuestContext'; // Guest mode context
import { useAppTheme } from '../../utils/AppThemeContext'; // Theme context
import SpeechOverlay from "../../components/speechOverlay"; // Voice UI overlay
import EmergencyHeaderButton from "../../components/EmergencyHeaderButton"; // Emergency button

// Enable NativeWind className prop for MaterialCommunityIcons
cssInterop(MaterialCommunityIcons, {
  className: 'style',
});


/**
 * Main tab layout for the app's authenticated/guest experience.
 * Handles auth, Firestore sync, guest mode, and navigation.
 */
export default function TabLayout() {
  const router = useRouter(); // Navigation
  const { isGuest, setIsGuest } = useGuest(); // Guest mode state
  const { theme } = useAppTheme(); // Theming/colors
  const [isConnected, setIsConnected] = useState(false); // Firestore sync status
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Auth status


  // Set up listeners for Firestore sync and authentication state
  useEffect(() => {
    // Skip Firebase listeners in guest mode
    if (isGuest) return;

    // Monitor Firestore Sync status
    const unsubscribeSync = onSnapshotsInSync(db, () => {
      setIsConnected(true);
    });

    // Monitor Auth Status (Real-time listener)
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        // Redirect to home if signed out
        router.replace('/');
      }
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeSync();
      unsubscribeAuth();
    };
  }, [isGuest, router]);


  /**
   * Handles sign out for both guest and authenticated users.
   * Shows confirmation dialog (platform-specific) and performs sign out.
   */
  const handleSignOut = async () => {
    const performSignOut = async () => {
      if (isGuest) {
        setIsGuest(false);
        router.replace('/');
        return;
      }
      try {
        await signOut(auth);
      } catch (e) {
        // Show error alert if sign out fails
        if (Platform.OS === 'web') {
          window.alert("Failed to sign out safely.");
        } else {
          Alert.alert("Error", "Failed to sign out safely.");
        }
      }
    };

    // WEB: Use standard browser confirmation
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to log out?")) {
        await performSignOut();
      }
      return;
    }

    // MOBILE: Use React Native Alert
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out of your smart home?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: performSignOut
        }
      ]
    );
  };


  // System is ready if in guest mode, or if Firestore is connected and user is logged in
  const isSystemReady = isGuest || (isConnected && isLoggedIn);

  // Main layout: Tabs for Hub, AI, Music. Header includes Emergency, Sign Out, and Modal (status) actions.
  return (
    <View style={{ flex: 1 }}>
      {/* Tab navigation for main app sections */}
      <Tabs
        initialRouteName="hub"
        screenOptions={{
          tabBarActiveTintColor: theme.colors.accent, // Active tab color
          tabBarInactiveTintColor: theme.colors.mutedText, // Inactive tab color
          tabBarShowLabel: true,
          headerStyle: {
            backgroundColor: theme.colors.background,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          headerShadowVisible: false,
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          // Header right: Emergency, Sign Out, Modal (status)
          headerRight: () => (
            <View className="flex-row items-center mr-4">
              {/* Emergency button navigates to /emergency */}
              <EmergencyHeaderButton onPress={() => router.push('/emergency')} />

              {/* Sign out button (guest or auth) */}
              <Pressable
                onPress={handleSignOut}
                hitSlop={20}
                className="mr-5 active:opacity-60"
              >
                <MaterialCommunityIcons
                  name="logout"
                  size={22}
                  color={theme.colors.danger}
                />
              </Pressable>

              {/* Modal/status button: shield icon shows login status */}
              <Link href="/modal" asChild>
                <Pressable hitSlop={20}>
                  {({ pressed }) => (
                    <MaterialCommunityIcons
                      name={isLoggedIn ? 'shield-check' : 'shield-alert-outline'}
                      size={26}
                      color={isLoggedIn ? theme.colors.success : theme.colors.danger}
                      className={pressed ? 'opacity-60' : 'opacity-100'}
                    />
                  )}
                </Pressable>
              </Link>
            </View>
          ),
          tabBarStyle: {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            height: Platform.OS === 'ios' ? 88 : 75,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          },
          tabBarHideOnKeyboard: true,
        }}
      >
        {/* Hub tab */}
        <Tabs.Screen
          name="hub"
          options={{
            title: 'Hub',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="memory" size={26} color={color} />, // Memory chip icon
          }}
        />

        {/* AI tab */}
        <Tabs.Screen
          name="ai"
          options={{
            title: 'AI',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="robot-industrial" size={26} color={color} />, // Robot icon
          }}
        />

        {/* Music tab */}
        <Tabs.Screen
          name="music"
          options={{
            title: 'Music',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="music" size={26} color={color} />, // Music note icon
          }}
        />
      </Tabs>
      {/* Speech overlay for voice UI */}
      <SpeechOverlay />

    </View>
  );
}