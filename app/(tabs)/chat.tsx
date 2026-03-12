/**
 * ChatScreen - AI-powered fitness and gait analysis assistant
 * 
 * This screen provides a chat interface where users can ask questions about:
 * - Gait analysis results
 * - How to improve walking/running form
 * - Injury prevention
 * - General fitness questions
 * 
 * Uses Anthropic Claude as the AI backend via the chatWithClaude function.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { chatWithClaude } from '../../services/aiService';

// =====================================================
// Types
// =====================================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

// =====================================================
// Suggested Questions
// =====================================================

const SUGGESTED_QUESTIONS = [
  "What does my gait score mean?",
  "How can I improve my foot strike?",
  "What exercises help with hip stability?",
  "How do I prevent running injuries?",
  "What's the ideal cadence for walking?",
  "How can I reduce pelvic drop?",
];

// =====================================================
// Components
// =====================================================

function MessageBubble({ message, index }: { message: ChatMessage; index: number }) {
  const isUser = message.role === 'user';
  
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(300)}
      className={`mb-3 ${isUser ? 'items-end' : 'items-start'}`}
    >
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-arisole-orange'
            : message.isError
            ? 'bg-red-100'
            : 'bg-gray-100'
        }`}
      >
        <Text
          className={`text-base ${
            isUser
              ? 'text-white'
              : message.isError
              ? 'text-red-700'
              : 'text-gray-800'
          }`}
        >
          {message.content}
        </Text>
        <Text
          className={`text-xs mt-1 ${
            isUser ? 'text-white/70' : 'text-gray-400'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </Animated.View>
  );
}

function SuggestedQuestion({
  question,
  onPress,
}: {
  question: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-gray-200 rounded-full px-4 py-2 mr-2 mb-2 active:bg-gray-100"
    >
      <Text className="text-gray-700 text-sm">{question}</Text>
    </Pressable>
  );
}

// =====================================================
// Main Component
// =====================================================

export default function ChatScreen() {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hi${user?.email ? ` ${user.email.split('@')[0]}` : ''}! 👋 I'm your StrideIQ assistant. I can help you understand your gait analysis results, suggest exercises for improvement, and answer questions about fitness and injury prevention. What would you like to know?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Send message handler
  const handleSend = useCallback(async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;

    // Clear input and hide suggestions
    setInputText('');
    setShowSuggestions(false);
    Keyboard.dismiss();

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Get AI response
    setIsLoading(true);
    try {
      // Build conversation history for context
      const conversationHistory = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await chatWithClaude(messageText, conversationHistory);

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[Chat] Error:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error instanceof Error 
          ? `Sorry, I couldn't process that: ${error.message}` 
          : 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages]);

  // Handle suggested question tap
  const handleSuggestedQuestion = useCallback((question: string) => {
    handleSend(question);
  }, [handleSend]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#F26F05', '#FF8A3D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-5 py-4"
      >
        <Animated.View entering={FadeInUp.duration(500)}>
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
              <Ionicons name="chatbubbles" size={22} color="white" />
            </View>
            <View>
              <Text className="text-white text-xl font-bold">StrideIQ Assistant</Text>
              <Text className="text-white/80 text-sm">Ask me about fitness & gait</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message, index) => (
            <MessageBubble key={message.id} message={message} index={index} />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              className="items-start mb-3"
            >
              <View className="bg-gray-100 rounded-2xl px-4 py-3 flex-row items-center">
                <ActivityIndicator size="small" color="#F26F05" />
                <Text className="text-gray-500 ml-2">Thinking...</Text>
              </View>
            </Animated.View>
          )}

          {/* Suggested questions */}
          {showSuggestions && messages.length <= 1 && (
            <Animated.View
              entering={FadeInDown.delay(300).duration(400)}
              className="mt-4 mb-4"
            >
              <Text className="text-gray-500 text-sm mb-2">
                Try asking:
              </Text>
              <View className="flex-row flex-wrap">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <SuggestedQuestion
                    key={question}
                    question={question}
                    onPress={() => handleSuggestedQuestion(question)}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          {/* Bottom padding for keyboard */}
          <View className="h-24" />
        </ScrollView>

        {/* Input area */}
        <View className="border-t border-gray-200 bg-white px-4 py-3 pb-6">
          <View className="flex-row items-end">
            <TextInput
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-base max-h-24"
              placeholder="Ask about gait, fitness, or injuries..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={!isLoading}
              onSubmitEditing={() => handleSend()}
              blurOnSubmit={false}
            />
            <Pressable
              onPress={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              className={`ml-2 w-12 h-12 rounded-full items-center justify-center ${
                inputText.trim() && !isLoading
                  ? 'bg-arisole-orange'
                  : 'bg-gray-200'
              }`}
            >
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() && !isLoading ? 'white' : '#9CA3AF'}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
