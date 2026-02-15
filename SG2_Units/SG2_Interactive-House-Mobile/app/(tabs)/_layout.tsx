import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

export default function TabLayout() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelPosition: 'below-icon',
        headerStyle: {
          backgroundColor: '#020617',
          borderBottomWidth: 1,
          borderBottomColor: '#1e293b',
          ...Platform.select({
            android: { elevation: 0 },
            ios: { shadowOpacity: 0 },
          }),
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
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Rooms',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons
                name={focused ? "view-dashboard" : "view-dashboard-outline"}
                size={28}
                color={color}
              />
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <Link href="/modal" asChild>
                <Pressable hitSlop={20}>
                  {({ pressed }) => (
                    <MaterialCommunityIcons
                      name={isConnected ? "shield-check" : "shield-alert-outline"}
                      size={26}
                      color={isConnected ? "#22c55e" : "#ef4444"}
                      style={{ opacity: pressed ? 0.6 : 1 }}
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
            <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons
                name={focused ? "robot" : "robot-outline"} // Focused vs Unfocused
                size={28}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="speech"
        options={{
          title: 'Speech',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons
                name={focused ? "microphone" : "microphone-outline"}
                size={28}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="house_hub"
        options={{
          title: 'House Hub',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons
                name={focused ? "home-variant" : "home-variant-outline"}
                size={28}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="[room]"
        options={{
          href: null,
          headerTitle: "Room Details",
          tabBarStyle: { display: 'none' },
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={25}
              style={{ marginLeft: 16 }}
            >
              <MaterialCommunityIcons name="chevron-left" size={34} color="#0ea5e9" />
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}