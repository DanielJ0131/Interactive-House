import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router'; // Add this for navigation

export default function ModalScreen() {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <StatusBar style="light" />
      
      {/* --- GO BACK BUTTON --- */}
      <View className="absolute top-12 left-6 z-10">
        <Pressable 
          onPress={() => router.back()}
          className="bg-slate-900/80 border border-slate-800 p-3 rounded-full active:bg-slate-800"
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="white" />
        </Pressable>
      </View>
      
      <ScrollView 
        contentContainerStyle={{ padding: 24, paddingTop: 100 }} // Added padding for the back button
        bounces={false}
      >
        <View className="items-center mb-10 mt-4">
          <View className={`p-6 rounded-full mb-4 ${isConnected ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <MaterialCommunityIcons 
              name={isConnected ? "shield-check" : "shield-alert-outline"} 
              size={56} 
              color={isConnected ? "#22c55e" : "#ef4444"} 
            />
          </View>
          
          <Text className="text-white text-3xl font-extrabold text-center">System Status</Text>
          <Text className="text-slate-500 text-center text-lg mt-2">
            {isConnected ? "Your smart home is secure." : "System Offline."}
          </Text>
        </View>

        <View className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl mb-6">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-white text-lg font-bold">Supabase</Text>
              <Text className="text-slate-500 text-sm">Realtime Database</Text>
            </View>
            
            <View className={`px-4 py-1.5 rounded-full border ${
              isConnected ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
            }`}>
              <Text className={`font-bold text-xs uppercase tracking-widest ${
                isConnected ? 'text-green-500' : 'text-red-500'
              }`}>
                {isConnected ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          <View className="h-[1px] bg-slate-800 mb-6" />
          
          <View className="flex-row justify-between items-center">
            <Text className="text-slate-300 text-base">Active Connections</Text>
            <Text className={`font-mono font-bold text-lg ${isConnected ? 'text-white' : 'text-slate-500'}`}>
              {isConnected ? '1' : '0'}
            </Text>
          </View>
        </View>
        
        <Pressable 
          onPress={() => setIsConnected(!isConnected)}
          className="mt-4 p-4 bg-slate-800 rounded-2xl items-center active:bg-slate-700"
        >
          <Text className="text-slate-400 font-bold">Simulate Connection Toggle</Text>
        </Pressable>
      </ScrollView>

      <View className="pb-8">
        <Text className="text-slate-700 text-center text-xs font-bold tracking-tighter uppercase">
          Interactive House Mobile • v1.0.0
        </Text>
      </View>
    </View>
  );
}