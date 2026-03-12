/**
 * AribotLanding.tsx - Futuristic Agentic AI Assistant
 * 
 * =====================================================
 * ARIBOT - Full-Featured AI Landing Page for StrideIQ
 * =====================================================
 * 
 * FEATURES:
 * - Holographic animated SVG avatar (Expo-compatible, no three.js)
 * - Real-time chat with Anthropic Claude (primary AI)
 * - Camera integration for video recording
 * - Video upload to Supabase with AI analysis
 * - Real gait analysis results display (no demo fallback)
 * - TTS support via expo-speech
 * - Works on Web, Android, iOS
 * 
 * @author Arisole StrideIQ Team
 * @version 3.0.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
  Dimensions,
  Alert,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, RadialGradient, Stop, G, Ellipse } from 'react-native-svg';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';

// Import existing services and context
import { useAuth } from '../context/AuthContext';
import { chatWithClaude, GaitAnalysisResult } from '../services/aiService';
import { getUserAnalyses, GaitAnalysis } from '../services/supabase';
import { processVideoAnalysis, AnalysisMetadata } from '../services/videoAnalysis';

// =====================================================
// TYPES
// =====================================================

interface ChatMessage {
  id: string;
  sender: 'user' | 'aribot';
  text: string;
  timestamp?: Date;
  isError?: boolean;
  isProactive?: boolean;
}

interface AribotLandingProps {
  onNavigateToAnalysis?: () => void;
  onNavigateToHistory?: () => void;
}

// =====================================================
// CONSTANTS
// =====================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_SIZE = Math.min(SCREEN_WIDTH * 0.4, 160);

// =====================================================
// ANIMATED HOLOGRAPHIC AVATAR COMPONENT
// Note: Using SVG instead of @react-three/fiber for Expo compatibility
// =====================================================

function HolographicAvatar({ isThinking }: { isThinking: boolean }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Continuous pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Continuous rotation for orbital rings
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  // Enhanced glow when thinking
  useEffect(() => {
    if (isThinking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.2,
            duration: 400,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      glowAnim.stopAnimation();
      Animated.timing(glowAnim, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isThinking]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.05],
  });

  const outerRingScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const innerOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  return (
    <View style={styles.avatarWrapper}>
      {/* Outer glow rings */}
      <Animated.View
        style={[
          styles.outerRing,
          {
            transform: [{ scale: outerRingScale }],
            opacity: glowAnim,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.middleRing,
          {
            transform: [{ scale }],
            opacity: innerOpacity,
          },
        ]}
      />

      {/* Main avatar SVG - Futuristic sphere with orbital rings */}
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={AVATAR_SIZE} height={AVATAR_SIZE} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#00FFFF" stopOpacity="0.95" />
              <Stop offset="40%" stopColor="#00CED1" stopOpacity="0.7" />
              <Stop offset="80%" stopColor="#008B8B" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#006666" stopOpacity="0.1" />
            </RadialGradient>
            <RadialGradient id="innerGlow" cx="50%" cy="35%" r="50%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#00FFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Core sphere */}
          <Circle cx="100" cy="100" r="55" fill="url(#coreGradient)" />
          
          {/* Inner highlight */}
          <Ellipse cx="85" cy="80" rx="22" ry="18" fill="url(#innerGlow)" />
          
          {/* Orbital rings - simulating 3D sphere */}
          <G opacity="0.7">
            <Ellipse
              cx="100"
              cy="100"
              rx="70"
              ry="18"
              fill="none"
              stroke="#00FFFF"
              strokeWidth="1.5"
              strokeDasharray="6,4"
            />
          </G>
          <G opacity="0.5" transform="rotate(55, 100, 100)">
            <Ellipse
              cx="100"
              cy="100"
              rx="75"
              ry="22"
              fill="none"
              stroke="#00CED1"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          </G>
          <G opacity="0.4" transform="rotate(-40, 100, 100)">
            <Ellipse
              cx="100"
              cy="100"
              rx="80"
              ry="14"
              fill="none"
              stroke="#20B2AA"
              strokeWidth="1"
            />
          </G>

          {/* Eye/Core indicator */}
          <Circle cx="100" cy="100" r="18" fill="#00FFFF" opacity="0.9" />
          <Circle cx="100" cy="100" r="10" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="104" cy="96" r="4" fill="#00FFFF" opacity="0.8" />
        </Svg>
      </Animated.View>

      {/* Status indicator */}
      {isThinking && (
        <View style={styles.thinkingIndicator}>
          <ActivityIndicator size="small" color="#00FFFF" />
          <Text style={styles.thinkingText}>Processing...</Text>
        </View>
      )}
    </View>
  );
}

// =====================================================
// CAMERA MODAL COMPONENT
// =====================================================

function CameraModal({
  visible,
  onClose,
  onVideoRecorded,
}: {
  visible: boolean;
  onClose: () => void;
  onVideoRecorded: (uri: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible]);

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    
    setIsRecording(true);
    setRecordingDuration(0);
    
    // Start duration timer
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);

    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration: 30, // Max 30 seconds
      });
      
      if (result?.uri) {
        onVideoRecorded(result.uri);
      }
    } catch (error) {
      console.error('[Camera] Recording error:', error);
      Alert.alert('Recording Error', 'Failed to record video. Please try again.');
    } finally {
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  const toggleFacing = () => {
    setFacing(prev => (prev === 'back' ? 'front' : 'back'));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  if (!permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.cameraPermissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#00FFFF" />
          <Text style={styles.cameraPermissionText}>
            Camera permission is required to record gait analysis videos.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          mode="video"
        >
          {/* Camera overlay UI */}
          <SafeAreaView style={styles.cameraOverlay}>
            {/* Top bar */}
            <View style={styles.cameraTopBar}>
              <TouchableOpacity onPress={onClose} style={styles.cameraButton}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
              
              {isRecording && (
                <View style={styles.recordingBadge}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
                </View>
              )}
              
              <TouchableOpacity onPress={toggleFacing} style={styles.cameraButton}>
                <Ionicons name="camera-reverse-outline" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Instructions */}
            <View style={styles.cameraInstructions}>
              <Text style={styles.instructionText}>
                {isRecording 
                  ? 'Recording... Walk naturally for best results'
                  : 'Position yourself so your full body is visible while walking'}
              </Text>
            </View>

            {/* Bottom controls */}
            <View style={styles.cameraBottomBar}>
              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? (
                  <View style={styles.stopIcon} />
                ) : (
                  <View style={styles.recordIcon} />
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    </Modal>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export const AribotLanding: React.FC<AribotLandingProps> = ({
  onNavigateToAnalysis,
  onNavigateToHistory,
}) => {
  const { user, isFallbackMode } = useAuth();
  const isAuthenticated = !!user;
  const flatListRef = useRef<FlatList>(null);

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [analysisResult, setAnalysisResult] = useState<GaitAnalysis | null>(null);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);

  // =====================================================
  // FETCH USER'S LATEST ANALYSIS
  // =====================================================

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchUserAnalysis();
    }
  }, [isAuthenticated, user?.id]);

  const fetchUserAnalysis = async () => {
    if (!user?.id) return;

    try {
      console.log('[Aribot] Fetching user analyses...');
      const analyses = await getUserAnalyses(user.id);
      
      if (analyses && analyses.length > 0) {
        const latestAnalysis = analyses[0];
        setAnalysisResult(latestAnalysis);
        console.log('[Aribot] Latest analysis score:', latestAnalysis.gait_score);
        
        // Generate proactive greeting based on analysis
        generateProactiveGreeting(latestAnalysis);
      } else {
        // No analyses - show onboarding message
        addAribotMessage(
          "Welcome! I'm Aribot, your AI fitness companion powered by Claude. I don't see any gait analyses yet. Tap the camera button below to record your first walking video and I'll provide personalized insights!",
          true
        );
      }
    } catch (error) {
      console.error('[Aribot] Error fetching analyses:', error);
      addAribotMessage(
        "Hello! I'm Aribot, ready to help with your fitness journey. Record a video or ask me any questions about gait analysis!",
        true
      );
    }
  };

  // =====================================================
  // PROACTIVE AI GREETING
  // =====================================================

  const generateProactiveGreeting = async (analysis: GaitAnalysis) => {
    try {
      const context = `
User's latest gait analysis results:
- Gait Score: ${analysis.gait_score ?? 'N/A'}/100
- Foot Strike Pattern: ${analysis.foot_strike ?? 'unknown'}
- Cadence: ${analysis.cadence ?? 'N/A'} steps/min
- Stride Length: ${analysis.stride_length ?? 'N/A'}m
- Pelvic Drop: ${analysis.pelvic_drop ?? 'N/A'}°
- Ground Contact Time: ${analysis.ground_contact_time ?? 'N/A'}ms
${analysis.ai_feedback ? `- Previous AI Feedback: ${analysis.ai_feedback.substring(0, 200)}...` : ''}
      `.trim();

      const response = await chatWithClaude(
        `Based on this user's gait data, provide a brief (under 40 words), encouraging, personalized greeting with ONE specific actionable tip. Be conversational and friendly:\n\n${context}`
      );

      const userName = user?.email ? user.email.split('@')[0] : '';
      addAribotMessage(
        `Hey${userName ? ` ${userName}` : ''}! 👋 ${response}`,
        true
      );
    } catch (error) {
      console.error('[Aribot] Proactive greeting error:', error);
      // Fallback greeting with score
      const score = analysis.gait_score;
      if (score) {
        addAribotMessage(
          `Welcome back! Your latest gait score is ${score}/100. Ask me anything about improving your results!`,
          true
        );
      } else {
        addAribotMessage(
          "Hello! I'm Aribot, your AI fitness assistant. Ask me about gait analysis, exercises, or record a new video!",
          true
        );
      }
    }
  };

  // =====================================================
  // MESSAGE MANAGEMENT
  // =====================================================

  const addAribotMessage = (text: string, isProactive = false) => {
    const message: ChatMessage = {
      id: `aribot-${Date.now()}`,
      sender: 'aribot',
      text,
      timestamp: new Date(),
      isProactive,
    };
    setMessages(prev => [...prev, message]);

    // TTS if enabled
    if (isTTSEnabled) {
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.1,
        rate: 0.95,
      });
    }

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addUserMessage = (text: string) => {
    const message: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  const addErrorMessage = (text: string) => {
    const message: ChatMessage = {
      id: `error-${Date.now()}`,
      sender: 'aribot',
      text,
      timestamp: new Date(),
      isError: true,
    };
    setMessages(prev => [...prev, message]);
  };

  // =====================================================
  // CHAT WITH CLAUDE
  // =====================================================

  const sendMessage = useCallback(async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isLoading) return;

    addUserMessage(trimmedInput);
    setInputText('');
    setIsLoading(true);

    try {
      // Build context with user's analysis data
      let contextMessage = trimmedInput;
      if (analysisResult) {
        contextMessage = `
[User's Latest Gait Analysis Data]
- Score: ${analysisResult.gait_score ?? 'N/A'}/100
- Foot Strike: ${analysisResult.foot_strike ?? 'unknown'}
- Cadence: ${analysisResult.cadence ?? 'N/A'} steps/min
- Stride Length: ${analysisResult.stride_length ?? 'N/A'}m

[User's Question/Message]
${trimmedInput}
        `.trim();
      }

      // Get conversation history for context (last 8 messages)
      const conversationHistory = messages
        .filter(m => !m.isProactive && !m.isError)
        .slice(-8)
        .map(m => ({
          role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.text,
        }));

      const response = await chatWithClaude(contextMessage, conversationHistory);
      addAribotMessage(response);
    } catch (error) {
      console.error('[Aribot] Chat error:', error);
      addErrorMessage(
        error instanceof Error
          ? `I encountered an issue: ${error.message}`
          : "Sorry, I couldn't process that. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, analysisResult, messages]);

  // =====================================================
  // VIDEO UPLOAD & AI ANALYSIS
  // =====================================================

  const handleVideoRecorded = async (uri: string) => {
    setIsCameraOpen(false);
    
    console.log('[Aribot] Video recorded, checking auth...');
    console.log('[Aribot] isAuthenticated:', isAuthenticated);
    console.log('[Aribot] user:', user ? { id: user.id, email: user.email } : 'null');
    
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Authentication Required',
        'Please sign in to upload and analyze videos.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsUploading(true);
    addAribotMessage("📹 Great! I received your video. Uploading to cloud...");

    try {
      const metadata: AnalysisMetadata = {
        video_type: 'walking',
        surface_type: 'indoor',
      };

      const analysis = await processVideoAnalysis(
        uri,
        metadata,
        (status, progress) => {
          setUploadProgress(status);
          console.log(`[Aribot] ${status} (${progress}%)`);
        }
      );

      if (analysis) {
        setAnalysisResult(analysis);
        
        // Generate AI response about the analysis
        const analysisMessage = `
✅ **Video Analysis Complete!**

**Gait Score: ${analysis.gait_score ?? '--'}/100**

Key Metrics:
• Foot Strike: ${analysis.foot_strike ?? 'N/A'}
• Cadence: ${analysis.cadence ?? 'N/A'} steps/min
• Stride Length: ${analysis.stride_length?.toFixed(2) ?? 'N/A'}m
• Ground Contact: ${analysis.ground_contact_time ?? 'N/A'}ms

${analysis.ai_feedback ? `\n💡 **Insights:** ${analysis.ai_feedback.substring(0, 300)}...` : ''}

Ask me any questions about your results or how to improve!
        `.trim();

        addAribotMessage(analysisMessage);
      } else {
        addErrorMessage("Analysis couldn't be completed. Please try recording again with better lighting.");
      }
    } catch (error: any) {
      console.error('[Aribot] Video analysis error:', error);
      
      // Provide specific error messages based on the error type
      let errorMsg = "Video analysis failed. Please try again.";
      
      if (error.message?.includes('No active Supabase session')) {
        errorMsg = "⚠️ Session expired. Please sign out and sign back in, then try again.";
      } else if (error.message?.includes('RLS') || error.message?.includes('policy')) {
        errorMsg = "⚠️ Storage access error. Please contact support.";
      } else if (error.message?.includes('Upload failed')) {
        errorMsg = `Upload failed: ${error.message}`;
      } else if (error.message) {
        errorMsg = `Analysis failed: ${error.message}`;
      }
      
      addErrorMessage(errorMsg);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  // =====================================================
  // QUICK ACTIONS
  // =====================================================

  const quickActions = [
    {
      label: 'Explain Score',
      icon: 'analytics-outline' as const,
      prompt: 'Can you explain what my gait score means and what factors affect it?',
    },
    {
      label: 'Exercises',
      icon: 'fitness-outline' as const,
      prompt: 'What exercises can help improve my gait based on my analysis?',
    },
    {
      label: 'Injury Tips',
      icon: 'shield-checkmark-outline' as const,
      prompt: 'Based on my gait, what should I watch out for to prevent injuries?',
    },
  ];

  const handleQuickAction = (prompt: string) => {
    setInputText(prompt);
  };

  // =====================================================
  // RENDER MESSAGE ITEM
  // =====================================================

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.botBubble,
        item.isError && styles.errorBubble,
      ]}>
        {!isUser && (
          <View style={styles.aribotLabel}>
            <Ionicons name="sparkles" size={12} color="#00ffcc" />
            <Text style={styles.aribotLabelText}>Aribot</Text>
          </View>
        )}
        <Text style={isUser ? styles.userText : styles.botText}>{item.text}</Text>
      </View>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <LinearGradient colors={['#0F111A', '#151829', '#0F111A']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Aribot</Text>
            <Text style={styles.headerSubtitle}>AI Fitness Assistant</Text>
          </View>
          <TouchableOpacity
            style={styles.ttsButton}
            onPress={() => setIsTTSEnabled(!isTTSEnabled)}
          >
            <Ionicons
              name={isTTSEnabled ? 'volume-high' : 'volume-mute'}
              size={22}
              color={isTTSEnabled ? '#00FFFF' : '#666'}
            />
          </TouchableOpacity>
        </View>

        {/* Futuristic Avatar */}
        <View style={styles.avatarContainer}>
          <HolographicAvatar isThinking={isLoading || isUploading} />
          {isUploading && uploadProgress && (
            <Text style={styles.uploadProgressText}>{uploadProgress}</Text>
          )}
        </View>

        {/* Quick Actions (show when few messages) */}
        {messages.length <= 2 && (
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickActionButton}
                  onPress={() => handleQuickAction(action.prompt)}
                >
                  <Ionicons name={action.icon} size={16} color="#00ffcc" />
                  <Text style={styles.quickActionText}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Chat Display */}
        <FlatList
          ref={flatListRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#00ffcc" />
            <Text style={styles.loadingText}>Aribot is thinking...</Text>
          </View>
        )}

        {/* Chat Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Hint label when no messages */}
          {messages.length === 0 && (
            <View style={styles.inputHintContainer}>
              <Ionicons name="chatbubble-ellipses" size={16} color="#00ffcc" />
              <Text style={styles.inputHintText}>Type below to chat with Aribot</Text>
            </View>
          )}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.cameraIconButton}
              onPress={() => {
                if (isFallbackMode) {
                  Alert.alert(
                    'Video Analysis Unavailable',
                    'Video analysis requires full authentication.\n\n' +
                    'Please sign out and sign back in. If this persists, contact the app administrator.',
                    [{ text: 'OK' }]
                  );
                  return;
                }
                setIsCameraOpen(true);
              }}
              disabled={isUploading}
            >
              <Ionicons name="videocam" size={24} color={isFallbackMode ? '#666' : '#00ffcc'} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              placeholder="💬 Ask Aribot anything..."
              placeholderTextColor="#00ffcc80"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isLoading && !isUploading}
              onSubmitEditing={sendMessage}
            />
            
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Text style={[styles.sendButtonText, (!inputText.trim() || isLoading) && styles.sendButtonTextDisabled]}>
                Send
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Action Buttons */}
          {(onNavigateToAnalysis || onNavigateToHistory) && (
            <View style={styles.bottomActions}>
              {onNavigateToAnalysis && (
                <TouchableOpacity style={styles.bottomActionButton} onPress={onNavigateToAnalysis}>
                  <Ionicons name="analytics" size={18} color="#00ffcc" />
                  <Text style={styles.bottomActionText}>View Analysis</Text>
                </TouchableOpacity>
              )}
              {onNavigateToHistory && (
                <TouchableOpacity style={styles.bottomActionButton} onPress={onNavigateToHistory}>
                  <Ionicons name="time-outline" size={18} color="#00ffcc" />
                  <Text style={styles.bottomActionText}>History</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </KeyboardAvoidingView>

        {/* Upload Progress Overlay */}
        {isUploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color="#00ffcc" />
            <Text style={styles.uploadOverlayText}>{uploadProgress || 'Processing...'}</Text>
          </View>
        )}

        {/* Camera Modal */}
        <CameraModal
          visible={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onVideoRecorded={handleVideoRecorded}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

// Default export for convenience
export default AribotLanding;

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ffcc',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  ttsButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,255,255,0.1)',
  },

  // Avatar
  avatarContainer: {
    height: AVATAR_SIZE + 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: AVATAR_SIZE + 50,
    height: AVATAR_SIZE + 50,
  },
  outerRing: {
    position: 'absolute',
    width: AVATAR_SIZE + 45,
    height: AVATAR_SIZE + 45,
    borderRadius: (AVATAR_SIZE + 45) / 2,
    borderWidth: 2,
    borderColor: 'rgba(0,255,255,0.3)',
    backgroundColor: 'rgba(0,255,255,0.05)',
  },
  middleRing: {
    position: 'absolute',
    width: AVATAR_SIZE + 25,
    height: AVATAR_SIZE + 25,
    borderRadius: (AVATAR_SIZE + 25) / 2,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.5)',
  },
  thinkingIndicator: {
    position: 'absolute',
    bottom: -25,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  thinkingText: {
    color: '#00ffcc',
    fontSize: 12,
    marginLeft: 6,
  },
  uploadProgressText: {
    color: '#00ffcc',
    fontSize: 12,
    marginTop: 10,
  },

  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  quickActionsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 4,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,255,204,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,255,204,0.3)',
  },
  quickActionText: {
    color: '#00ffcc',
    fontSize: 12,
    marginLeft: 6,
  },

  // Chat
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingBottom: 10,
  },
  messageBubble: {
    padding: 14,
    borderRadius: 16,
    marginVertical: 5,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: '#1E1E2F',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#28284A',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,255,204,0.2)',
  },
  errorBubble: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  aribotLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aribotLabelText: {
    color: '#00ffcc',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  userText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  botText: {
    color: '#E0E0E0',
    fontSize: 15,
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    color: '#00ffcc',
    fontSize: 13,
    marginLeft: 8,
  },

  // Input hint
  inputHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,255,204,0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,255,204,0.3)',
    gap: 8,
  },
  inputHintText: {
    color: '#00ffcc',
    fontSize: 13,
    fontWeight: '500',
  },

  // Input - Made more prominent
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(15,17,26,0.98)',
    alignItems: 'flex-end',
    borderTopWidth: 2,
    borderTopColor: '#00ffcc',
    shadowColor: '#00ffcc',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  cameraIconButton: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,255,204,0.15)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,255,204,0.3)',
  },
  input: {
    flex: 1,
    padding: 14,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: '#1a1a2e',
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
    maxHeight: 100,
    borderWidth: 2,
    borderColor: '#00ffcc',
    shadowColor: '#00ffcc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  sendButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#00ffcc',
  },
  sendButtonDisabled: {
    backgroundColor: '#1E1E2F',
  },
  sendButtonText: {
    color: '#0F111A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sendButtonTextDisabled: {
    color: '#666',
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    gap: 12,
  },
  bottomActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,255,204,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,204,0.2)',
  },
  bottomActionText: {
    color: '#00ffcc',
    fontSize: 12,
    marginLeft: 6,
  },

  // Upload Overlay
  uploadOverlay: {
    position: 'absolute',
    top: 220,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  uploadOverlayText: {
    color: '#00ffcc',
    fontSize: 14,
    marginTop: 10,
  },

  // Camera
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  cameraButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
    marginRight: 6,
  },
  recordingTime: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraInstructions: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionText: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cameraBottomBar: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonActive: {
    borderColor: '#EF4444',
  },
  recordIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
  },
  stopIcon: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },

  // Camera Permission
  cameraPermissionContainer: {
    flex: 1,
    backgroundColor: '#0F111A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  cameraPermissionText: {
    color: '#CCC',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionButton: {
    backgroundColor: '#00ffcc',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#0F111A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 15,
    padding: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
});
