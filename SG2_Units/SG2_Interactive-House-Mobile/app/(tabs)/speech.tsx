import { View, Text } from 'react-native';
import React from 'react';

/**
 * SpeechScreen
 *
 * Placeholder screen for future speech recognition functionality.
 * This screen is planned to handle:
 * - Voice input from the user
 * - Speech-to-text processing
 * - Voice-based device control commands
 *
 * Currently, this screen only displays a temporary message
 * indicating that the feature is still under development.
 */
export default function SpeechScreen() {

  return (
    <View className="flex-1 items-center justify-center bg-white">

      {/* Screen Title */}
      <Text className="text-xl font-bold">
        Speech Recognition + Voice Commands
      </Text>

      {/* Development Status Message */}
      <Text className="text-gray-500">
        WORK IN PROGRESS
      </Text>

    </View>
  );
}
