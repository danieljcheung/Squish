import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
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
    padding: 40,
  },
  title: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  actionButton: {
    marginTop: 24,
    backgroundColor: colors.mint,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: colors.slimeCoach,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Chat-specific empty state
  chatEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    paddingBottom: 100,
  },
  chatEmptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  chatEmptySubtitle: {
    marginTop: 8,
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
});
