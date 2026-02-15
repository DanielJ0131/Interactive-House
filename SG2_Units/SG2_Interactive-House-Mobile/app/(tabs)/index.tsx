import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import houseConfig from '../../data/house-config.json';
import roomConfig from '../../data/rooms-config.json';

export default function RoomsScreen() {
  const router = useRouter();
  const rooms = roomConfig.rooms;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="mb-8 mt-4">
          <Text className="text-white text-4xl font-extrabold tracking-tight">Rooms</Text>
          <Text className="text-slate-500 text-lg font-medium">Manage by area</Text>
        </View>

        <View className="flex-row flex-wrap justify-between">
          {rooms.map((room) => {
            const actualRoomData = houseConfig.rooms.find(r => r.id === room.id);
            const deviceCount = actualRoomData ? actualRoomData.devices.length : 0;

            return (
              <Pressable
                key={room.id}
                style={{ flexBasis: '48%' }}
                className="bg-slate-900 border border-slate-800 p-6 rounded-3xl mb-6 active:bg-slate-800"
                onPress={() => {
                  router.push(`/(tabs)/${room.id}`);
                }}
              >
                <View className="bg-sky-500/10 h-12 w-12 rounded-xl items-center justify-center mb-4">
                  <MaterialCommunityIcons name={room.icon as any} size={28} color="#0ea5e9" />
                </View>

                <Text className="text-white text-lg font-bold">{room.name}</Text>

                {/* Updated Pluralization Logic */}
                <Text className="text-slate-500 font-medium">
                  {deviceCount === 0 && "0 Devices"}
                  {deviceCount === 1 && "1 Device"}
                  {deviceCount > 1 && `${deviceCount} Devices`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}