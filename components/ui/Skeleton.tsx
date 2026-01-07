import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Skeleton for agent card on home screen
export function AgentCardSkeleton() {
  return (
    <View style={styles.agentCard}>
      <Skeleton width={60} height={60} borderRadius={30} />
      <View style={styles.agentInfo}>
        <Skeleton width={120} height={18} style={{ marginBottom: 8 }} />
        <Skeleton width={80} height={14} style={{ marginBottom: 6 }} />
        <Skeleton width={160} height={14} />
      </View>
      <Skeleton width={30} height={30} borderRadius={15} />
    </View>
  );
}

// Multiple agent card skeletons
export function AgentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      <Skeleton width={100} height={18} style={{ marginBottom: 16 }} />
      {Array.from({ length: count }).map((_, index) => (
        <AgentCardSkeleton key={index} />
      ))}
    </View>
  );
}

// Skeleton for chat messages
export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <View
      style={[
        styles.messageContainer,
        isUser ? styles.userMessage : styles.agentMessage,
      ]}
    >
      {!isUser && <Skeleton width={32} height={32} borderRadius={16} style={{ marginRight: 8 }} />}
      <View style={[styles.messageBubble, isUser && styles.userBubble]}>
        <Skeleton width={isUser ? 120 : 180} height={16} style={{ marginBottom: 6 }} />
        <Skeleton width={isUser ? 80 : 140} height={16} />
      </View>
    </View>
  );
}

// Multiple message skeletons
export function ChatSkeleton() {
  return (
    <View style={styles.chatContainer}>
      <MessageSkeleton isUser={false} />
      <MessageSkeleton isUser={true} />
      <MessageSkeleton isUser={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: `${colors.primary}40`,
  },
  // Agent card skeleton
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  agentInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  listContainer: {
    padding: spacing.lg,
  },
  // Message skeleton
  messageContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  agentMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    maxWidth: '75%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: `${colors.primary}30`,
    marginLeft: 'auto',
    shadowOpacity: 0,
  },
  chatContainer: {
    padding: spacing.lg,
  },
});
