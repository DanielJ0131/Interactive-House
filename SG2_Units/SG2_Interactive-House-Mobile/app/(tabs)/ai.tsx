import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList } from "react-native";

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
};

/**
 * AiScreen
 *
 * Placeholder screen for future AI integration.
 * This view is intended to handle:
 * - AI chat functionality
 * - Voice commands
 * - Smart device automation through AI
 *
 * At the moment, this screen only displays a basic message.
 * Full functionality will be implemented in later development stages.
 */
export default function AiScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `AI received: "${userMessage.text}"`,
        sender: "ai",
      };

      setMessages((prev) => [...prev, aiMessage]);
      setLoading(false);
    }, 1000);
  };

  return (
    <View className="flex-1 bg-gray-100">
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View
            className={`p-3 my-1 rounded-xl max-w-[80%] ${
              item.sender === "user"
                ? "self-end bg-blue-500"
                : "self-start bg-gray-300"
            }`}
          >
            <Text className="text-black">{item.text}</Text>
          </View>
        )}
      />

      {loading && (
        <Text className="text-center text-gray-500 italic mb-2">
          AI is typing...
        </Text>
      )}

      <View className="flex-row p-3 bg-white border-t border-gray-300">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask something..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
        />
        <TouchableOpacity
          onPress={handleSend}
          className="ml-2 bg-blue-500 px-4 justify-center rounded-lg"
        >
          <Text className="text-white font-bold">Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
