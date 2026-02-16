import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { cssInterop } from 'nativewind';

/**
 * NativeWind Compatibility Bridge:
 * MaterialCommunityIcons does not support 'className' by default.
 * cssInterop "injects" NativeWind support, mapping the 'className' prop 
 * to the component's internal 'style' object.
 */
cssInterop(MaterialCommunityIcons, {
  className: 'style',
});

/**
 * Root Tab Layout Component:
 * Manages the main navigation structure, styling, and bottom tab bar configuration.
 */
export default function TabLayout() {
  const router = useRouter();

  /**
   * isConnected: UI-only state placeholder for system health.
   * Can be hooked into a context provider later for real Firebase/Network status.
   */
  const [isConnected, setIsConnected] = useState(false);

  return (
    <Tabs
      screenOptions={{
        // Global visual identity for active/inactive navigation states
        tabBarActiveTintColor: '#0ea5e9', // Sky 500
        tabBarInactiveTintColor: '#64748b', // Slate 500
        tabBarLabelPosition: 'below-icon',

        // Global Header Styling
        headerStyle: {
          backgroundColor: '#020617', // Slate 950
          borderBottomWidth: 1,
          borderBottomColor: '#1e293b',
        },
        headerShadowVisible: false,
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },

        // Bottom Navigation Bar Configuration
        tabBarStyle: {
          backgroundColor: '#020617',
          borderTopColor: '#1e293b',
          paddingTop: 8,
          /**
           * Platform-Specific Heights:
           * iOS (88) is the standard for modern devices.
           * Android (72) is specifically tuned to prevent cropping of descenders 
           * (like the letter 'p' in "Speech").
           */
          height: Platform.OS === 'ios' ? 88 : 72, 
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          /**
           * Vertical alignment for text labels:
           * Android (10) lifts the label slightly to create a safety buffer 
           * between the text and the bottom of the device screen.
           */
          marginBottom: Platform.OS === 'ios' ? 0 : 10, 
        },
      }}
    >
      {/* Main dashboard for room-based controls */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Rooms',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <MaterialCommunityIcons
                name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
                size={26}
                color={color}
              />
            </View>
          ),
          // Connection status indicator in the top right
          headerRight: () => (
            <View className="flex-row items-center mr-4">
              <Link href="/modal" asChild>
                <Pressable hitSlop={20}>
                  {({ pressed }) => (
                    <MaterialCommunityIcons
                      name={isConnected ? 'shield-check' : 'shield-alert-outline'}
                      size={26}
                      color={isConnected ? '#22c55e' : '#ef4444'}
                      // NativeWind utility used for press interaction feedback
                      className={pressed ? 'opacity-60' : 'opacity-100'}
                    />
                  )}
                </Pressable>
              </Link>
            </View>
          ),
        }}
      />

      {/* Interface for Gemini AI interactions */}
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'robot' : 'robot-outline'} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />

      {/* Interface for Speech-to-Text command processing */}
      <Tabs.Screen
        name="speech"
        options={{
          title: 'Speech',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'microphone' : 'microphone-outline'} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />

      {/* High-level global status dashboard */}
      <Tabs.Screen
        name="house_hub"
        options={{
          title: 'House Hub',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'home-variant' : 'home-variant-outline'} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />

      {/**
       * Dynamic Room Details Route:
       * - href: null ensures this screen doesn't create a fifth tab icon.
       * - tabBarStyle: { display: 'none' } hides the bar for a focused detail view.
       */}
      <Tabs.Screen
        name="[room]"
        options={{
          href: null,
          headerTitle: 'Room Details',
          tabBarStyle: { display: 'none' },
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={25}
              className="ml-4"
            >
              <MaterialCommunityIcons name="chevron-left" size={34} color="#0ea5e9" />
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}