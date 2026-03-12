import { View, Text, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import GlassCard from '../../components/GlassCard';

const { width } = Dimensions.get('window');
const TIP_SIZE = (width - 60) / 2;

interface ProTipCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  delay: number;
}

function ProTipCard({ icon, title, description, delay }: ProTipCardProps) {
  return (
    <Animated.View 
      entering={FadeInUp.delay(delay).duration(600)}
      style={{ width: TIP_SIZE, marginBottom: 16 }}
    >
      <GlassCard className="p-5 h-40 items-center justify-center">
        <View className="w-14 h-14 rounded-full bg-arisole-orange/10 items-center justify-center mb-3">
          <Ionicons name={icon} size={28} color="#F26F05" />
        </View>
        <Text className="text-text-primary font-bold text-center text-sm">{title}</Text>
        <Text className="text-text-muted text-xs text-center mt-1">{description}</Text>
      </GlassCard>
    </Animated.View>
  );
}

export default function RecordingInstructionsScreen() {
  const router = useRouter();
  const buttonScale = useSharedValue(1);

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleStartRecording = () => {
    router.push('/recording/camera');
  };

  const tips = [
    { icon: 'easel-outline', title: 'Use a Tripod', description: 'Stable recording for best results' },
    { icon: 'eye-outline', title: 'Side View', description: 'Position camera at side angle' },
    { icon: 'body-outline', title: 'Snug Clothing', description: 'Wear fitted clothes for accuracy' },
    { icon: 'sunny-outline', title: 'Good Lighting', description: 'Ensure well-lit environment' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(600)}
        className="px-6 pt-4 pb-2"
      >
        <Pressable 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-card mb-4"
        >
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </Pressable>
        
        <Text className="text-text-primary text-2xl font-bold">Recording Tips</Text>
        <Text className="text-text-secondary text-sm mt-1">
          Follow these tips for the best gait analysis results
        </Text>
      </Animated.View>

      {/* Pro Tips Grid */}
      <View className="flex-1 px-6 pt-6">
        <View className="flex-row flex-wrap justify-between">
          {tips.map((tip, index) => (
            <ProTipCard
              key={index}
              icon={tip.icon as keyof typeof Ionicons.glyphMap}
              title={tip.title}
              description={tip.description}
              delay={200 + index * 100}
            />
          ))}
        </View>

        {/* Additional Info */}
        <Animated.View entering={FadeInUp.delay(600).duration(600)}>
          <GlassCard className="p-4 mt-2">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                <Ionicons name="information-circle" size={22} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary font-semibold">Recording Duration</Text>
                <Text className="text-text-muted text-xs">
                  Walk naturally for 20 seconds. The camera will automatically stop.
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      </View>

      {/* Start Recording Button */}
      <Animated.View 
        entering={FadeInUp.delay(800).duration(600)}
        className="px-6 pb-8"
      >
        <Animated.View style={buttonAnimatedStyle}>
          <Pressable
            onPress={handleStartRecording}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <LinearGradient
              colors={['#F26F05', '#FF8A33']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 24,
                shadowColor: '#F26F05',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <View className="flex-row items-center justify-center py-5 px-8">
                <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-4">
                  <Ionicons name="play" size={24} color="white" />
                </View>
                <View>
                  <Text className="text-white text-lg font-bold">Start Recording</Text>
                  <Text className="text-white/80 text-sm">Begin your 20-second walk</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}
