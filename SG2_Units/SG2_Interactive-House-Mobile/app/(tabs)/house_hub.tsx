import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import initialData from '../../data/house-config.json';

export default function HomeScreen() {
  const [rooms, setRooms] = useState(initialData.rooms);
  const [brewingStatus, setBrewingStatus] = useState<{ [key: string]: number }>({});

  const getDeviceIconDetails = (type: string, state: string, deviceId: string) => {
    const isBrewing = brewingStatus[deviceId] > 0;
    const isActive = ['on', 'open'].includes(state) || isBrewing;

    switch (type) {
      case 'light':
        return { name: isActive ? "lightbulb" : "lightbulb-outline", color: isActive ? "#fbbf24" : "#64748b" };
      case 'window':
        return { name: isActive ? "window-open-variant" : "window-closed-variant", color: isActive ? "#0ea5e9" : "#64748b" };
      case 'door':
        return { name: isActive ? "door-open" : "door-closed", color: isActive ? "#0ea5e9" : "#64748b" };
      case 'coffee_machine':
        return { name: "coffee", color: isBrewing ? "#a855f7" : "#64748b" };
      default:
        return { name: "help-circle-outline", color: "#64748b" };
    }
  };

  const handleBrew = (deviceId: string) => {
    if (brewingStatus[deviceId] > 0) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setBrewingStatus(prev => ({ ...prev, [deviceId]: progress }));

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setBrewingStatus(prev => ({ ...prev, [deviceId]: 0 }));
        }, 2000);
      }
    }, 300);
  };

  const toggleDevice = (roomId: string, deviceId: string) => {
    setRooms((currentRooms) =>
      currentRooms.map((room) => {
        if (room.id !== roomId) return room;
        return {
          ...room,
          devices: room.devices.map((d) => {
            if (d.id === deviceId) {
              const isOnOff = ['light', 'coffee_machine'].includes(d.type);
              const newState = isOnOff 
                ? (d.state === 'on' ? 'off' : 'on') 
                : (d.state === 'open' ? 'closed' : 'open');
              return { ...d, state: newState };
            }
            return d;
          }),
        };
      })
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} className="bg-slate-950">
        <View className="mb-8 mt-4">
          <Text className="text-white text-4xl font-extrabold tracking-tight">House Hub</Text>
          <Text className="text-slate-500 text-lg font-medium">Global Control Center</Text>
        </View>

        {rooms.map((room) => (
          <View key={room.id} className="mb-8">
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 ml-2">
              {room.name}
            </Text>
            
            {room.devices.map((device) => {
              const isCoffee = device.type === 'coffee_machine';
              const progress = brewingStatus[device.id] || 0;
              const isActive = isCoffee ? progress > 0 : ['on', 'open'].includes(device.state);
              const icon = getDeviceIconDetails(device.type, device.state, device.id);

              return (
                <View key={device.id} className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl mb-3 shadow-sm">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                      <View className={`h-14 w-14 rounded-2xl items-center justify-center mr-4 ${
                        isActive ? (isCoffee ? 'bg-purple-500/10' : 'bg-sky-500/10') : 'bg-slate-800/50'
                      }`}>
                        <MaterialCommunityIcons name={icon.name as any} size={28} color={icon.color} />
                      </View>
                      
                      <View>
                        <Text className="text-white text-xl font-semibold">{device.label}</Text>
                        <Text className={`capitalize font-bold mt-1 ${
                          isCoffee && progress > 0 ? 'text-purple-400' : (isActive ? 'text-sky-400' : 'text-slate-500')
                        }`}>
                          {isCoffee ? (progress > 0 ? `Brewing ${progress}%` : 'Ready') : device.state}
                        </Text>
                      </View>
                    </View>
                    
                    {isCoffee ? (
                      <Pressable 
                        onPress={() => handleBrew(device.id)}
                        className={`px-4 py-2 rounded-xl ${progress > 0 ? 'bg-slate-800' : 'bg-purple-600'}`}
                      >
                        <Text className="text-white font-bold">{progress > 0 ? '...' : 'Brew'}</Text>
                      </Pressable>
                    ) : (
                      <Switch
                        value={isActive}
                        onValueChange={() => toggleDevice(room.id, device.id)}
                        trackColor={{ false: '#1e293b', true: '#0ea5e9' }}
                        thumbColor="white"
                      />
                    )}
                  </View>

                  {/* Progress Bar for Hub */}
                  {isCoffee && progress > 0 && (
                    <View className="w-full h-1.5 bg-slate-800 rounded-full mt-4 overflow-hidden">
                      <View style={{ width: `${progress}%` }} className="h-full bg-purple-500" />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}