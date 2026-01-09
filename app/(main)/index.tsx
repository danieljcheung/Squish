import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Animated,
  Easing,
  LayoutChangeEvent,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useAgents, AgentWithLastMessage } from '@/hooks/useAgent';
import { useToast } from '@/context/ToastContext';
import { Slime, ProfileSlime, InteractiveSlime, SlimeColor, SlimeType } from '@/components/slime';


// Helper to format relative time
const formatRelativeTime = (dateString: string | undefined): string => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Water drop icon
const WaterDropIcon = ({ size = 28 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={colors.primary}>
    <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" />
  </Svg>
);

// Chevron right icon
const ChevronRightIcon = ({ color = '#d1d5db' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M9 18l6-6-6-6" />
  </Svg>
);



// Hero slime using unified component (static fallback)
const HeroSlime = () => (
  <View style={styles.heroSlimeContainer}>
    <Slime color="mint" type="base" size="large" animated />
  </View>
);

// Interactive hero slime with physics
const InteractiveHeroSlime = ({
  containerWidth,
  containerHeight,
  onGestureStart,
  onGestureEnd,
}: {
  containerWidth: number;
  containerHeight: number;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}) => {
  if (containerWidth === 0 || containerHeight === 0) {
    return <HeroSlime />;
  }

  return (
    <InteractiveSlime
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      onGestureStart={onGestureStart}
      onGestureEnd={onGestureEnd}
    />
  );
};

// Agent avatar using ProfileSlime with circular accent background
const AgentAvatar = ({
  type,
  slimeColor = 'mint',
  isOnline = true
}: {
  type: SlimeType;
  slimeColor?: SlimeColor;
  isOnline?: boolean;
}) => {
  return (
    <View style={styles.avatarContainer}>
      <ProfileSlime color={slimeColor} type={type} size={48} animated={false} />
      <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4ade80' : '#d1d5db' }]} />
    </View>
  );
};

// Helper to get friendly preview text for component messages
const getMessagePreview = (content: string): string => {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.type) {
      switch (parsed.type) {
        // Pre-confirmation cards (pending)
        case 'pending_meal':
          return parsed.confirmed ? '✓ Meal logged' : '🍽️ Meal ready to log';
        case 'pending_water':
          return parsed.confirmed ? '✓ Water logged' : '💧 Water ready to log';
        case 'pending_workout':
          return parsed.confirmed ? '✓ Workout logged' : '🏋️ Workout ready to log';
        case 'pending_expense':
          return parsed.confirmed ? '✓ Expense logged' : '💸 Expense ready to log';
        case 'pending_income':
          return parsed.confirmed ? '✓ Income logged' : '💰 Income ready to log';

        // Photo analysis cards
        case 'meal_analysis':
          // Check if it has a receiptUrl to determine if it's a receipt
          return parsed.receiptUrl ? '🧾 Receipt logged' : '📸 Meal logged';

        // Confirmation cards (already logged)
        case 'log_confirmation':
          if (parsed.receiptUrl) return '✓ Receipt logged';
          if (parsed.logType === 'income') return '✓ Income logged';
          if (parsed.logType === 'bill') return '✓ Bill logged';
          return '✓ Expense logged';
        case 'bill_confirmation':
          return parsed.isSubscription ? '✓ Subscription added' : '✓ Bill added';

        // Display cards
        case 'bills_card':
          return '📅 Bills overview';
        case 'summary_card':
          return parsed.period === 'month' ? '📊 Monthly summary' : '📊 Weekly summary';
        case 'goals_card':
          return '🎯 Savings goals';
        case 'budget_card':
          return '📊 Budget overview';

        default:
          // Return truncated content for unknown types
          return content.length > 50 ? content.substring(0, 50) + '...' : content;
      }
    }
  } catch {
    // Not JSON, return original content (truncated if too long)
  }
  return content.length > 50 ? content.substring(0, 50) + '...' : content;
};

// Squad agent card
const AgentCard = ({ agent, index }: { agent: AgentWithLastMessage; index: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const { colors: themeColors } = useTheme();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const getDefaultMessage = (type: string) => {
    switch (type) {
      case 'fitness_coach': return "Ready to start your fitness journey!";
      case 'budget_helper': return "Let's manage your finances!";
      case 'study_buddy': return "Ready to help you study!";
      default: return "Ready to help you!";
    }
  };

  // Get slime color from persona or default to mint
  const slimeColor = (agent.persona_json?.slime_color || 'mint') as SlimeColor;

  // Get message preview and time from last message
  const lastMessageContent = agent.lastMessage?.content
    ? getMessagePreview(agent.lastMessage.content)
    : getDefaultMessage(agent.type);
  const lastMessageTime = formatRelativeTime(agent.lastMessage?.created_at);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Link href={`/chat/${agent.id}`} asChild>
        <Pressable>
          <View style={[styles.agentCard, { backgroundColor: themeColors.surface }]}>
            <AgentAvatar type={agent.type} slimeColor={slimeColor} isOnline={true} />
            <View style={styles.agentCardContent}>
              <View style={styles.agentCardHeader}>
                <Text style={[styles.agentCardName, { color: themeColors.text }]}>{agent.name}</Text>
                {lastMessageTime ? (
                  <Text style={[styles.agentCardTime, { color: themeColors.textMuted }]}>{lastMessageTime}</Text>
                ) : null}
              </View>
              <Text style={[styles.agentCardMessage, { color: themeColors.textMuted }]} numberOfLines={1}>
                {lastMessageContent}
              </Text>
            </View>
            <ChevronRightIcon color={themeColors.textMuted} />
          </View>
        </Pressable>
      </Link>
    </Animated.View>
  );
};

// Morph button component
const MorphButton = () => (
  <Pressable onPress={() => router.push('/create/select')}>
    {({ pressed }) => (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: pressed ? '#8ecbb0' : '#bae9d1',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 16,
          width: 200,
        }}
      >
        <Ionicons name="sparkles" size={20} color="#101914" />
        <Text style={{ fontSize: 14, fontFamily: fonts.bold, color: '#101914' }}>Morph</Text>
      </View>
    )}
  </Pressable>
);

// Simple hero text (masked version was causing crashes with MaskedView + Reanimated)
const HeroText = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => {
  const { colors: themeColors } = useTheme();

  return (
    <View style={styles.emptyTextContainer} pointerEvents="none">
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: themeColors.textMuted }]}>{subtitle}</Text>
    </View>
  );
};

// Empty state
const EmptyState = ({
  onGestureStart,
  onGestureEnd,
}: {
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}) => {
  const { colors: themeColors } = useTheme();
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCardSize({ width, height });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 0 }}>
      <View
        style={[styles.emptyCard, { backgroundColor: themeColors.surface }]}
        onLayout={handleLayout}
        onTouchStart={onGestureStart}
        onTouchEnd={onGestureEnd}
        onTouchCancel={onGestureEnd}
      >
        <View style={[styles.cardBlob, styles.cardBlobTopRight]} />
        <View style={[styles.cardBlob, styles.cardBlobBottomLeft]} />

        {/* Slime layer - positioned absolutely to move freely across entire card */}
        <View style={styles.slimeLayer} pointerEvents="box-none">
          <InteractiveHeroSlime
            containerWidth={cardSize.width}
            containerHeight={cardSize.height}
          />
        </View>

        {/* Content layer */}
        <View style={styles.emptyContent} pointerEvents="box-none">
          <View style={styles.slimePlaceholder} pointerEvents="none" />

          <HeroText
            title="Meet Squish"
            subtitle="Your base slime helper ready to morph!"
          />

          <MorphButton />
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

// Hero card when agents exist
const HeroCard = ({
  onGestureStart,
  onGestureEnd,
}: {
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}) => {
  const { colors: themeColors } = useTheme();
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCardSize({ width, height });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 0 }}>
      <View
        style={[styles.heroCard, { backgroundColor: themeColors.surface }]}
        onLayout={handleLayout}
        onTouchStart={onGestureStart}
        onTouchEnd={onGestureEnd}
        onTouchCancel={onGestureEnd}
      >
        <View style={[styles.cardBlob, styles.cardBlobTopRight]} />
        <View style={[styles.cardBlob, styles.cardBlobBottomLeft]} />

        {/* Slime layer - positioned absolutely to move freely across entire card */}
        <View style={styles.slimeLayer} pointerEvents="box-none">
          <InteractiveHeroSlime
            containerWidth={cardSize.width}
            containerHeight={cardSize.height}
          />
        </View>

        {/* Content layer */}
        <View style={styles.heroContent} pointerEvents="box-none">
          <View style={styles.slimePlaceholder} pointerEvents="none" />

          <HeroText
            title="Meet Squish"
            subtitle="Your base slime helper ready to morph!"
          />

          <MorphButton />
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

// Loading skeleton
const SkeletonCard = () => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const { colors: themeColors } = useTheme();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity: pulseAnim, backgroundColor: themeColors.surface }]}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonMessage} />
      </View>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors: themeColors } = useTheme();
  const { agents, loading, error, refetch } = useAgents();
  const { showError } = useToast();
  useEffect(() => {
    if (error && !loading) {
      showError(error, refetch);
    }
  }, [error, loading]);

  const [refreshing, setRefreshing] = useState(false);
  const [isSlimeGestureActive, setIsSlimeGestureActive] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Callbacks to control scroll when interacting with slime
  const handleSlimeGestureStart = useCallback(() => {
    setIsSlimeGestureActive(true);
  }, []);

  const handleSlimeGestureEnd = useCallback(() => {
    setIsSlimeGestureActive(false);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, backgroundColor: `${themeColors.background}E6` }]}>
        <View style={styles.headerLeft}>
          <WaterDropIcon size={28} />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Squish</Text>
        </View>
        <Pressable onPress={() => router.push('/profile')} style={styles.profileButton}>
          {user?.email ? (
            <View style={[styles.profileAvatar, { borderColor: themeColors.surface }]}>
              <Text style={[styles.profileInitial, { color: themeColors.textMuted }]}>
                {user.email.charAt(0).toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={[styles.profileAvatar, { borderColor: themeColors.surface }]}>
              <Text style={[styles.profileInitial, { color: themeColors.textMuted }]}>?</Text>
            </View>
          )}
          <View style={[styles.profileOnlineDot, { borderColor: themeColors.surface }]} />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isSlimeGestureActive}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
            enabled={!isSlimeGestureActive}
          />
        }
      >
        {/* Hero Section */}
        {agents.length === 0 && !loading ? (
          <EmptyState
            onGestureStart={handleSlimeGestureStart}
            onGestureEnd={handleSlimeGestureEnd}
          />
        ) : (
          <HeroCard
            onGestureStart={handleSlimeGestureStart}
            onGestureEnd={handleSlimeGestureEnd}
          />
        )}

        {/* Your Squad Section */}
        {(agents.length > 0 || loading) && (
          <View style={styles.squadSection}>
            <View style={styles.squadHeader}>
              <Text style={[styles.squadTitle, { color: themeColors.text }]}>Your Squad</Text>
              <Pressable>
                <Text style={[styles.viewAllText, { color: themeColors.textMuted }]}>View All</Text>
              </Pressable>
            </View>

            <View style={styles.squadList}>
              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                agents.map((agent, index) => (
                  <AgentCard key={agent.id} agent={agent} index={index} />
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: `${colors.background}E6`,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fonts.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  profileButton: {
    position: 'relative',
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileInitial: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.textMuted,
  },
  profileOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ade80',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  // Hero Card
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.xl,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.xl,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  cardBlob: {
    position: 'absolute',
    borderRadius: 9999,
  },
  cardBlobTopRight: {
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    backgroundColor: `${colors.primary}33`,
  },
  cardBlobBottomLeft: {
    bottom: -40,
    left: -40,
    width: 128,
    height: 128,
    backgroundColor: 'rgba(219, 234, 254, 0.3)',
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  emptyContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  heroSlimeContainer: {
    marginBottom: spacing.lg,
  },
  slimeLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  slimePlaceholder: {
    height: 128,
    marginBottom: spacing.lg,
  },
  heroTextContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTextContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: fonts.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  emptyTitle: {
    fontSize: 28,
    fontFamily: fonts.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginTop: 4,
  },
  // Squad Section
  squadSection: {
    marginTop: spacing.xl,
  },
  squadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  squadTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
  squadList: {
    gap: spacing.md,
  },
  // Agent Card
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  agentCardContent: {
    flex: 1,
    minWidth: 0,
  },
  agentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${colors.primary}20`,
    overflow: 'hidden',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  agentCardName: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  agentCardTime: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: '#9ca3af',
  },
  agentCardMessage: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Skeleton
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  skeletonAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary}30`,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  skeletonTitle: {
    width: '50%',
    height: 16,
    borderRadius: 8,
    backgroundColor: `${colors.primary}25`,
    marginBottom: 8,
  },
  skeletonMessage: {
    width: '75%',
    height: 14,
    borderRadius: 7,
    backgroundColor: `${colors.primary}15`,
  },
});
