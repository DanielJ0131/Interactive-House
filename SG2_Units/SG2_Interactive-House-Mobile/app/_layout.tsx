import { MaterialCommunityIcons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router'; // Added useRouter
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable, StatusBar } from 'react-native'; // Added Pressable
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "../global.css";

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    ...MaterialCommunityIcons.font, 
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <RootLayoutNav />
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const router = useRouter();

  return (
    <ThemeProvider value={DarkTheme}> 
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: '#020617' }, 
          animation: 'none', 
          headerStyle: { backgroundColor: '#020617' },
          headerTintColor: '#fff',
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'modal',
            headerTitle: "System Status",
            headerLeft: () => (
              <Pressable 
                onPress={() => router.back()} 
                hitSlop={25} 
                style={{ marginLeft: 0 }}
              >
                <MaterialCommunityIcons name="chevron-left" size={32} color="#0ea5e9" />
              </Pressable>
            ),
            gestureEnabled: false, 
          }} 
        />
        

      </Stack>
    </ThemeProvider>
  );
}