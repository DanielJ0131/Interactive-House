import React, { useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Keyboard } from "react-native";

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
};

export default function AiScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const listRef = useRef<FlatList<Message>>(null);

  const scrollToBottom = () => {
    
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const pushMessage = (msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (loading) return;

    const baseUrl = process.env.EXPO_PUBLIC_API_URL;

    
    if (!baseUrl) {
      pushMessage({
        id: Date.now().toString(),
        text: "Missing EXPO_PUBLIC_API_URL. Add it in .env and restart Expo with: npx expo start -c",
        sender: "ai",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: "user",
    };

    pushMessage(userMessage);
    setInput("");
    setLoading(true);
    Keyboard.dismiss();
    scrollToBottom();

    try {
      const response = await fetch(`${baseUrl}/api/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage.text }),
      });


      const rawText = await response.text();

      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        // not JSON, keep data empty
      }

      if (!response.ok) {
        const errorMsg =
          data?.error ||
          rawText ||
          `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data?.reply ?? "No response from AI.",
        sender: "ai",
      };

      pushMessage(aiMessage);
      scrollToBottom();
    } catch (error: any) {
      pushMessage({
        id: (Date.now() + 1).toString(),
        text:
          error?.message ||
          "Could not reach AI backend. Make sure the server is running and on the same Wi-Fi.",
        sender: "ai",
      });
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#020617]">
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
        renderItem={({ item }) => (
          <View
            className={`my-1 max-w-[85%] ${
              item.sender === "user" ? "self-end" : "self-start"
            }`}
          >
            <View
              className={`px-4 py-3 rounded-3xl border ${
                item.sender === "user"
                  ? "bg-sky-500/20 border-sky-500/30"
                  : "bg-slate-900/50 border-slate-800"
              }`}
            >
              <Text
                className={`text-[15px] leading-5 ${
                  item.sender === "user" ? "text-white" : "text-slate-200"
                }`}
              >
                {item.text}
              </Text>
            </View>
          </View>
        )}
        onContentSizeChange={scrollToBottom}
      />

      {loading && (
        <Text className="text-center text-slate-500 italic mb-2">
          AI is typing...
        </Text>
      )}

      <View className="flex-row p-4 bg-[#020617] border-t border-slate-900">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask something..."
          placeholderTextColor="#64748b"
          className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl px-4 py-3 text-slate-200"
          editable={!loading}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={loading || !input.trim()}
          className={`ml-3 px-5 justify-center rounded-3xl border bg-sky-500/20 border-sky-500/30 ${
            loading || !input.trim() ? "opacity-40" : "active:opacity-70"
          }`}
        >
          <Text className="text-sky-400 font-bold">
            {loading ? "..." : "Send"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}