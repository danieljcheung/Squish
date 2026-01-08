import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { EXPENSE_CATEGORIES } from '@/components/ui/LogExpenseSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Expense {
  id: string;
  amount: number;
  category: string;
  description?: string;
  expense_date: string;
  created_at: string;
}

interface CategoryExpensesSheetProps {
  visible: boolean;
  onClose: () => void;
  category: string;
  expenses: Expense[];
  currencySymbol?: string;
}

export function CategoryExpensesSheet({
  visible,
  onClose,
  category,
  expenses,
  currencySymbol = '$',
}: CategoryExpensesSheetProps) {
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();

  // Get category info
  const categoryInfo = EXPENSE_CATEGORIES.find(c => c.id === category);
  const categoryIcon = categoryInfo?.icon || '📦';
  const categoryName = categoryInfo?.name || category;

  // Calculate totals
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseCount = expenses.length;

  // Format amount
  const formatAmount = (amount: number) => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group expenses by date
  const groupedExpenses = expenses.reduce((groups, expense) => {
    const date = expense.expense_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(expense);
    return groups;
  }, {} as Record<string, Expense[]>);

  // Sort dates descending
  const sortedDates = Object.keys(groupedExpenses).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Drag Handle */}
        <View style={styles.dragHandleContainer}>
          <View style={[styles.dragHandle, { backgroundColor: themeColors.textMuted }]} />
        </View>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColors.surface }]}>
          <View style={styles.headerContent}>
            <Text style={styles.categoryIcon}>{categoryIcon}</Text>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: themeColors.text }]}>{categoryName}</Text>
              <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
                {expenseCount} expense{expenseCount !== 1 ? 's' : ''} this month
              </Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-circle" size={28} color={themeColors.textMuted} />
          </Pressable>
        </View>

        {/* Total */}
        <View style={[styles.totalCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.totalLabel, { color: themeColors.textMuted }]}>Total Spent</Text>
          <Text style={[styles.totalAmount, { color: '#ef4444' }]}>
            {formatAmount(totalAmount)}
          </Text>
        </View>

        {/* Expenses List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Expenses</Text>
              <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
                No expenses logged in this category yet.
              </Text>
            </View>
          ) : (
            sortedDates.map(date => (
              <View key={date} style={styles.dateGroup}>
                <Text style={[styles.dateHeader, { color: themeColors.textMuted }]}>
                  {formatDate(date)}
                </Text>
                {groupedExpenses[date].map(expense => (
                  <View
                    key={expense.id}
                    style={[styles.expenseRow, { backgroundColor: themeColors.surface }]}
                  >
                    <View style={styles.expenseContent}>
                      <Text style={[styles.expenseDescription, { color: themeColors.text }]}>
                        {expense.description || 'No description'}
                      </Text>
                      <Text style={[styles.expenseTime, { color: themeColors.textMuted }]}>
                        {formatTime(expense.created_at)}
                      </Text>
                    </View>
                    <Text style={[styles.expenseAmount, { color: '#ef4444' }]}>
                      -{formatAmount(expense.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  categoryIcon: {
    fontSize: 32,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.xs,
  },
  totalCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  totalAmount: {
    fontSize: 32,
    fontFamily: fonts.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  dateGroup: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  expenseContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  expenseDescription: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  expenseTime: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
