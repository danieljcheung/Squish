import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  monthly_contribution?: number;
}

interface SavingsGoalsCardProps {
  goals: SavingsGoal[];
  currencySymbol?: string;
  onAddGoal?: () => void;
  onViewGoal?: (goal: SavingsGoal) => void;
}

export function SavingsGoalsCard({
  goals,
  currencySymbol = '$',
  onAddGoal,
  onViewGoal,
}: SavingsGoalsCardProps) {
  const { colors: themeColors } = useTheme();

  const formatAmount = (amount: number) => {
    if (amount >= 1000) {
      return `${currencySymbol}${(amount / 1000).toFixed(1)}k`;
    }
    return `${currencySymbol}${amount.toFixed(0)}`;
  };

  const formatFullAmount = (amount: number) => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  // Calculate totals
  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  // Get progress color based on percentage
  const getProgressColor = (percent: number) => {
    if (percent >= 100) return '#22c55e';
    if (percent >= 75) return '#4ade80';
    if (percent >= 50) return themeColors.primary;
    if (percent >= 25) return '#fbbf24';
    return '#f97316';
  };

  // Calculate months to goal
  const getMonthsToGoal = (goal: SavingsGoal): string | null => {
    if (!goal.monthly_contribution || goal.monthly_contribution <= 0) return null;
    const remaining = goal.target_amount - goal.current_amount;
    if (remaining <= 0) return 'Complete!';
    const months = Math.ceil(remaining / goal.monthly_contribution);
    if (months === 1) return '~1 month';
    if (months < 12) return `~${months} months`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `~${years}y`;
    return `~${years}y ${remainingMonths}m`;
  };

  if (goals.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.surface }]}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🎯</Text>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Savings Goals</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Goals Yet</Text>
          <Text style={[styles.emptyDescription, { color: themeColors.textMuted }]}>
            Set savings goals to track your progress
          </Text>
          {onAddGoal && (
            <Pressable
              style={[styles.addButtonLarge, { backgroundColor: themeColors.primary }]}
              onPress={onAddGoal}
            >
              <Ionicons name="add" size={20} color="#101914" />
              <Text style={styles.addButtonLargeText}>Add Goal</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🎯</Text>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Savings Goals</Text>
      </View>

      {/* Overall Progress */}
      <View style={[styles.overallSection, { backgroundColor: themeColors.background }]}>
        <View style={styles.overallHeader}>
          <Text style={[styles.overallLabel, { color: themeColors.textMuted }]}>Total Saved</Text>
          <Text style={[styles.overallPercent, { color: getProgressColor(overallProgress) }]}>
            {overallProgress.toFixed(0)}%
          </Text>
        </View>
        <View style={styles.overallAmounts}>
          <Text style={[styles.overallSaved, { color: themeColors.text }]}>
            {formatAmount(totalSaved)}
          </Text>
          <Text style={[styles.overallOf, { color: themeColors.textMuted }]}> of </Text>
          <Text style={[styles.overallTarget, { color: themeColors.textMuted }]}>
            {formatAmount(totalTarget)}
          </Text>
        </View>
        <View style={[styles.overallBar, { backgroundColor: `${themeColors.textMuted}20` }]}>
          <View
            style={[
              styles.overallBarFill,
              {
                width: `${Math.min(overallProgress, 100)}%`,
                backgroundColor: getProgressColor(overallProgress),
              },
            ]}
          />
        </View>
      </View>

      {/* Individual Goals */}
      <View style={styles.goalsList}>
        {goals.map((goal) => {
          const percent = (goal.current_amount / goal.target_amount) * 100;
          const isComplete = percent >= 100;
          const monthsToGoal = getMonthsToGoal(goal);

          return (
            <Pressable
              key={goal.id}
              style={[styles.goalRow, { backgroundColor: themeColors.background }]}
              onPress={() => onViewGoal?.(goal)}
            >
              <View style={styles.goalIconContainer}>
                <Text style={styles.goalIcon}>{goal.icon || '💰'}</Text>
                {isComplete && (
                  <View style={styles.completeBadge}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </View>

              <View style={styles.goalContent}>
                <View style={styles.goalHeader}>
                  <Text style={[styles.goalName, { color: themeColors.text }]} numberOfLines={1}>
                    {goal.name}
                  </Text>
                  <Text style={[styles.goalPercent, { color: getProgressColor(percent) }]}>
                    {percent.toFixed(0)}%
                  </Text>
                </View>

                <View style={styles.goalAmounts}>
                  <Text style={[styles.goalCurrent, { color: themeColors.text }]}>
                    {formatFullAmount(goal.current_amount)}
                  </Text>
                  <Text style={[styles.goalDivider, { color: themeColors.textMuted }]}> / </Text>
                  <Text style={[styles.goalTarget, { color: themeColors.textMuted }]}>
                    {formatFullAmount(goal.target_amount)}
                  </Text>
                </View>

                <View style={[styles.goalBar, { backgroundColor: `${themeColors.textMuted}15` }]}>
                  <View
                    style={[
                      styles.goalBarFill,
                      {
                        width: `${Math.min(percent, 100)}%`,
                        backgroundColor: getProgressColor(percent),
                      },
                    ]}
                  />
                </View>

                {monthsToGoal && (
                  <Text style={[styles.goalEta, { color: themeColors.textMuted }]}>
                    {isComplete ? '🎉 Goal reached!' : `${monthsToGoal} to go`}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Add Goal Button */}
      {onAddGoal && (
        <Pressable
          style={[styles.addGoalButton, { backgroundColor: themeColors.background }]}
          onPress={onAddGoal}
        >
          <Ionicons name="add-circle-outline" size={18} color={themeColors.primary} />
          <Text style={[styles.addGoalButtonText, { color: themeColors.primary }]}>Add Goal</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerIcon: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  // Overall section
  overallSection: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  overallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  overallLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overallPercent: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  overallAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  overallSaved: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  overallOf: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  overallTarget: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
  overallBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Goals list
  goalsList: {
    gap: spacing.sm,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
  },
  goalIconContainer: {
    position: 'relative',
  },
  goalIcon: {
    fontSize: 28,
  },
  completeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalContent: {
    flex: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  goalName: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    flex: 1,
  },
  goalPercent: {
    fontSize: 13,
    fontFamily: fonts.bold,
    marginLeft: spacing.sm,
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  goalCurrent: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  goalDivider: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  goalTarget: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  goalBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalEta: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  // Add goal button
  addGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  addGoalButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  addButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  addButtonLargeText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: '#101914',
  },
});
