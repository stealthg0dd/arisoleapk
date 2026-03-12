import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import SplashScreen from '../components/SplashScreen';
import { AuthProvider } from '../context/AuthContext';
import '../global.css';

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          {showSplash ? (
            <Animated.View 
              entering={FadeIn.duration(500)} 
              exiting={FadeOut.duration(500)}
              style={{ flex: 1 }}
            >
              <SplashScreen onComplete={() => setShowSplash(false)} />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1 }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  contentStyle: { backgroundColor: '#F9F9F9' },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="recording/index" 
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right',
                  }} 
                />
                <Stack.Screen 
                  name="recording/camera" 
                  options={{ 
                    presentation: 'fullScreenModal',
                    animation: 'fade',
                  }} 
                />
                <Stack.Screen 
                  name="analysis/[id]" 
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_bottom',
                  }} 
                />
              </Stack>
            </Animated.View>
          )}
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
