import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing, radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAgents } from '@/hooks/useAgent';
import { useLoungeConversation } from '@/hooks/useLoungeConversation';
import { DualInteractiveSlime } from '@/components/slime';
import { AgentConversation } from '@/components/lounge';
import { Skeleton } from '@/components/ui/Skeleton';

// Playground height
const PLAYGROUND_HEIGHT = 220;

// Loading state
function LoadingState() {
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={themeColors.text} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Skeleton width={120} height={20} />
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={[styles.playground, { backgroundColor: themeColors.surface }]}>
        <Skeleton width={100} height={80} style={{ borderRadius: radius.lg }} />
        <Skeleton width={100} height={80} style={{ borderRadius: radius.lg, marginLeft: spacing.xl }} />
      </View>
      <View style={styles.conversationContainer}>
        <Skeleton width="80%" height={60} style={{ borderRadius: radius.lg, marginBottom: spacing.md }} />
        <Skeleton width="80%" height={60} style={{ borderRadius: radius.lg, marginBottom: spacing.md, alignSelf: 'flex-end' }} />
        <Skeleton width="80%" height={60} style={{ borderRadius: radius.lg, marginBottom: spacing.md }} />
      </View>
    </View>
  );
}

// Empty state (missing agents)
function EmptyState({ message }: { message: string }) {
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={themeColors.text} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Agent Lounge</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🏠</Text>
        <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Lounge Locked</Text>
        <Text style={[styles.emptySubtitle, { color: themeColors.textMuted }]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

export default function AgentLoungeScreen() {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const { agents, loading: agentsLoading } = useAgents();
  const [playgroundSize, setPlaygroundSize] = useState({ width: 0, height: 0 });
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Find fitness and finance agents
  // Note: finance agent type is 'finance' in agentTypes.ts but 'budget_helper' in older type definitions
  const fitnessAgent = agents.find((a) => a.type === 'fitness_coach');
  const financeAgent = agents.find((a) => a.type === 'budget_helper' || (a.type as string) === 'finance');

  // Get conversation
  const { messages, loading: conversationLoading, refresh } = useLoungeConversation(
    fitnessAgent,
    financeAgent
  );

  const handlePlaygroundLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPlaygroundSize({ width, height });
  }, []);

  const handleGestureStart = useCallback(() => {
    setScrollEnabled(false);
  }, []);

  const handleGestureEnd = useCallback(() => {
    setScrollEnabled(true);
  }, []);

  // Loading state
  if (agentsLoading) {
    return <LoadingState />;
  }

  // Check for required agents
  if (!fitnessAgent) {
    return <EmptyState message="Create a fitness coach agent to unlock the lounge!" />;
  }
  if (!financeAgent) {
    return <EmptyState message="Create a finance agent to unlock the lounge!" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={themeColors.text} />
          </Pressable>
          <View style={styles.headerTitles}>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Agent Lounge</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Playground */}
        <View
          style={[styles.playground, { backgroundColor: themeColors.surface }]}
          onLayout={handlePlaygroundLayout}
        >
          {playgroundSize.width > 0 && playgroundSize.height > 0 && (
            <DualInteractiveSlime
              fitnessAgent={fitnessAgent}
              financeAgent={financeAgent}
              containerWidth={playgroundSize.width}
              containerHeight={playgroundSize.height}
              onGestureStart={handleGestureStart}
              onGestureEnd={handleGestureEnd}
            />
          )}
        </View>

        {/* Conversation */}
        <View style={styles.conversationContainer}>
          <AgentConversation
            messages={messages}
            fitnessAgent={fitnessAgent}
            financeAgent={financeAgent}
            loading={conversationLoading}
            onRefresh={refresh}
          />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
  },
  playground: {
    height: PLAYGROUND_HEIGHT,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationContainer: {
    flex: 1,
    marginTop: spacing.md,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
});
