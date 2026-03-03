import { Link, Stack } from 'expo-router';
import { Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#020617]">
      <StatusBar style="light" />
      <Stack.Screen options={{ title: 'Oops!', headerShown: false }} />

      <View className="flex-1 px-8 justify-between py-12">
        <View />

        <View className="items-center">
          <View className="bg-rose-500/10 p-6 rounded-[32px] mb-8">
            <MaterialCommunityIcons name="map-marker-off-outline" size={80} color="#f43f5e" />
          </View>

          <Text className="text-white text-4xl font-black tracking-tight text-center uppercase">
            Device Not Found
          </Text>

          <Text className="text-slate-400 text-lg text-center mt-4 leading-6">
            It looks like this part of the{"\n"}house doesn't exist yet.
          </Text>
        </View>

        <View>
          {/* Back Button */}
          <View className="items-center">
            <Pressable
              onPress={() => router.back()}
              className="flex-row items-center p-2 active:opacity-60"
            >
              <Text className="text-white bg-slate-900/80 border border-slate-800 p-3 rounded-full active:bg-slate-800"
              >Go Back</Text>
            </Pressable>
          </View>
        </View>

        <View className="items-center">
          <Text className="text-slate-700 text-[10px] uppercase tracking-[4px] font-black">
            Error 404 • Lost Connection
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}