import { View, Text, ScrollView, Pressable, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
const CARD_WIDTH = width - 48;

interface TradingCardProps {
  username: string;
  score: number;
  achievement: string;
  timestamp: string;
  likes: number;
  delay: number;
}

function TradingCard({ username, score, achievement, timestamp, likes, delay }: TradingCardProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View 
      entering={FadeInUp.delay(delay).duration(600)}
      style={animatedStyle}
    >
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View 
          style={{
            width: CARD_WIDTH,
            borderRadius: 24,
            overflow: 'hidden',
            marginBottom: 20,
            shadowColor: '#F26F05',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <LinearGradient
            colors={['#ffffff', '#FFF8F3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ padding: 1, borderRadius: 24 }}
          >
            <View className="bg-white rounded-card overflow-hidden">
              {/* Card Header with Achievement Badge */}
              <LinearGradient
                colors={['#F26F05', '#FFCBA4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20 }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-3">
                      <Text className="text-white text-lg font-bold">
                        {username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-white font-bold text-lg">{username}</Text>
                      <Text className="text-white/80 text-xs">{timestamp}</Text>
                    </View>
                  </View>
                  <View className="bg-white/20 px-4 py-2 rounded-full">
                    <Text className="text-white font-bold text-xl">{score}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Card Body */}
              <View className="p-5">
                {/* Achievement Badge */}
                <View className="flex-row items-center mb-4">
                  <LinearGradient
                    colors={['#D4AF37', '#E6C65A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ 
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="star" size={16} color="white" />
                      <Text className="text-white font-semibold ml-2">{achievement}</Text>
                    </View>
                  </LinearGradient>
                </View>

                {/* Stats Grid */}
                <View className="flex-row justify-between bg-bg-light rounded-2xl p-4 mb-4">
                  <View className="items-center flex-1">
                    <View className="w-10 h-10 rounded-full bg-arisole-orange/10 items-center justify-center mb-2">
                      <Ionicons name="flash" size={18} color="#F26F05" />
                    </View>
                    <Text className="text-text-muted text-xs">Impact</Text>
                    <Text className="text-text-primary font-bold">Low</Text>
                  </View>
                  <View className="items-center flex-1">
                    <View className="w-10 h-10 rounded-full bg-arisole-orange/10 items-center justify-center mb-2">
                      <Ionicons name="footsteps" size={18} color="#F26F05" />
                    </View>
                    <Text className="text-text-muted text-xs">Heel Strike</Text>
                    <Text className="text-text-primary font-bold">Perfect</Text>
                  </View>
                  <View className="items-center flex-1">
                    <View className="w-10 h-10 rounded-full bg-arisole-orange/10 items-center justify-center mb-2">
                      <Ionicons name="analytics" size={18} color="#F26F05" />
                    </View>
                    <Text className="text-text-muted text-xs">Form</Text>
                    <Text className="text-text-primary font-bold">A+</Text>
                  </View>
                </View>

                {/* Action Bar */}
                <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
                  <Pressable className="flex-row items-center">
                    <Ionicons name="heart-outline" size={22} color="#F26F05" />
                    <Text className="text-text-secondary ml-2 font-medium">{likes}</Text>
                  </Pressable>
                  <Pressable className="flex-row items-center">
                    <Ionicons name="chatbubble-outline" size={20} color="#999" />
                    <Text className="text-text-secondary ml-2 font-medium">Comment</Text>
                  </Pressable>
                  <Pressable className="flex-row items-center">
                    <Ionicons name="share-outline" size={22} color="#999" />
                    <Text className="text-text-secondary ml-2 font-medium">Share</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function FeedScreen() {
  const feedData = [
    { username: 'Sarah M.', score: 92, achievement: 'Perfect Stride', timestamp: '2 hours ago', likes: 24 },
    { username: 'Mike T.', score: 88, achievement: 'Consistency King', timestamp: '5 hours ago', likes: 18 },
    { username: 'Emma W.', score: 95, achievement: 'Elite Walker', timestamp: '1 day ago', likes: 45 },
    { username: 'James L.', score: 86, achievement: 'Rising Star', timestamp: '2 days ago', likes: 12 },
  ];

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(600)}
        className="px-6 pt-4 pb-4"
      >
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-text-primary text-2xl font-bold">The Field</Text>
            <Text className="text-text-secondary text-sm">Community Achievements</Text>
          </View>
          <Pressable className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-card">
            <Ionicons name="filter" size={22} color="#1A1A1A" />
          </Pressable>
        </View>

        {/* Filter Pills */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="mt-4 -mx-1"
        >
          <Pressable className="bg-arisole-orange px-4 py-2 rounded-full mr-2">
            <Text className="text-white font-semibold">All</Text>
          </Pressable>
          <Pressable className="bg-white px-4 py-2 rounded-full mr-2 border border-gray-200">
            <Text className="text-text-secondary font-medium">Following</Text>
          </Pressable>
          <Pressable className="bg-white px-4 py-2 rounded-full mr-2 border border-gray-200">
            <Text className="text-text-secondary font-medium">Top Scores</Text>
          </Pressable>
          <Pressable className="bg-white px-4 py-2 rounded-full mr-2 border border-gray-200">
            <Text className="text-text-secondary font-medium">Recent</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>

      {/* Feed */}
      <ScrollView 
        className="flex-1 px-6" 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {feedData.map((item, index) => (
          <TradingCard 
            key={index}
            {...item}
            delay={index * 150}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
