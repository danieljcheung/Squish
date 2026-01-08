import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { EXPENSE_CATEGORIES } from '@/components/ui/LogExpenseSheet';
import { INCOME_CATEGORIES } from '@/components/ui/AddIncomeSheet';

type LogType = 'expense' | 'income' | 'bill';

interface LogConfirmationData {
  type: LogType;
  amount: number;
  category: string;
  description?: string;
  timestamp: string;
  receiptUrl?: string;
  budgetImpact?: {
    todaySpent: number;
    dailyRemaining: number;
    categoryRemaining: number;
    categoryBudget: number;
    percentUsed: number;
  };
}

interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
}

interface LogConfirmationCardProps {
  data: LogConfirmationData;
  currencySymbol?: string;
  onUndo?: () => void;
  onEdit?: () => void;
  onAllocateToSavings?: (goalId: string, amount: number) => void;
  savingsGoals?: SavingsGoal[];
}

export function LogConfirmationCard({
  data,
  currencySymbol = '$',
  onUndo,
  onEdit,
  onAllocateToSavings,
  savingsGoals = [],
}: LogConfirmationCardProps) {
  const { colors: themeColors } = useTheme();

  const formatAmount = (amount: number) => {
    return `${currencySymbol}${Math.abs(amount).toFixed(2)}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dayLabel = '';
    if (date.toDateString() === today.toDateString()) {
      dayLabel = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dayLabel = 'Yesterday';
    } else {
      dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return dayLabel;
  };

  // Get category info
  const getCategoryInfo = () => {
    if (data.type === 'income') {
      return INCOME_CATEGORIES.find(c => c.id === data.category);
    }
    return EXPENSE_CATEGORIES.find(c => c.id === data.category);
  };

  const category = getCategoryInfo();
  const icon = category?.icon || (data.type === 'income' ? '💵' : '📦');
  const categoryName = category?.name || data.category;

  // Get colors based on type
  const getTypeColor = () => {
    switch (data.type) {
      case 'income':
        return '#22c55e';
      case 'expense':
      case 'bill':
        return '#ef4444';
      default:
        return themeColors.text;
    }
  };

  const getTypeBgColor = () => {
    switch (data.type) {
      case 'income':
        return '#dcfce7';
      case 'expense':
      case 'bill':
        return '#fef2f2';
      default:
        return themeColors.background;
    }
  };

  const getTypeLabel = () => {
    switch (data.type) {
      case 'income':
        return 'Income Added';
      case 'expense':
        return 'Expense Logged';
      case 'bill':
        return 'Bill Paid';
      default:
        return 'Logged';
    }
  };

  const getTypeIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (data.type) {
      case 'income':
        return 'arrow-down-circle';
      case 'expense':
      case 'bill':
        return 'arrow-up-circle';
      default:
        return 'checkmark-circle';
    }
  };

  const CardWrapper = onEdit ? Pressable : View;
  const cardWrapperProps = onEdit ? { onPress: onEdit } : {};

  return (
    <CardWrapper
      style={[styles.container, { backgroundColor: themeColors.surface }]}
      {...cardWrapperProps}
    >
      {/* Success Header */}
      <View style={[styles.header, { backgroundColor: getTypeBgColor() }]}>
        <Ionicons name={getTypeIcon()} size={20} color={getTypeColor()} />
        <Text style={[styles.headerText, { color: getTypeColor() }]}>
          {getTypeLabel()}
        </Text>
        <Text style={[styles.headerTime, { color: `${getTypeColor()}90` }]}>
          {formatTime(data.timestamp)}
        </Text>
        {onEdit && (
          <Ionicons name="chevron-forward" size={16} color={`${getTypeColor()}60`} />
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.mainRow}>
          {/* Receipt thumbnail or category icon */}
          {data.receiptUrl ? (
            <View style={styles.receiptContainer}>
              <Image source={{ uri: data.receiptUrl }} style={styles.receiptImage} />
              <View style={styles.receiptBadge}>
                <Text style={styles.categoryIconSmall}>{icon}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.categoryIcon}>{icon}</Text>
          )}

          <View style={styles.details}>
            <Text style={[styles.amount, { color: getTypeColor() }]}>
              {data.type === 'income' ? '+' : '-'}{formatAmount(data.amount)}
            </Text>
            {data.description ? (
              <Text style={[styles.description, { color: themeColors.text }]} numberOfLines={1}>
                {data.description}
              </Text>
            ) : (
              <Text style={[styles.categoryName, { color: themeColors.textMuted }]}>
                {categoryName}
              </Text>
            )}
          </View>
        </View>

        {/* Budget Impact (for expenses) */}
        {data.budgetImpact && data.type !== 'income' && (
          <View style={[styles.impactSection, { borderTopColor: themeColors.background }]}>
            <View style={styles.impactRow}>
              <Text style={[styles.impactLabel, { color: themeColors.textMuted }]}>
                Today
              </Text>
              <Text style={[styles.impactValue, { color: themeColors.text }]}>
                {formatAmount(data.budgetImpact.todaySpent)} spent
              </Text>
            </View>
            <View style={styles.impactRow}>
              <Text style={[styles.impactLabel, { color: themeColors.textMuted }]}>
                {categoryName} budget
              </Text>
              <Text style={[
                styles.impactValue,
                { color: data.budgetImpact.categoryRemaining >= 0 ? '#22c55e' : '#ef4444' }
              ]}>
                {formatAmount(data.budgetImpact.categoryRemaining)} left
              </Text>
            </View>
          </View>
        )}

        {/* Allocate to Savings (for income) */}
        {data.type === 'income' && savingsGoals.length > 0 && onAllocateToSavings && (
          <View style={[styles.savingsSection, { borderTopColor: themeColors.background }]}>
            <Text style={[styles.savingsLabel, { color: themeColors.textMuted }]}>
              Add to savings goal?
            </Text>
            <View style={styles.savingsGoals}>
              {savingsGoals.slice(0, 3).map((goal) => (
                <Pressable
                  key={goal.id}
                  style={[styles.savingsGoalButton, { backgroundColor: themeColors.background }]}
                  onPress={() => onAllocateToSavings(goal.id, data.amount)}
                >
                  <Text style={styles.savingsGoalIcon}>{goal.icon}</Text>
                  <Text style={[styles.savingsGoalName, { color: themeColors.text }]} numberOfLines={1}>
                    {goal.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {onUndo && (
        <Pressable
          style={[styles.undoButton, { borderTopColor: themeColors.background }]}
          onPress={onUndo}
        >
          <Ionicons name="arrow-undo-outline" size={16} color={themeColors.textMuted} />
          <Text style={[styles.undoText, { color: themeColors.textMuted }]}>Undo</Text>
        </Pressable>
      )}
    </CardWrapper>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    flex: 1,
  },
  headerTime: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  content: {
    padding: spacing.lg,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryIconSmall: {
    fontSize: 14,
  },
  receiptContainer: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  receiptImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  receiptBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  details: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text,
    marginTop: 2,
  },
  amount: {
    fontSize: 22,
    fontFamily: fonts.bold,
  },
  impactSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
    gap: spacing.xs,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  impactValue: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  savingsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  savingsLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  savingsGoals: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  savingsGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    maxWidth: '45%',
  },
  savingsGoalIcon: {
    fontSize: 16,
  },
  savingsGoalName: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.text,
    flex: 1,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  undoText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
});
