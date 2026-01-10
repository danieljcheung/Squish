import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing, radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useCombinedWeeklySummary } from '@/hooks/useCombinedWeeklySummary';
import { FitnessSummaryData, FinanceSummaryData } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';

// Team Wins Section
function TeamWinsSection({ wins }: { wins: string[] }) {
  const { colors: themeColors } = useTheme();

  if (wins.length === 0) return null;

  return (
    <View style={[styles.section, styles.winsSection, { backgroundColor: `${colors.primary}15` }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>🏆</Text>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Team Wins</Text>
      </View>
      <View style={styles.winsList}>
        {wins.map((win, i) => (
          <View key={i} style={styles.winItem}>
            <Text style={styles.winBullet}>•</Text>
            <Text style={[styles.winText, { color: themeColors.text }]}>{win}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Insight Section
function InsightSection({ insight, isQuietWeek }: { insight: string | null; isQuietWeek: boolean }) {
  const { colors: themeColors } = useTheme();

  const displayText = isQuietWeek
    ? "Quiet week! Your agents are ready when you are."
    : insight || "Your squad worked together this week!";

  return (
    <View style={[styles.insightSection, { backgroundColor: themeColors.surface }]}>
      <Ionicons name="sparkles" size={16} color={colors.primary} style={styles.insightIcon} />
      <Text style={[styles.insightText, { color: themeColors.text }]}>{displayText}</Text>
    </View>
  );
}

// Fitness Summary Section
function FitnessSummarySection({ data }: { data: FitnessSummaryData | null }) {
  const { colors: themeColors } = useTheme();

  return (
    <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>💪</Text>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Fitness</Text>
      </View>

      {!data?.hasActivity ? (
        <Text style={[styles.noActivity, { color: themeColors.textMuted }]}>No activity this week</Text>
      ) : (
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColors.text }]}>{data.totalWorkouts}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Workouts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColors.text }]}>{data.streak}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Day Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColors.text }]}>{data.calorieGoalDays}/7</Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Goals Hit</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColors.text }]}>{data.waterGoalDays}/7</Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Water Goals</Text>
          </View>
        </View>
      )}

      {data?.highlights && data.highlights.length > 0 && (
        <View style={styles.highlights}>
          {data.highlights.slice(0, 2).map((h, i) => (
            <Text key={i} style={[styles.highlightText, { color: themeColors.textMuted }]}>
              ✓ {h}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// Finance Summary Section
function FinanceSummarySection({ data }: { data: FinanceSummaryData | null }) {
  const { colors: themeColors } = useTheme();

  const getBudgetColor = () => {
    if (!data) return themeColors.textMuted;
    if (data.budgetStatus === 'under') return '#22c55e';
    if (data.budgetStatus === 'over') return '#ef4444';
    return themeColors.text;
  };

  const getBudgetLabel = () => {
    if (!data) return '';
    if (data.budgetStatus === 'under') return `$${Math.abs(data.budgetDifference).toFixed(0)} under budget`;
    if (data.budgetStatus === 'over') return `$${Math.abs(data.budgetDifference).toFixed(0)} over budget`;
    return 'On budget';
  };

  return (
    <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>💰</Text>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Finance</Text>
      </View>

      {!data?.hasActivity ? (
        <Text style={[styles.noActivity, { color: themeColors.textMuted }]}>No activity this week</Text>
      ) : (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeColors.text }]}>
                ${Math.round(data.totalSpent)}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Total Spent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getBudgetColor() }]}>
                {data.budgetStatus === 'under' ? '✓' : data.budgetStatus === 'over' ? '!' : '='}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>{getBudgetLabel()}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeColors.text }]}>{data.savingsProgress}%</Text>
              <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Savings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeColors.text }]}>{data.daysUnderBudget}/7</Text>
              <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Days Under</Text>
            </View>
          </View>

          {data.topCategory && (
            <View style={styles.topCategory}>
              <Text style={[styles.topCategoryLabel, { color: themeColors.textMuted }]}>
                Top category:
              </Text>
              <Text style={[styles.topCategoryValue, { color: themeColors.text }]}>
                {data.topCategory.name} (${Math.round(data.topCategory.amount)})
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.backButton} />
        <View style={styles.headerTitles}>
          <Skeleton width={120} height={20} />
          <Skeleton width={80} height={14} style={{ marginTop: spacing.xs }} />
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.content}>
        <Skeleton width="100%" height={100} style={{ borderRadius: radius.lg, marginBottom: spacing.lg }} />
        <Skeleton width="100%" height={60} style={{ borderRadius: radius.lg, marginBottom: spacing.lg }} />
        <Skeleton width="100%" height={150} style={{ borderRadius: radius.lg, marginBottom: spacing.lg }} />
        <Skeleton width="100%" height={150} style={{ borderRadius: radius.lg }} />
      </View>
    </View>
  );
}

// Empty state
function EmptyState() {
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={themeColors.text} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Week in Review</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No summary yet</Text>
        <Text style={[styles.emptySubtitle, { color: themeColors.textMuted }]}>
          Your combined summary will appear here on Sundays
        </Text>
      </View>
    </View>
  );
}

export default function CombinedSummaryScreen() {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const { weekStart } = useLocalSearchParams<{ weekStart?: string }>();
  const {
    summary,
    loading,
    fetchRecentSummary,
    fetchSummaryForWeek,
    markAsViewed,
    formatDateRange,
  } = useCombinedWeeklySummary();

  useEffect(() => {
    if (weekStart) {
      fetchSummaryForWeek(weekStart);
    } else {
      fetchRecentSummary();
    }
  }, [weekStart, fetchRecentSummary, fetchSummaryForWeek]);

  useEffect(() => {
    // Mark as viewed when screen opens
    if (summary && !summary.viewed) {
      markAsViewed();
    }
  }, [summary?.id, summary?.viewed, markAsViewed]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!summary) {
    return <EmptyState />;
  }

  const isQuietWeek = !summary.fitness_summary?.hasActivity && !summary.finance_summary?.hasActivity;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={themeColors.text} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Week in Review</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textMuted }]}>
            {formatDateRange(summary.week_start, summary.week_end)}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Team Wins (if any) */}
        <TeamWinsSection wins={summary.team_wins} />

        {/* Insight */}
        <InsightSection insight={summary.insight} isQuietWeek={isQuietWeek} />

        {/* Fitness Section */}
        <FitnessSummarySection data={summary.fitness_summary} />

        {/* Finance Section */}
        <FinanceSummarySection data={summary.finance_summary} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
    fontFamily: fonts.bold,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },

  // Section styles
  section: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  winsSection: {
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },

  // Wins list
  winsList: {
    gap: spacing.xs,
  },
  winItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  winBullet: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  winText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    flex: 1,
  },

  // Insight
  insightSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  insightIcon: {
    marginTop: 2,
  },
  insightText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    flex: 1,
    lineHeight: 20,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    paddingVertical: spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontFamily: fonts.bold,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },

  // Highlights
  highlights: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${colors.primary}20`,
    gap: spacing.xs,
  },
  highlightText: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },

  // Top category
  topCategory: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${colors.primary}20`,
  },
  topCategoryLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  topCategoryValue: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },

  // No activity
  noActivity: {
    fontSize: 14,
    fontFamily: fonts.regular,
    fontStyle: 'italic',
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
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
});
