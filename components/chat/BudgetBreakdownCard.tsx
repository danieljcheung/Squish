import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { EXPENSE_CATEGORIES } from '@/components/ui/LogExpenseSheet';
import { BudgetType, CATEGORY_BUDGET_TYPE, getCategoryBudgetType } from '@/hooks/useFinance';

interface CategoryExpense {
  category: string;
  amount: number;
  budgetType: BudgetType;
}

interface SavingsGoalAllocation {
  id: string;
  name: string;
  icon: string;
  allocated: number;
  target: number;
}

interface BudgetBreakdownData {
  // Overall
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  dailySafeSpend: number;
  daysLeft: number;

  // By budget type
  needsBudget: number;
  needsSpent: number;
  wantsBudget: number;
  wantsSpent: number;
  savingsBudget: number;
  savingsAllocated: number;

  // Category breakdown
  categoryExpenses: CategoryExpense[];

  // Savings goals
  savingsGoals: SavingsGoalAllocation[];

  // Bills paid this month
  billsPaid: { name: string; amount: number }[];
}

interface BudgetBreakdownCardProps {
  data: BudgetBreakdownData;
  currencySymbol?: string;
  onCategoryPress?: (category: string) => void;
  onSavingsGoalPress?: (goalId: string) => void;
}

export function BudgetBreakdownCard({
  data,
  currencySymbol = '$',
  onCategoryPress,
  onSavingsGoalPress,
}: BudgetBreakdownCardProps) {
  const { colors: themeColors } = useTheme();

  const formatAmount = (amount: number) => {
    return `${currencySymbol}${Math.abs(amount).toFixed(2)}`;
  };

  const formatAmountShort = (amount: number) => {
    if (amount >= 1000) {
      return `${currencySymbol}${(amount / 1000).toFixed(1)}k`;
    }
    return `${currencySymbol}${amount.toFixed(0)}`;
  };

  // Get percentage and status color
  const getPercentAndColor = (spent: number, budget: number) => {
    if (budget <= 0) return { percent: 0, color: themeColors.textMuted, status: 'ok' as const };
    const percent = (spent / budget) * 100;
    if (percent >= 100) return { percent, color: '#ef4444', status: 'over' as const };
    if (percent >= 80) return { percent, color: '#f59e0b', status: 'warning' as const };
    return { percent, color: '#22c55e', status: 'ok' as const };
  };

  // Overall progress
  const overallProgress = getPercentAndColor(data.totalSpent, data.totalBudget);
  const needsProgress = getPercentAndColor(data.needsSpent, data.needsBudget);
  const wantsProgress = getPercentAndColor(data.wantsSpent, data.wantsBudget);
  const savingsProgress = getPercentAndColor(data.savingsAllocated, data.savingsBudget);

  // Group expenses by budget type
  const needsExpenses = data.categoryExpenses.filter(e => e.budgetType === 'needs');
  const wantsExpenses = data.categoryExpenses.filter(e => e.budgetType === 'wants');

  // Get category info
  const getCategoryInfo = (categoryId: string) => {
    return EXPENSE_CATEGORIES.find(c => c.id === categoryId);
  };

  // Render a category row
  const renderCategoryRow = (expense: CategoryExpense, sectionBudget: number) => {
    const category = getCategoryInfo(expense.category);
    const icon = category?.icon || '📦';
    const name = category?.name || expense.category;
    const categoryBudget = sectionBudget > 0 ? sectionBudget / 5 : 0; // Rough estimate per category
    const progress = getPercentAndColor(expense.amount, categoryBudget);

    return (
      <Pressable
        key={expense.category}
        style={[styles.categoryRow, { backgroundColor: themeColors.background }]}
        onPress={() => onCategoryPress?.(expense.category)}
      >
        <Text style={styles.categoryIcon}>{icon}</Text>
        <View style={styles.categoryContent}>
          <View style={styles.categoryHeader}>
            <Text style={[styles.categoryName, { color: themeColors.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.categoryAmount, { color: progress.color }]}>
              {formatAmountShort(expense.amount)}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
      </Pressable>
    );
  };

  // Render section
  const renderSection = (
    title: string,
    emoji: string,
    budget: number,
    spent: number,
    expenses: CategoryExpense[],
    progress: { percent: number; color: string; status: string }
  ) => {
    const remaining = budget - spent;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionEmoji}>{emoji}</Text>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{title}</Text>
          </View>
          <View style={styles.sectionStats}>
            <Text style={[styles.sectionSpent, { color: progress.color }]}>
              {formatAmountShort(spent)}
            </Text>
            <Text style={[styles.sectionOf, { color: themeColors.textMuted }]}> / </Text>
            <Text style={[styles.sectionBudget, { color: themeColors.textMuted }]}>
              {formatAmountShort(budget)}
            </Text>
          </View>
        </View>

        {/* Section progress bar */}
        <View style={[styles.progressBar, { backgroundColor: `${themeColors.textMuted}15` }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(progress.percent, 100)}%`,
                backgroundColor: progress.color,
              },
            ]}
          />
        </View>

        {/* Remaining */}
        <Text style={[styles.sectionRemaining, { color: remaining >= 0 ? '#22c55e' : '#ef4444' }]}>
          {remaining >= 0 ? `${formatAmountShort(remaining)} left` : `${formatAmountShort(Math.abs(remaining))} over`}
        </Text>

        {/* Category rows */}
        {expenses.length > 0 && (
          <View style={styles.categoryList}>
            {expenses.map(expense => renderCategoryRow(expense, budget))}
          </View>
        )}
      </View>
    );
  };

  // Calculate unallocated savings
  const allocatedToGoals = data.savingsGoals.reduce((sum, g) => sum + g.allocated, 0);
  const unallocatedSavings = Math.max(0, data.savingsAllocated - allocatedToGoals);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>💰</Text>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Budget Breakdown</Text>
      </View>

      {/* Overview Section */}
      <View style={[styles.overviewSection, { backgroundColor: themeColors.background }]}>
        <View style={styles.overviewHeader}>
          <Text style={[styles.overviewLabel, { color: themeColors.textMuted }]}>
            MONTHLY BUDGET
          </Text>
          <Text style={[styles.overviewPercent, { color: overallProgress.color }]}>
            {overallProgress.percent.toFixed(0)}% used
          </Text>
        </View>

        <View style={styles.overviewAmounts}>
          <Text style={[styles.overviewSpent, { color: themeColors.text }]}>
            {formatAmount(data.totalSpent)}
          </Text>
          <Text style={[styles.overviewOf, { color: themeColors.textMuted }]}> of </Text>
          <Text style={[styles.overviewBudget, { color: themeColors.textMuted }]}>
            {formatAmount(data.totalBudget)}
          </Text>
        </View>

        {/* Main progress bar */}
        <View style={[styles.mainProgressBar, { backgroundColor: `${themeColors.textMuted}20` }]}>
          <View
            style={[
              styles.mainProgressFill,
              {
                width: `${Math.min(overallProgress.percent, 100)}%`,
                backgroundColor: overallProgress.color,
              },
            ]}
          />
        </View>

        {/* Remaining & Daily safe spend */}
        <View style={styles.overviewFooter}>
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewStatLabel, { color: themeColors.textMuted }]}>
              Remaining
            </Text>
            <Text style={[styles.overviewStatValue, { color: data.totalRemaining >= 0 ? '#22c55e' : '#ef4444' }]}>
              {formatAmount(Math.abs(data.totalRemaining))}
            </Text>
          </View>
          <View style={[styles.overviewDivider, { backgroundColor: themeColors.textMuted }]} />
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewStatLabel, { color: themeColors.textMuted }]}>
              Safe to spend/day
            </Text>
            <Text style={[styles.overviewStatValue, { color: themeColors.text }]}>
              {formatAmountShort(data.dailySafeSpend)}
            </Text>
          </View>
          <View style={[styles.overviewDivider, { backgroundColor: themeColors.textMuted }]} />
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewStatLabel, { color: themeColors.textMuted }]}>
              Days left
            </Text>
            <Text style={[styles.overviewStatValue, { color: themeColors.text }]}>
              {data.daysLeft}
            </Text>
          </View>
        </View>
      </View>

      {/* Needs Section */}
      {renderSection('Needs', '🏠', data.needsBudget, data.needsSpent, needsExpenses, needsProgress)}

      {/* Wants Section */}
      {renderSection('Wants', '🎮', data.wantsBudget, data.wantsSpent, wantsExpenses, wantsProgress)}

      {/* Savings Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionEmoji}>💎</Text>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Savings</Text>
          </View>
          <View style={styles.sectionStats}>
            <Text style={[styles.sectionSpent, { color: savingsProgress.color }]}>
              {formatAmountShort(data.savingsAllocated)}
            </Text>
            <Text style={[styles.sectionOf, { color: themeColors.textMuted }]}> / </Text>
            <Text style={[styles.sectionBudget, { color: themeColors.textMuted }]}>
              {formatAmountShort(data.savingsBudget)}
            </Text>
          </View>
        </View>

        {/* Section progress bar */}
        <View style={[styles.progressBar, { backgroundColor: `${themeColors.textMuted}15` }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(savingsProgress.percent, 100)}%`,
                backgroundColor: savingsProgress.color,
              },
            ]}
          />
        </View>

        {/* Savings Goals */}
        {data.savingsGoals.length > 0 && (
          <View style={styles.savingsGoalsList}>
            {data.savingsGoals.map(goal => {
              const goalPercent = goal.target > 0 ? (goal.allocated / goal.target) * 100 : 0;
              return (
                <Pressable
                  key={goal.id}
                  style={[styles.savingsGoalRow, { backgroundColor: themeColors.background }]}
                  onPress={() => onSavingsGoalPress?.(goal.id)}
                >
                  <Text style={styles.savingsGoalIcon}>{goal.icon}</Text>
                  <View style={styles.savingsGoalContent}>
                    <Text style={[styles.savingsGoalName, { color: themeColors.text }]} numberOfLines={1}>
                      {goal.name}
                    </Text>
                    <View style={[styles.savingsGoalBar, { backgroundColor: `${themeColors.textMuted}15` }]}>
                      <View
                        style={[
                          styles.savingsGoalBarFill,
                          {
                            width: `${Math.min(goalPercent, 100)}%`,
                            backgroundColor: goalPercent >= 100 ? '#22c55e' : themeColors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={[styles.savingsGoalAmount, { color: themeColors.text }]}>
                    {formatAmountShort(goal.allocated)}
                  </Text>
                </Pressable>
              );
            })}

            {/* Unallocated savings */}
            {unallocatedSavings > 0 && (
              <View style={[styles.unallocatedRow, { backgroundColor: themeColors.background }]}>
                <Text style={styles.savingsGoalIcon}>📦</Text>
                <Text style={[styles.unallocatedLabel, { color: themeColors.textMuted }]}>
                  Unallocated
                </Text>
                <Text style={[styles.savingsGoalAmount, { color: themeColors.textMuted }]}>
                  {formatAmountShort(unallocatedSavings)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
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
  // Overview section
  overviewSection: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  overviewLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  overviewPercent: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  overviewAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  overviewSpent: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  overviewOf: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  overviewBudget: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
  mainProgressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  mainProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  overviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewStat: {
    flex: 1,
    alignItems: 'center',
  },
  overviewStatLabel: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: 2,
  },
  overviewStatValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  overviewDivider: {
    width: 1,
    height: 24,
    opacity: 0.2,
  },
  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionEmoji: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  sectionStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionSpent: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  sectionOf: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  sectionBudget: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionRemaining: {
    fontSize: 12,
    fontFamily: fonts.medium,
    marginBottom: spacing.sm,
  },
  categoryList: {
    gap: spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryContent: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text,
    flex: 1,
  },
  categoryAmount: {
    fontSize: 14,
    fontFamily: fonts.bold,
    marginLeft: spacing.sm,
  },
  // Savings goals
  savingsGoalsList: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  savingsGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  savingsGoalIcon: {
    fontSize: 20,
  },
  savingsGoalContent: {
    flex: 1,
  },
  savingsGoalName: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
    marginBottom: 4,
  },
  savingsGoalBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  savingsGoalBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  savingsGoalAmount: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  unallocatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  unallocatedLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
  },
});
