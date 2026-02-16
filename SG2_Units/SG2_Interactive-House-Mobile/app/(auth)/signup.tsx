import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * SignupScreen
 * Allows new users to create an account with password validation.
 */
export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /**
   * Validates that passwords match and fields are filled
   */
  const handleSignup = (e: any) => {
    if (Platform.OS === 'web') e.currentTarget.blur();

    if (!name || !email || !password || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    router.replace('/(tabs)');
  };

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
          {/* THE FIX: Internal View handles the centering and padding */}
          <View className="flex-1 justify-center p-8">
            
            {/* Back Button */}
            <View className="mb-6 -ml-2">
              <Pressable 
                onPress={() => router.back()} 
                className="flex-row items-center p-2 active:opacity-60"
              >
                <MaterialCommunityIcons name="chevron-left" size={28} color="#0ea5e9" />
                <Text className="text-sky-500 font-bold text-lg">Back</Text>
              </Pressable>
            </View>

            <Text className="text-white text-4xl font-bold mb-2">Create Account</Text>
            <Text className="text-slate-500 mb-8">Start your smart home journey today.</Text>

            <View className="space-y-4">
              <TextInput
                placeholder="Full Name"
                placeholderTextColor="#475569"
                value={name}
                onChangeText={setName}
                className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl"
              />
              <TextInput
                placeholder="Email Address"
                placeholderTextColor="#475569"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl"
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#475569"
                value={password}
                onChangeText={setPassword}
                className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl"
                secureTextEntry
              />
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor="#475569"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl"
                secureTextEntry
              />

              <Pressable 
                onPress={handleSignup}
                className="bg-sky-500 p-5 rounded-2xl active:bg-sky-600 shadow-lg shadow-sky-500/20"
              >
                <Text className="text-white text-center font-bold text-lg">Create Account</Text>
              </Pressable>
            </View>

            <View className="flex-row justify-center mt-10">
              <Text className="text-slate-500">Already have an account? </Text>
              <Link href="/login" asChild>
                <Pressable>
                  <Text className="text-sky-400 font-bold">Sign In</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}