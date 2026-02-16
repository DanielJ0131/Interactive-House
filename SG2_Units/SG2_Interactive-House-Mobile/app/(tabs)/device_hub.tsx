import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useMemo } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import deviceConfig from '../../data/devices-config.json';

export default function DeviceHubScreen() {
  // Use your new device-centric JSON
  const allDevices = deviceConfig.devices;

  // Local state for toggles and simulated sensor values
  const [deviceStates, setDeviceStates] = useState<{ [key: string]: boolean }>({});
  
  // Categorize devices for the Hub layout
  const actuators = useMemo(() => 
    allDevices.filter(d => ['led_yellow', 'led_white', 'fan', 'relay', 'buzzer', 'servo_door', 'servo_window'].includes(d.id)), 
    [allDevices]
  );
  
  const sensors = useMemo(() => 
    allDevices.filter(d => ['pir', 'gas', 'photocell', 'soil', 'steam', 'button1', 'button2'].includes(d.id)), 
    [allDevices]
  );

  const toggleDevice = (id: string) => {
    setDeviceStates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        
        {/* Header */}
        <View className="mb-8 mt-4">
          <Text className="text-white text-4xl font-extrabold tracking-tight">Device Hub</Text>
          <Text className="text-slate-500 text-lg font-medium">System Control Center</Text>
        </View>

        {/* --- SECTION 1: ACTUATORS (CONTROL) --- */}
        <Text className="text-sky-500 text-xs font-black uppercase tracking-[2px] mb-4 ml-2">
          Active Controls
        </Text>
        
        {actuators.map((device) => (
          <View key={device.id} className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl mb-3">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <View className={`h-12 w-12 rounded-2xl items-center justify-center mr-4 ${deviceStates[device.id] ? 'bg-sky-500/10' : 'bg-slate-800/40'}`}>
                  <MaterialCommunityIcons 
                    name={device.icon as any} 
                    size={24} 
                    color={deviceStates[device.id] ? '#0ea5e9' : '#475569'} 
                  />
                </View>
                <View>
                  <Text className="text-white text-lg font-bold">{device.name}</Text>
                  <Text className="text-slate-500 text-xs font-mono">{device.pin}</Text>
                </View>
              </View>
              <Switch
                value={deviceStates[device.id] || false}
                onValueChange={() => toggleDevice(device.id)}
                trackColor={{ false: '#1e293b', true: '#0ea5e9' }}
                thumbColor="white"
              />
            </View>
          </View>
        ))}

        {/* --- SECTION 2: SENSORS (MONITORING) --- */}
        <Text className="text-purple-500 text-xs font-black uppercase tracking-[2px] mt-8 mb-4 ml-2">
          Environmental Sensors
        </Text>

        <View className="flex-row flex-wrap justify-between">
          {sensors.map((device) => (
            <View key={device.id} style={{ flexBasis: '48%' }} className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl mb-4">
              <View className="h-10 w-10 rounded-xl bg-purple-500/10 items-center justify-center mb-3">
                <MaterialCommunityIcons name={device.icon as any} size={20} color="#a855f7" />
              </View>
              <Text className="text-white font-bold" numberOfLines={1}>{device.name}</Text>
              <Text className="text-slate-500 text-xs font-mono mt-1">{device.pin}</Text>
              
              {/* Simulated Data Badge */}
              <View className="mt-4 bg-slate-800/50 self-start px-2 py-1 rounded-md">
                <Text className="text-purple-400 font-bold text-[10px]">MONITORING</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}