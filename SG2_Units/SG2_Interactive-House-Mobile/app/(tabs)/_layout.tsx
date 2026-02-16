import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { cssInterop } from 'nativewind';

cssInterop(MaterialCommunityIcons, {
  className: 'style',
});

export default function TabLayout() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#64748b',
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',

        headerStyle: {
          backgroundColor: '#020617',
          borderBottomWidth: 1,
          borderBottomColor: '#1e293b',
        },
        headerShadowVisible: false,
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },

        tabBarStyle: {
          backgroundColor: '#020617',
          borderTopColor: '#1e293b',
          height: Platform.OS === 'ios' ? 88 : 75,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12, 
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: Platform.OS === 'android' ? 5 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Devices',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'developer-board' : 'developer-board'}
              size={26}
              color={color}
            />
          ),
          headerRight: () => (
            <View className="flex-row items-center mr-4">
              <Link href="/modal" asChild>
                <Pressable hitSlop={20}>
                  {({ pressed }) => (
                    <MaterialCommunityIcons
                      name={isConnected ? 'shield-check' : 'shield-alert-outline'}
                      size={26}
                      color={isConnected ? '#22c55e' : '#ef4444'}
                      className={pressed ? 'opacity-60' : 'opacity-100'}
                    />
                  )}
                </Pressable>
              </Link>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'robot-industrial' : 'robot-industrial-outline'} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="speech"
        options={{
          title: 'Speech',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'waveform' : 'waveform'} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="device_hub"
        options={{
          title: 'Hub',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'memory' : 'memory'} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />

      {/* This route handles individual device pages. 
          By defining headerLeft here, you don't need back buttons in [device].tsx 
      */}
      <Tabs.Screen
        name="[device]"
        options={{
          href: null,
          headerTitle: 'Component Specs',
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