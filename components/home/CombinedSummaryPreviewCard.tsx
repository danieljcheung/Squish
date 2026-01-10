import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing, radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { CombinedWeeklySummary } from '@/types';

interface CombinedSummaryPreviewCardProps {
  summary: CombinedWeeklySummary;
  onDismiss: () => void;
}

export function CombinedSummaryPreviewCard({
  summary,
  onDismiss,
}: CombinedSummaryPreviewCardProps) {
  const { colors: themeColors } = useTheme();

  const formatDateRange = () => {
    const start = new Date(summary.week_start);
    const end = new Date(summary.week_end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const getQuickStats = () => {
    const stats: { label: string; emoji: string }[] = [];

    if (summary.fitness_summary?.hasActivity) {
      stats.push({
        label: `${summary.fitness_summary.totalWorkouts} workout${summary.fitness_summary.totalWorkouts !== 1 ? 's' : ''}`,
        emoji: '',
      });
    }

    if (summary.finance_summary?.hasActivity) {
      stats.push({
        label: `$${Math.round(summary.finance_summary.totalSpent)} spent`,
        emoji: '',
      });
    }

    if (summary.team_wins.length > 0) {
      stats.push({
        label: `${summary.team_wins.length} team win${summary.team_wins.length !== 1 ? 's' : ''}`,
        emoji: '',
      });
    }

    return stats.slice(0, 3);
  };

  const handlePress = () => {
    router.push('/combined-summary');
  };

  const quickStats = getQuickStats();

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: themeColors.surface },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>📊</Text>
          <Text style={[styles.title, { color: themeColors.text }]}>Week in Review</Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          hitSlop={12}
          style={styles.dismissButton}
        >
          <Ionicons name="close" size={20} color={themeColors.textMuted} />
        </Pressable>
      </View>

      <Text style={[styles.dateRange, { color: themeColors.textMuted }]}>{formatDateRange()}</Text>

      {quickStats.length > 0 && (
        <View style={styles.statsRow}>
          {quickStats.map((stat, i) => (
            <View
              key={i}
              style={[styles.statBadge, { backgroundColor: `${colors.primary}20` }]}
            >
              <Text style={[styles.statText, { color: themeColors.text }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.tapHint}>
        <Text style={[styles.tapText, { color: themeColors.textMuted }]}>Tap to view full summary</Text>
        <Ionicons name="chevron-forward" size={14} color={themeColors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  dismissButton: {
    padding: spacing.xs,
    marginTop: -spacing.xs,
    marginRight: -spacing.xs,
  },
  dateRange: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
  statText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  tapText: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
});
