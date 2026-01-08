import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { EXPENSE_CATEGORIES } from '@/components/ui/LogExpenseSheet';
import type { BudgetTracking } from '@/hooks/useFinance';

interface DailyFinance {
  total_spent: number;
  total_income: number;
  expense_count: number;
  income_count: number;
}

interface MonthlyBudget {
  totalSpent: number;
  totalIncome: number;
  remaining: number;
  expenseCount: number;
  incomeCount: number;
  byCategory: Record<string, number>;
}

interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
}

interface FinanceProgressCardProps {
  todayFinance?: DailyFinance | null;
  monthlyBudget?: MonthlyBudget | null;
  budgetTracking?: BudgetTracking | null;
  savingsGoals?: SavingsGoal[];
  currencySymbol?: string;
  monthlyBudgetTarget?: number;
}

const COLLAPSED_HEIGHT = 48;
const EXPANDED_HEIGHT = 340;

// Get alert color based on level
function getAlertColor(level: 'ok' | 'warning' | 'danger' | 'over'): string {
  switch (level) {
    case 'over': return '#ef4444';
    case 'danger': return '#f97316';
    case 'warning': return '#eab308';
    default: return '#4ade80';
  }
}

export function FinanceProgressCard({
  todayFinance,
  monthlyBudget,
  budgetTracking,
  savingsGoals = [],
  currencySymbol = '$',
  monthlyBudgetTarget,
}: FinanceProgressCardProps) {
  const { colors: themeColors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const height = useSharedValue(COLLAPSED_HEIGHT);
  const rotation = useSharedValue(180);
  const contentOpacity = useSharedValue(0);

  const todaySpent = budgetTracking?.todaySpent || todayFinance?.total_spent || 0;
  const todayExpenseCount = todayFinance?.expense_count || 0;
  const monthlySpent = monthlyBudget?.totalSpent || 0;
  const monthlyRemaining = monthlyBudget?.remaining || 0;
  const monthlyIncome = monthlyBudget?.totalIncome || 0;

  // Budget tracking values
  const dailySafeSpend = budgetTracking?.dailySafeSpend || 0;
  const daysLeft = budgetTracking?.daysLeftInMonth || 30;
  const needsSpent = budgetTracking?.needsSpent || 0;
  const needsBudget = budgetTracking?.needsBudget || 0;
  const needsPercent = budgetTracking?.needsPercent || 0;
  const wantsSpent = budgetTracking?.wantsSpent || 0;
  const wantsBudget = budgetTracking?.wantsBudget || 0;
  const wantsPercent = budgetTracking?.wantsPercent || 0;
  const needsAlertLevel = budgetTracking?.needsAlertLevel || 'ok';
  const wantsAlertLevel = budgetTracking?.wantsAlertLevel || 'ok';

  // Use monthly budget target from props or calculate from income (80% needs/wants)
  const budgetTarget = monthlyBudgetTarget || monthlyIncome * 0.8;
  const budgetPercent = budgetTarget > 0 ? Math.min((monthlySpent / budgetTarget) * 100, 100) : 0;
  const isOverBudget = monthlySpent > budgetTarget && budgetTarget > 0;

  // Get top spending categories
  const topCategories = monthlyBudget?.byCategory
    ? Object.entries(monthlyBudget.byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    : [];

  const toggleExpanded = () => {
    const toExpanded = !isExpanded;
    setIsExpanded(toExpanded);

    const targetHeight = toExpanded
      ? EXPANDED_HEIGHT + (savingsGoals.length > 0 ? 80 : 0)
      : COLLAPSED_HEIGHT;

    height.value = withTiming(targetHeight, {
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    rotation.value = withTiming(toExpanded ? 0 : 180, {
      duration: 200,
    });
    contentOpacity.value = withTiming(toExpanded ? 1 : 0, {
      duration: toExpanded ? 200 : 100,
    });
  };

  const containerStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const expandedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const formatAmount = (amount: number) => {
    return `${currencySymbol}${Math.abs(amount).toFixed(0)}`;
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: themeColors.surface }, containerStyle]}>
      {/* Collapsed Header - Always visible */}
      <Pressable style={styles.collapsedHeader} onPress={toggleExpanded}>
        {/* Left content - today's spending, daily budget, and monthly left */}
        <View style={styles.collapsedContent}>
          <Text style={styles.moneyEmoji}>💰</Text>
          <Text style={[styles.collapsedAmount, { color: themeColors.text }]}>
            {formatAmount(todaySpent)}
          </Text>
          <Text style={[styles.collapsedLabel, { color: themeColors.textMuted }]}>today</Text>

          <View style={[styles.collapsedDivider, { backgroundColor: `${themeColors.textMuted}30` }]} />

          <Text style={[styles.collapsedDailyBudget, { color: themeColors.primary }]}>
            {formatAmount(dailySafeSpend)}
          </Text>
          <Text style={[styles.collapsedLabel, { color: themeColors.textMuted }]}>/day</Text>

          <View style={[styles.collapsedDivider, { backgroundColor: `${themeColors.textMuted}30` }]} />

          <Text style={[
            styles.collapsedRemaining,
            { color: monthlyRemaining >= 0 ? '#4ade80' : '#FF6B6B' }
          ]}>
            {formatAmount(monthlyRemaining)}
          </Text>
          <Text style={[styles.collapsedLabel, { color: themeColors.textMuted }]}>left</Text>

          {savingsGoals.length > 0 && (
            <>
              <View style={[styles.collapsedDivider, { backgroundColor: `${themeColors.textMuted}30` }]} />
              <Text style={styles.goalEmoji}>🎯</Text>
              <Text style={[styles.collapsedGoalCount, { color: themeColors.primary }]}>
                {savingsGoals.length}
              </Text>
            </>
          )}
        </View>

        {/* Chevron button - fixed on right */}
        <Pressable
          style={[styles.chevronButton, { backgroundColor: `${themeColors.textMuted}10` }]}
          onPress={toggleExpanded}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={18} color={themeColors.textMuted} />
          </Animated.View>
        </Pressable>
      </Pressable>

      {/* Expanded Content - budget breakdown + goals */}
      <Animated.View style={[styles.expandedContent, expandedContentStyle]}>
        {/* Daily Safe Spend */}
        <View style={styles.dailySpendSection}>
          <View style={styles.dailySpendRow}>
            <Text style={[styles.dailySpendLabel, { color: themeColors.textMuted }]}>
              Daily Budget
            </Text>
            <Text style={[styles.dailySpendValue, { color: themeColors.primary }]}>
              {formatAmount(dailySafeSpend)}/day
            </Text>
          </View>
          <Text style={[styles.daysLeftText, { color: themeColors.textMuted }]}>
            {daysLeft} days left in month
          </Text>
        </View>

        {/* Needs Budget */}
        <View style={styles.budgetTypeSection}>
          <View style={styles.budgetTypeHeader}>
            <Text style={[styles.budgetTypeLabel, { color: themeColors.text }]}>
              Needs
            </Text>
            <Text style={[styles.budgetTypePercent, { color: getAlertColor(needsAlertLevel) }]}>
              {needsPercent.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.budgetTypeAmounts}>
            <Text style={[styles.budgetTypeSpent, { color: themeColors.text }]}>
              {formatAmount(needsSpent)}
            </Text>
            <Text style={[styles.budgetTypeDivider, { color: themeColors.textMuted }]}> / </Text>
            <Text style={[styles.budgetTypeTarget, { color: themeColors.textMuted }]}>
              {formatAmount(needsBudget)}
            </Text>
          </View>
          <View style={[styles.budgetTypeTrack, { backgroundColor: themeColors.background }]}>
            <View
              style={[
                styles.budgetTypeFill,
                {
                  width: `${Math.min(needsPercent, 100)}%`,
                  backgroundColor: getAlertColor(needsAlertLevel),
                },
              ]}
            />
          </View>
        </View>

        {/* Wants Budget */}
        <View style={styles.budgetTypeSection}>
          <View style={styles.budgetTypeHeader}>
            <Text style={[styles.budgetTypeLabel, { color: themeColors.text }]}>
              Wants
            </Text>
            <Text style={[styles.budgetTypePercent, { color: getAlertColor(wantsAlertLevel) }]}>
              {wantsPercent.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.budgetTypeAmounts}>
            <Text style={[styles.budgetTypeSpent, { color: themeColors.text }]}>
              {formatAmount(wantsSpent)}
            </Text>
            <Text style={[styles.budgetTypeDivider, { color: themeColors.textMuted }]}> / </Text>
            <Text style={[styles.budgetTypeTarget, { color: themeColors.textMuted }]}>
              {formatAmount(wantsBudget)}
            </Text>
          </View>
          <View style={[styles.budgetTypeTrack, { backgroundColor: themeColors.background }]}>
            <View
              style={[
                styles.budgetTypeFill,
                {
                  width: `${Math.min(wantsPercent, 100)}%`,
                  backgroundColor: getAlertColor(wantsAlertLevel),
                },
              ]}
            />
          </View>
        </View>

        {/* Top Spending Categories */}
        {topCategories.length > 0 && (
          <View style={styles.categoriesSection}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Top Spending</Text>
            <View style={styles.categoriesList}>
              {topCategories.map(([categoryId, amount]) => {
                const category = EXPENSE_CATEGORIES.find(c => c.id === categoryId);
                return (
                  <View key={categoryId} style={styles.categoryItem}>
                    <Text style={styles.categoryIcon}>
                      {category?.icon || '📦'}
                    </Text>
                    <Text style={[styles.categoryName, { color: themeColors.text }]}>
                      {category?.name || categoryId}
                    </Text>
                    <Text style={[styles.categoryAmount, { color: themeColors.textMuted }]}>
                      {formatAmount(amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Savings Goals */}
        {savingsGoals.length > 0 && (
          <View style={[styles.goalsSection, { borderTopColor: themeColors.background }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Savings Goals</Text>
            <View style={styles.goalsList}>
              {savingsGoals.slice(0, 2).map((goal) => {
                const percent = (goal.current_amount / goal.target_amount) * 100;
                return (
                  <View key={goal.id} style={styles.goalItem}>
                    <View style={styles.goalHeader}>
                      <Text style={styles.goalIcon}>{goal.icon}</Text>
                      <Text style={[styles.goalName, { color: themeColors.text }]} numberOfLines={1}>
                        {goal.name}
                      </Text>
                      <Text style={[styles.goalPercent, { color: themeColors.primary }]}>
                        {Math.round(percent)}%
                      </Text>
                    </View>
                    <View style={[styles.goalTrack, { backgroundColor: themeColors.background }]}>
                      <View
                        style={[
                          styles.goalFill,
                          {
                            width: `${Math.min(percent, 100)}%`,
                            backgroundColor: percent >= 100 ? '#4ade80' : themeColors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  // Collapsed header
  collapsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    height: COLLAPSED_HEIGHT,
    gap: spacing.md,
  },
  collapsedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  moneyEmoji: {
    fontSize: 18,
  },
  collapsedAmount: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  collapsedLabel: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  collapsedDivider: {
    width: 1,
    height: 16,
    backgroundColor: `${colors.textMuted}30`,
    marginHorizontal: spacing.xs,
  },
  collapsedRemaining: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  collapsedDailyBudget: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
  },
  goalEmoji: {
    fontSize: 14,
  },
  collapsedGoalCount: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  chevronButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // Expanded content
  expandedContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  // Daily spend section
  dailySpendSection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.textMuted}15`,
  },
  dailySpendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailySpendLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  dailySpendValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  daysLeftText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  // Budget type section (needs/wants)
  budgetTypeSection: {
    marginBottom: spacing.md,
  },
  budgetTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetTypeLabel: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  budgetTypePercent: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  budgetTypeAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  budgetTypeSpent: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  budgetTypeDivider: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  budgetTypeTarget: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  budgetTypeTrack: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetTypeFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Budget section
  budgetSection: {
    marginBottom: spacing.lg,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  budgetAmount: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  budgetTarget: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  budgetTrack: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    borderRadius: 4,
  },
  overBudgetText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#FF6B6B',
    marginTop: spacing.xs,
  },
  // Categories section
  categoriesSection: {
    marginBottom: spacing.lg,
  },
  categoriesList: {
    gap: spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  categoryAmount: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textMuted,
  },
  // Goals section
  goalsSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  goalsList: {
    gap: spacing.md,
  },
  goalItem: {},
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  goalIcon: {
    fontSize: 14,
  },
  goalName: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  goalPercent: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  goalTrack: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 3,
  },
});
