import { View, Text, Pressable, StyleSheet, Alert, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, useMicrophonePermissions, CameraType } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';
import { processVideoAnalysis } from '../../services/videoAnalysis';
import { checkSession } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

const RECORDING_DURATION = 20;

export default function CameraScreen() {
  const router = useRouter();
  const { signInWithGoogle, user, isSigningIn } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(RECORDING_DURATION);
  
  // New states for preview and auth
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [cameraReady, setCameraReady] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const recordingRef = useRef<boolean>(false); // Track recording state without re-renders

  // Debug logger
  const log = (message: string) => {
    console.log(`[Camera] ${message}`);
    setDebugInfo(prev => `${message}\n${prev}`.slice(0, 500));
  };

  // Camera ready callback
  const onCameraReady = () => {
    log('Camera ready');
    setCameraReady(true);
  };
  
  const pulseScale = useSharedValue(1);
  const recordingProgress = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
      
      recordingProgress.value = withTiming(1, { 
        duration: RECORDING_DURATION * 1000,
        easing: Easing.linear,
      });
    } else {
      pulseScale.value = 1;
      recordingProgress.value = 0;
    }
  }, [isRecording]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Don't call stopRecording() here - recordAsync handles maxDuration automatically
            // This prevents double-stop race condition
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, countdown]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${recordingProgress.value * 100}%`,
  }));

  const requestAllPermissions = async (): Promise<boolean> => {
    log('Checking permissions...');
    
    // Check camera permission - use result directly, not state
    let cameraGranted = permission?.granted ?? false;
    if (!cameraGranted) {
      log('Requesting camera permission...');
      const camResult = await requestPermission();
      cameraGranted = camResult.granted;
      if (!cameraGranted) {
        log('Camera permission denied');
        Alert.alert('Permission Required', 'Camera access is needed for video recording.');
        return false;
      }
    }
    log(`Camera permission: granted`);
    
    // Check microphone permission - use result directly, not state
    let micGranted = micPermission?.granted ?? false;
    if (!micGranted) {
      log('Requesting microphone permission...');
      const micResult = await requestMicPermission();
      micGranted = micResult.granted;
      if (!micGranted) {
        log('Microphone permission denied');
        Alert.alert('Permission Required', 'Microphone access is needed for video recording.');
        return false;
      }
    }
    log(`Microphone permission: granted`);
    
    return true;
  };

  const startRecording = async () => {
    log('startRecording called');
    
    if (!cameraRef.current) {
      log('ERROR: Camera ref is null');
      return;
    }

    if (!cameraReady) {
      log('ERROR: Camera not ready yet');
      Alert.alert('Please Wait', 'Camera is still initializing. Try again in a moment.');
      return;
    }
    
    // Use ref to prevent race conditions with state updates
    if (recordingRef.current || isRecording) {
      log('Already recording, ignoring');
      return;
    }
    
    // Ensure all permissions before recording
    const hasPermissions = await requestAllPermissions();
    if (!hasPermissions) {
      log('Permissions not granted, aborting');
      return;
    }
    
    recordingRef.current = true;
    setIsRecording(true);
    setCountdown(RECORDING_DURATION);
    log('Starting video recording...');
    
    try {
      // Add video quality options for better Android MediaRecorder compatibility
      const video = await cameraRef.current.recordAsync({
        maxDuration: RECORDING_DURATION,
        // These options improve MediaRecorder stability on Android
        ...(Platform.OS === 'android' && {
          quality: '720p', // Use 720p for better compatibility
        }),
      });
      
      log(`Recording completed. URI: ${video?.uri ? 'received' : 'null'}`);
      recordingRef.current = false;
      setIsRecording(false);
      
      if (video?.uri) {
        handleVideoRecorded(video.uri);
      } else {
        log('ERROR: No video URI returned');
        setCountdown(RECORDING_DURATION);
      }
    } catch (error: any) {
      log(`Recording error: ${error?.message || error}`);
      console.error('Recording error:', error);
      Alert.alert('Recording Error', `Failed to record video: ${error?.message || 'Unknown error'}`);
      recordingRef.current = false;
      setIsRecording(false);
      setCountdown(RECORDING_DURATION);
    }
  };

  const stopRecording = async () => {
    log('stopRecording called');
    if (cameraRef.current && (isRecording || recordingRef.current)) {
      try {
        log('Stopping recording...');
        await cameraRef.current.stopRecording();
        log('Recording stopped successfully');
      } catch (error: any) {
        // Ignore "not recording" errors - may have auto-stopped
        if (!error?.message?.includes('not recording')) {
          log(`Stop recording error: ${error?.message || error}`);
          console.error('Stop recording error:', error);
        }
      }
      recordingRef.current = false;
      setIsRecording(false);
    } else {
      log('stopRecording: camera ref null or not recording');
    }
  };

  const handleVideoRecorded = async (uri: string) => {
    log(`handleVideoRecorded: ${uri}`);
    // Store video URI and show preview instead of uploading immediately
    setRecordedVideoUri(uri);
    setShowPreview(true);
  };

  // Handle retry/re-record
  const handleRetry = () => {
    setRecordedVideoUri(null);
    setShowPreview(false);
    setCountdown(RECORDING_DURATION);
  };

  // Check auth and proceed with upload
  const handleProceedWithUpload = async () => {
    if (!recordedVideoUri) return;
    
    log('Checking authentication before upload...');
    setAuthChecking(true);
    
    try {
      // Check if user has valid session
      const { valid, error } = await checkSession();
      
      if (!valid) {
        log(`No valid session: ${error}`);
        setAuthChecking(false);
        
        // Prompt user to sign in with Google
        Alert.alert(
          'Sign In Required',
          'Please sign in with Google to upload and analyze your gait video.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign In with Google',
              onPress: async () => {
                try {
                  await signInWithGoogle();
                  // After sign in, re-check and proceed
                  const recheck = await checkSession();
                  if (recheck.valid) {
                    handleProceedWithUpload();
                  } else {
                    Alert.alert('Sign In Failed', 'Please try signing in again.');
                  }
                } catch (signInError) {
                  log(`Sign in error: ${signInError}`);
                  Alert.alert('Sign In Error', 'Failed to sign in. Please try again.');
                }
              },
            },
          ]
        );
        return;
      }
      
      // User is authenticated - proceed with upload
      log('✅ User authenticated, proceeding with upload');
      setShowPreview(false);
      setAuthChecking(false);
      await uploadAndAnalyzeVideo(recordedVideoUri);
    } catch (err) {
      log(`Auth check error: ${err}`);
      setAuthChecking(false);
      Alert.alert('Error', 'Failed to verify authentication. Please try again.');
    }
  };

  // Actual upload and analysis
  const uploadAndAnalyzeVideo = async (uri: string) => {
    log(`uploadAndAnalyzeVideo: ${uri}`);
    setIsUploading(true);
    
    try {
      // Use processVideoAnalysis which uploads AND runs AI analysis
      log('Starting video analysis with AI...');
      
      const analysis = await processVideoAnalysis(
        uri,
        { video_type: 'walking' }, // Default metadata
        (status, progress) => {
          log(`Analysis: ${status} (${progress}%)`);
          setAnalysisStatus(status);
        }
      );
      
      if (analysis) {
        log(`Analysis complete! ID: ${analysis.id}, Score: ${analysis.gait_score}`);
        router.replace({
          pathname: '/analysis/[id]',
          params: { id: analysis.id, analysisData: JSON.stringify(analysis) },
        } as any);
      } else {
        log('Analysis returned null');
        Alert.alert(
          'Analysis Issue',
          'We couldn\'t complete the analysis. Please try again.',
          [
            { text: 'Try Again', onPress: () => setShowPreview(true) },
            { text: 'Go Back', onPress: () => router.back() },
          ]
        );
      }
    } catch (error: any) {
      log(`Analysis error: ${error?.message || error}`);
      console.error('Analysis error:', error);
      
      // Show error alert instead of falling back to demo
      const errorMessage = error?.message?.includes('session') || error?.message?.includes('auth')
        ? 'Authentication error. Please sign in and try again.'
        : 'Failed to analyze video. Please check your connection and try again.';
      
      Alert.alert(
        'Analysis Failed',
        errorMessage,
        [
          { text: 'Try Again', onPress: () => setShowPreview(true) },
          { text: 'Go Back', onPress: () => router.back() },
        ]
      );
    } finally {
      setIsUploading(false);
      setAnalysisStatus('');
      setRecordedVideoUri(null);
    }
  };

  const toggleCamera = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // Handle loading state
  if (!permission || !micPermission) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white">Loading permissions...</Text>
      </View>
    );
  }

  // Handle permission denied for camera
  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Ionicons name="camera-outline" size={64} color="white" />
        <Text className="text-white text-xl font-bold mt-4 text-center">
          Camera Access Required
        </Text>
        <Text className="text-white/60 text-center mt-2 mb-6">
          We need camera access to record your walking pattern for gait analysis.
        </Text>
        <Pressable 
          onPress={requestPermission}
          className="bg-arisole-orange px-8 py-4 rounded-full"
        >
          <Text className="text-white font-bold text-lg">Grant Camera Permission</Text>
        </Pressable>
        <Pressable 
          onPress={() => router.back()}
          className="mt-4"
        >
          <Text className="text-white/60">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Handle permission denied for microphone
  if (!micPermission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Ionicons name="mic-outline" size={64} color="white" />
        <Text className="text-white text-xl font-bold mt-4 text-center">
          Microphone Access Required
        </Text>
        <Text className="text-white/60 text-center mt-2 mb-6">
          We need microphone access for video recording with audio.
        </Text>
        <Pressable 
          onPress={requestMicPermission}
          className="bg-arisole-orange px-8 py-4 rounded-full"
        >
          <Text className="text-white font-bold text-lg">Grant Microphone Permission</Text>
        </Pressable>
        <Pressable 
          onPress={() => router.back()}
          className="mt-4"
        >
          <Text className="text-white/60">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Video Preview Screen
  if (showPreview && recordedVideoUri) {
    return (
      <View className="flex-1 bg-black">
        {/* Video Preview Background - Static since expo-av not available */}
        <View style={StyleSheet.absoluteFill} className="bg-gray-900 items-center justify-center">
          <View className="items-center">
            <Ionicons name="videocam" size={80} color="#F26F05" />
            <Text className="text-white/60 mt-4 text-center px-8">
              Video ready for analysis
            </Text>
          </View>
        </View>
        
        {/* Overlay with controls */}
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row justify-between items-center px-6 pt-16">
            <Pressable 
              onPress={handleRetry}
              className="w-12 h-12 rounded-full bg-black/40 items-center justify-center"
            >
              <Ionicons name="close" size={28} color="white" />
            </Pressable>
            <View className="bg-arisole-orange/20 px-4 py-2 rounded-full">
              <Text className="text-white font-semibold">Preview</Text>
            </View>
            <View style={{ width: 48 }} />
          </View>

          {/* Center Info */}
          <View className="flex-1 items-center justify-center">
            <Animated.View entering={FadeIn.duration(300)} className="items-center">
              <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
              <Text className="text-white text-xl font-bold mt-4">Video Recorded!</Text>
              <Text className="text-white/60 text-center mt-2 px-10">
                Review your video and proceed to analyze your gait
              </Text>
            </Animated.View>
          </View>

          {/* Bottom Controls */}
          <View className="px-6 pb-16">
            {/* Sign In Status */}
            <View className="bg-black/40 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center">
                <View className={`w-3 h-3 rounded-full mr-2 ${user ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <Text className="text-white/80 flex-1">
                  {user ? `Signed in as ${user.email}` : 'Sign in required to analyze'}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-4">
              <Pressable
                onPress={handleRetry}
                className="flex-1 bg-white/10 py-4 rounded-2xl items-center"
              >
                <Ionicons name="refresh" size={24} color="white" />
                <Text className="text-white font-semibold mt-1">Re-record</Text>
              </Pressable>
              
              <Pressable
                onPress={handleProceedWithUpload}
                disabled={authChecking || isSigningIn}
                className="flex-1 bg-arisole-orange py-4 rounded-2xl items-center"
                style={{ opacity: authChecking || isSigningIn ? 0.6 : 1 }}
              >
                {authChecking || isSigningIn ? (
                  <>
                    <Ionicons name="hourglass" size={24} color="white" />
                    <Text className="text-white font-semibold mt-1">
                      {isSigningIn ? 'Signing in...' : 'Checking...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="analytics" size={24} color="white" />
                    <Text className="text-white font-semibold mt-1">Analyze</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (isUploading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Animated.View 
          entering={FadeIn.duration(300)}
          className="items-center"
        >
          <View className="w-20 h-20 rounded-full bg-arisole-orange/20 items-center justify-center mb-4">
            <Ionicons name="cloud-upload" size={40} color="#F26F05" />
          </View>
          <Text className="text-white text-xl font-bold">Uploading Video</Text>
          <Text className="text-white/60 mt-2">Preparing for analysis...</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView 
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
        onCameraReady={onCameraReady}
      />

      {/* Overlay UI */}
      <View className="flex-1">
        {/* Top Bar */}
        <View className="flex-row justify-between items-center px-6 pt-16">
          <Pressable 
            onPress={() => router.back()}
            className="w-12 h-12 rounded-full bg-black/40 items-center justify-center"
          >
            <Ionicons name="close" size={28} color="white" />
          </Pressable>
          
          {!isRecording && (
            <Pressable 
              onPress={toggleCamera}
              className="w-12 h-12 rounded-full bg-black/40 items-center justify-center"
            >
              <Ionicons name="camera-reverse" size={24} color="white" />
            </Pressable>
          )}
        </View>

        {/* Recording Progress Bar */}
        {isRecording && (
          <Animated.View 
            entering={FadeIn.duration(300)}
            className="px-6 mt-4"
          >
            <View className="bg-white/20 h-2 rounded-full overflow-hidden">
              <Animated.View 
                style={[{ backgroundColor: '#F26F05', height: '100%', borderRadius: 4 }, progressStyle]} 
              />
            </View>
          </Animated.View>
        )}

        {/* Center Guide */}
        <View className="flex-1 items-center justify-center">
          {!isRecording && (
            <Animated.View entering={FadeInDown.duration(600)}>
              <View className="items-center">
                <Ionicons name="walk" size={48} color="white" style={{ opacity: 0.6 }} />
                <Text className="text-white/80 text-center mt-2 px-10">
                  Position yourself so your full body is visible from the side
                </Text>
              </View>
            </Animated.View>
          )}
          
          {isRecording && (
            <Animated.View entering={FadeIn.duration(300)} className="items-center">
              <Text className="text-white text-8xl font-bold">{countdown}</Text>
              <Text className="text-arisole-orange text-xl font-semibold mt-2">
                Recording...
              </Text>
            </Animated.View>
          )}
        </View>

        {/* Bottom Controls */}
        <View className="items-center pb-16">
          {/* Record Button */}
          <Pressable
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isUploading}
          >
            <View className="items-center">
              {isRecording ? (
                <Animated.View style={pulseStyle}>
                  <View className="w-20 h-20 rounded-full bg-red-500/30 items-center justify-center">
                    <View className="w-16 h-16 rounded-xl bg-red-500" />
                  </View>
                </Animated.View>
              ) : (
                <View className="w-20 h-20 rounded-full border-4 border-white items-center justify-center">
                  <View className="w-16 h-16 rounded-full bg-arisole-orange" />
                </View>
              )}
              
              <Text className="text-white font-semibold mt-3">
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
