import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { EXPENSE_CATEGORIES } from '@/components/ui/LogExpenseSheet';

interface CategorySpending {
  category: string;
  amount: number;
}

interface FinanceSummaryData {
  period: 'week' | 'month';
  periodLabel: string; // e.g., "This Week" or "January 2025"
  totalSpent: number;
  totalIncome: number;
  transactionCount: number;
  byCategory: CategorySpending[];
  dailyAverage: number;
  budgetUsed?: number; // percentage
  comparedToPrevious?: number; // percentage change vs last period
}

interface FinanceSummaryCardProps {
  data: FinanceSummaryData;
  currencySymbol?: string;
}

export function FinanceSummaryCard({
  data,
  currencySymbol = '$',
}: FinanceSummaryCardProps) {
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

  const netSavings = data.totalIncome - data.totalSpent;
  const isPositive = netSavings >= 0;

  // Get top 4 categories
  const topCategories = data.byCategory
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  // Calculate percentages for bar chart
  const maxCategoryAmount = topCategories.length > 0 ? topCategories[0].amount : 0;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>
          {data.period === 'week' ? '📊' : '📅'}
        </Text>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {data.periodLabel}
        </Text>
        {data.comparedToPrevious !== undefined && (
          <View style={[
            styles.comparisonBadge,
            { backgroundColor: data.comparedToPrevious <= 0 ? '#dcfce7' : '#fef2f2' }
          ]}>
            <Text style={[
              styles.comparisonText,
              { color: data.comparedToPrevious <= 0 ? '#16a34a' : '#dc2626' }
            ]}>
              {data.comparedToPrevious <= 0 ? '↓' : '↑'} {Math.abs(data.comparedToPrevious)}%
            </Text>
          </View>
        )}
      </View>

      {/* Main Stats Row */}
      <View style={[styles.statsRow, { backgroundColor: themeColors.background }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Spent</Text>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>
            {formatAmount(data.totalSpent)}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: `${themeColors.textMuted}20` }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Income</Text>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>
            {formatAmount(data.totalIncome)}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: `${themeColors.textMuted}20` }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Net</Text>
          <Text style={[styles.statValue, { color: isPositive ? '#22c55e' : '#ef4444' }]}>
            {isPositive ? '+' : '-'}{formatAmount(Math.abs(netSavings))}
          </Text>
        </View>
      </View>

      {/* Daily Average & Budget */}
      <View style={styles.secondaryStats}>
        <View style={styles.secondaryStat}>
          <Text style={[styles.secondaryLabel, { color: themeColors.textMuted }]}>
            Daily avg
          </Text>
          <Text style={[styles.secondaryValue, { color: themeColors.text }]}>
            {formatAmountShort(data.dailyAverage)}/day
          </Text>
        </View>
        {data.budgetUsed !== undefined && (
          <View style={styles.secondaryStat}>
            <Text style={[styles.secondaryLabel, { color: themeColors.textMuted }]}>
              Budget used
            </Text>
            <Text style={[
              styles.secondaryValue,
              { color: data.budgetUsed > 100 ? '#ef4444' : data.budgetUsed > 80 ? '#f59e0b' : themeColors.text }
            ]}>
              {data.budgetUsed.toFixed(0)}%
            </Text>
          </View>
        )}
        <View style={styles.secondaryStat}>
          <Text style={[styles.secondaryLabel, { color: themeColors.textMuted }]}>
            Transactions
          </Text>
          <Text style={[styles.secondaryValue, { color: themeColors.text }]}>
            {data.transactionCount}
          </Text>
        </View>
      </View>

      {/* Top Spending Categories */}
      {topCategories.length > 0 && (
        <View style={styles.categoriesSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.textMuted }]}>
            TOP SPENDING
          </Text>
          <View style={styles.categoriesList}>
            {topCategories.map((cat, index) => {
              const category = EXPENSE_CATEGORIES.find(c => c.id === cat.category);
              const percentage = maxCategoryAmount > 0 ? (cat.amount / maxCategoryAmount) * 100 : 0;

              return (
                <View key={cat.category} style={styles.categoryRow}>
                  <Text style={styles.categoryIcon}>{category?.icon || '📦'}</Text>
                  <View style={styles.categoryContent}>
                    <View style={styles.categoryHeader}>
                      <Text style={[styles.categoryName, { color: themeColors.text }]} numberOfLines={1}>
                        {category?.name || cat.category}
                      </Text>
                      <Text style={[styles.categoryAmount, { color: themeColors.text }]}>
                        {formatAmountShort(cat.amount)}
                      </Text>
                    </View>
                    <View style={[styles.categoryBar, { backgroundColor: themeColors.background }]}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: index === 0 ? themeColors.primary : `${themeColors.primary}80`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
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
    flex: 1,
  },
  comparisonBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  comparisonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: `${colors.textMuted}20`,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  secondaryStat: {
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: 2,
  },
  secondaryValue: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  categoriesSection: {
    borderTopWidth: 1,
    borderTopColor: colors.background,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  categoriesList: {
    gap: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  categoryContent: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
    flex: 1,
  },
  categoryAmount: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  categoryBar: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
