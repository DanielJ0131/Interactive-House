import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { 
  ScrollView, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#020617' }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* THE FIX: Wrap content in a View to handle centering and padding correctly */}
          <View className="flex-1 justify-center p-8">
            
            {/* Header / Logo Section */}
            <View className="items-center mb-10">
              <View className="bg-sky-500/10 p-4 rounded-3xl mb-4">
                <MaterialCommunityIcons name="shield-home" size={60} color="#0ea5e9" />
              </View>
              <Text className="text-white text-3xl font-bold tracking-tight">Welcome Back</Text>
              <Text className="text-slate-500 text-lg mt-2">Sign in to control your home</Text>
            </View>

            {/* Input Section */}
            <View className="space-y-4">
              <View>
                <Text className="text-slate-400 mb-2 ml-1 font-medium">Email Address</Text>
                <TextInput
                  className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl"
                  placeholder="name@example.com"
                  placeholderTextColor="#475569"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View className="mt-4">
                <Text className="text-slate-400 mb-2 ml-1 font-medium">Password</Text>
                <TextInput
                  className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl"
                  placeholder="••••••••"
                  placeholderTextColor="#475569"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              className="bg-sky-500 p-4 rounded-2xl mt-8 items-center active:bg-sky-600"
              onPress={() => router.replace('/(tabs)/home')}
            >
              <Text className="text-white font-bold text-lg">Sign In</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View className="flex-row justify-center mt-6">
              <Text className="text-slate-500">Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text className="text-sky-500 font-bold">Sign Up</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}