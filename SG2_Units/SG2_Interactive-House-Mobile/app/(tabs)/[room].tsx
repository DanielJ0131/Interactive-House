import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import initialData from '../../data/house-config.json';

export default function RoomDetailScreen() {
  const { room } = useLocalSearchParams();
  const roomSlug = typeof room === 'string' ? room : '';

  const roomData = useMemo(() => initialData.rooms.find((r) => r.id === roomSlug), [roomSlug]);
  const displayName = roomData?.name || roomSlug.replace(/-/g, ' ');

  const [devices, setDevices] = useState(roomData?.devices || []);
  const [brewingStatus, setBrewingStatus] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    setDevices(roomData?.devices || []);
  }, [roomData]);

  const getDeviceIconDetails = (device: any) => {
    const isActive = ['on', 'open'].includes(device.state);
    const progress = brewingStatus[device.id] || 0;

    switch (device.type) {
      case 'light': return { name: isActive ? "lightbulb" : "lightbulb-outline", color: isActive ? "#fbbf24" : "#64748b" };
      case 'window': return { name: isActive ? "window-open-variant" : "window-closed-variant", color: isActive ? "#0ea5e9" : "#64748b" };
      case 'door': return { name: isActive ? "door-open" : "door-closed", color: isActive ? "#0ea5e9" : "#64748b" };
      case 'coffee_machine': return { name: "coffee", color: progress > 0 ? "#a855f7" : "#64748b" };
      default: return { name: "help-circle-outline", color: "#64748b" };
    }
  };

  const startBrewing = (id: string) => {
    if (brewingStatus[id] > 0) return;
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setBrewingStatus(prev => ({ ...prev, [id]: progress }));
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => setBrewingStatus(prev => ({ ...prev, [id]: 0 })), 2000);
      }
    }, 200);
  };

  const toggleDevice = (id: string) => {
    setDevices(current => current.map(d => {
      if (d.id === id) {
        const isLight = d.type === 'light';
        const newState = isLight ? (d.state === 'on' ? 'off' : 'on') : (d.state === 'open' ? 'closed' : 'open');
        return { ...d, state: newState };
      }
      return d;
    }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="mb-8">
          <Text className="text-white text-4xl font-extrabold">{displayName}</Text>
          <Text className="text-slate-500 text-lg">
            {devices.length === 0
              ? "No devices connected"
              : `${devices.length} Device${devices.length !== 1 ? 's' : ''} Connected`}
          </Text>
        </View>

        {devices.length > 0 ? (
          devices.map((device) => {
            const isCoffee = device.type === 'coffee_machine';
            const progress = brewingStatus[device.id] || 0;
            const isBrewing = progress > 0;
            const isActive = isCoffee ? isBrewing : ['on', 'open'].includes(device.state);
            const icon = getDeviceIconDetails(device);

            return (
              <View key={device.id} className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl mb-4">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <View className={`h-14 w-14 rounded-2xl items-center justify-center mr-4 ${isActive ? 'bg-sky-500/10' : 'bg-slate-800/50'}`}>
                      <MaterialCommunityIcons name={icon.name as any} size={30} color={icon.color} />
                    </View>
                    <View>
                      <Text className="text-white text-xl font-semibold">{device.label}</Text>
                      <Text className={`font-bold mt-1 ${isActive ? (isCoffee ? 'text-purple-400' : 'text-sky-400') : 'text-slate-500'}`}>
                        {isCoffee ? (isBrewing ? `Brewing ${progress}%` : 'Ready') : device.state}
                      </Text>
                    </View>
                  </View>

                  {isCoffee ? (
                    <Pressable
                      onPress={() => startBrewing(device.id)}
                      className={`px-4 py-2 rounded-xl ${isBrewing ? 'bg-slate-800' : 'bg-purple-600'}`}
                    >
                      <Text className="text-white font-bold">{isBrewing ? '...' : 'Brew'}</Text>
                    </Pressable>
                  ) : (
                    <Switch
                      value={isActive}
                      onValueChange={() => toggleDevice(device.id)}
                      trackColor={{ false: '#1e293b', true: '#0ea5e9' }}
                      thumbColor="white"
                    />
                  )}
                </View>

                {isCoffee && isBrewing && (
                  <View className="w-full h-2 bg-slate-800 rounded-full mt-6 overflow-hidden">
                    <View style={{ width: `${progress}%` }} className="h-full bg-purple-500" />
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View className="items-center justify-center mt-20 opacity-40">
            <MaterialCommunityIcons name="remote-off" size={80} color="#64748b" />
            <Text className="text-slate-400 text-center text-xl font-medium mt-4">
              This room is empty
            </Text>
            <Text className="text-slate-600 text-center mt-2">
              No smart devices found in this area.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}