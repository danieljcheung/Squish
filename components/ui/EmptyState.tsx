import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { BaseSlime } from '@/components/slime';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  expression?: 'happy' | 'excited' | 'sleepy' | 'neutral';
  slimeColor?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  subtitle,
  expression = 'sleepy',
  slimeColor,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <BaseSlime size={100} expression={expression} color={slimeColor} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {actionLabel && onAction && (
        <Pressable style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

// Specific empty states for common scenarios
export function NoMessagesEmptyState() {
  return (
    <View style={styles.chatEmptyContainer}>
      <BaseSlime size={80} expression="excited" />
      <Text style={styles.chatEmptyTitle}>Start the conversation!</Text>
      <Text style={styles.chatEmptySubtitle}>
        Say hello to your coach and{'\n'}get started on your goals
      </Text>
    </View>
  );
}

export function NoAgentsEmptyState({ onCreateAgent }: { onCreateAgent?: () => void }) {
  return (
    <EmptyState
      title="No agents yet!"
      subtitle="Create your first AI coaching companion to get started on your goals"
      expression="excited"
      actionLabel="Create Agent"
      onAction={onCreateAgent}
    />
  );
}

export function ErrorState({
  message = "Something went wrong",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.container}>
      <BaseSlime size={100} expression="sleepy" color={colors.slimeCoach} />
      <Text style={styles.title}>Oops!</Text>
      <Text style={styles.subtitle}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  title: {
    marginTop: spacing.lg,
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  retryButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  // Chat-specific empty state
  chatEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
    paddingBottom: 100,
  },
  chatEmptyTitle: {
    marginTop: spacing.lg,
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  chatEmptySubtitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
