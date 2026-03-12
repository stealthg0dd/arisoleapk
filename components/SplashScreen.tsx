import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import Animated, { 
  FadeIn, 
  FadeInDown,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop, Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const glowOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const ringRotation = useSharedValue(0);

  useEffect(() => {
    // Logo entrance animation
    logoScale.value = withSequence(
      withTiming(1.1, { duration: 800, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) })
    );

    // Glow animation
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.5, { duration: 1500 })
      ),
      -1,
      true
    );

    // Ring rotation
    ringRotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotation.value}deg` }],
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F9F9F9', '#FFF8F3', '#FFCBA4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Glow Background */}
      <Animated.View style={[styles.glowContainer, glowAnimatedStyle]}>
        <View style={styles.glowCircle} />
      </Animated.View>

      {/* Animated Ring */}
      <Animated.View style={[styles.ringContainer, ringAnimatedStyle]}>
        <Svg width={280} height={280}>
          <Defs>
            <RadialGradient id="ringGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="transparent" />
              <Stop offset="70%" stopColor="transparent" />
              <Stop offset="100%" stopColor="rgba(242, 111, 5, 0.1)" />
            </RadialGradient>
          </Defs>
          <Circle
            cx="140"
            cy="140"
            r="135"
            stroke="rgba(242, 111, 5, 0.15)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="20 10"
          />
          <Circle
            cx="140"
            cy="140"
            r="115"
            stroke="rgba(242, 111, 5, 0.1)"
            strokeWidth="1"
            fill="none"
            strokeDasharray="10 15"
          />
        </Svg>
      </Animated.View>

      {/* Logo Container */}
      <Animated.View 
        entering={FadeIn.duration(800).delay(200)}
        style={[styles.logoContainer, logoAnimatedStyle]}
      >
        {/* Logo Icon - Stylized "A" with stride motion */}
        <View style={styles.logoIconContainer}>
          <LinearGradient
            colors={['#F26F05', '#FF8A33']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoIcon}
          >
            <View style={styles.logoInner}>
              <Svg width={48} height={48} viewBox="0 0 48 48">
                {/* Stylized walking figure / stride lines */}
                <Path
                  d="M24 8 L24 18 M16 28 L24 18 L32 28 M20 38 L24 28 L28 38"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <Circle cx="24" cy="5" r="3" fill="white" />
              </Svg>
            </View>
          </LinearGradient>
        </View>

        {/* Brand Name */}
        <Text style={styles.brandName}>Arisole</Text>
        <Text style={styles.productName}>StrideIQ</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View 
        entering={FadeInDown.duration(600).delay(600)}
        style={styles.taglineContainer}
      >
        <Text style={styles.tagline}>Perfect Your Step</Text>
      </Animated.View>

      {/* Footer */}
      <Animated.View 
        entering={FadeIn.duration(400).delay(1500)}
        style={styles.footer}
      >
        <View style={styles.loadingDots}>
          <View style={[styles.dot, { opacity: 0.4 }]} />
          <View style={[styles.dot, { opacity: 0.7 }]} />
          <View style={[styles.dot, { opacity: 1 }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(242, 111, 5, 0.15)',
    shadowColor: '#F26F05',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
  },
  ringContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoIconContainer: {
    marginBottom: 24,
    shadowColor: '#F26F05',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logoIcon: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 1,
  },
  productName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#F26F05',
    letterSpacing: 2,
    marginTop: -4,
  },
  taglineContainer: {
    position: 'absolute',
    bottom: 120,
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    letterSpacing: 1,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F26F05',
  },
});
