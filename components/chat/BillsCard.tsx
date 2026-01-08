import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { RecurringBill, getDaysUntilDue, formatDueDate } from '@/hooks/useBills';

interface BillsCardProps {
  bills: RecurringBill[];
  monthlyTotal?: number;
  subscriptionsTotal?: number;
  currencySymbol?: string;
  onAddBill?: () => void;
  onPayBill?: (billId: string) => void;
  onViewBill?: (bill: RecurringBill) => void;
  compact?: boolean; // For chat display
}

export function BillsCard({
  bills,
  monthlyTotal = 0,
  subscriptionsTotal = 0,
  currencySymbol = '$',
  onAddBill,
  onPayBill,
  onViewBill,
  compact = false,
}: BillsCardProps) {
  const { colors: themeColors } = useTheme();

  // Separate upcoming bills and subscriptions
  const upcomingBills = bills.filter(b => !b.is_subscription);
  const subscriptions = bills.filter(b => b.is_subscription);

  // Sort by due date
  const sortedUpcoming = [...upcomingBills].sort((a, b) =>
    new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
  ).slice(0, compact ? 4 : 10);

  const sortedSubscriptions = [...subscriptions].sort((a, b) =>
    new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
  ).slice(0, compact ? 4 : 10);

  const formatAmount = (amount: number) => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  const getUrgencyStyle = (dueDate: string) => {
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return { color: '#ef4444', badge: 'Overdue', badgeBg: '#fef2f2' }; // Red
    if (days === 0) return { color: '#f97316', badge: 'Today', badgeBg: '#fff7ed' }; // Orange
    if (days <= 3) return { color: '#eab308', badge: `${days}d`, badgeBg: '#fefce8' }; // Yellow
    return { color: themeColors.textMuted, badge: null, badgeBg: null };
  };

  const formatDueDateShort = (dueDate: string) => {
    const date = new Date(dueDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderBillRow = (bill: RecurringBill, isSubscription: boolean = false) => {
    const urgency = getUrgencyStyle(bill.next_due_date);
    const daysUntil = getDaysUntilDue(bill.next_due_date);
    const isOverdue = daysUntil < 0;
    const isDueSoon = daysUntil >= 0 && daysUntil <= 3;

    return (
      <Pressable
        key={bill.id}
        style={[
          styles.billRow,
          { backgroundColor: themeColors.background },
          (isOverdue || isDueSoon) && { backgroundColor: urgency.badgeBg },
        ]}
        onPress={() => onViewBill?.(bill)}
      >
        <Text style={styles.billIcon}>{bill.icon || (isSubscription ? '📱' : '📄')}</Text>

        <View style={styles.billDetails}>
          <Text style={[styles.billName, { color: themeColors.text }]} numberOfLines={1}>
            {bill.name}
          </Text>
          <Text style={[styles.billDueDate, { color: urgency.color }]}>
            {formatDueDateShort(bill.next_due_date)}
            {isSubscription && '/mo'}
          </Text>
        </View>

        <View style={styles.billAmountContainer}>
          <Text style={[styles.billAmount, { color: themeColors.text }]}>
            {formatAmount(bill.amount)}
            {isSubscription && <Text style={styles.perMonth}>/mo</Text>}
          </Text>
          {urgency.badge && (
            <View style={[styles.urgencyBadge, { backgroundColor: urgency.color }]}>
              <Text style={styles.urgencyBadgeText}>{urgency.badge}</Text>
            </View>
          )}
        </View>

        {(isOverdue || daysUntil === 0) && onPayBill && (
          <Pressable
            style={[styles.payButton, { backgroundColor: themeColors.primary }]}
            onPress={(e) => {
              e.stopPropagation();
              onPayBill(bill.id);
            }}
          >
            <Text style={styles.payButtonText}>Pay</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  if (bills.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.surface }]}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>📅</Text>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Your Bills</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Bills Yet</Text>
          <Text style={[styles.emptyDescription, { color: themeColors.textMuted }]}>
            Add your recurring bills to track and get reminders
          </Text>
          {onAddBill && (
            <Pressable
              style={[styles.addButtonLarge, { backgroundColor: themeColors.primary }]}
              onPress={onAddBill}
            >
              <Ionicons name="add" size={20} color="#101914" />
              <Text style={styles.addButtonLargeText}>Add Bill</Text>
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
        <Text style={styles.headerIcon}>📅</Text>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Your Bills</Text>
      </View>

      {/* Upcoming Bills */}
      {sortedUpcoming.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textMuted }]}>UPCOMING</Text>
          <View style={styles.billsList}>
            {sortedUpcoming.map(bill => renderBillRow(bill, false))}
          </View>
        </View>
      )}

      {/* Subscriptions */}
      {sortedSubscriptions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textMuted }]}>SUBSCRIPTIONS</Text>
          <View style={styles.billsList}>
            {sortedSubscriptions.map(bill => renderBillRow(bill, true))}
          </View>
        </View>
      )}

      {/* Monthly Total */}
      <View style={[styles.totalSection, { borderTopColor: themeColors.background }]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: themeColors.text }]}>Monthly Total</Text>
          <Text style={[styles.totalAmount, { color: themeColors.text }]}>
            {formatAmount(monthlyTotal)}
          </Text>
        </View>
        {subscriptionsTotal > 0 && (
          <View style={styles.subtotalRow}>
            <Text style={[styles.subtotalLabel, { color: themeColors.textMuted }]}>
              Subscriptions: {formatAmount(subscriptionsTotal)}
            </Text>
          </View>
        )}
      </View>

      {/* Add Bill Button */}
      {onAddBill && (
        <Pressable
          style={[styles.addBillButton, { backgroundColor: themeColors.background }]}
          onPress={onAddBill}
        >
          <Ionicons name="add-circle-outline" size={18} color={themeColors.primary} />
          <Text style={[styles.addBillButtonText, { color: themeColors.primary }]}>Add Bill</Text>
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
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  billsList: {
    gap: spacing.xs,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  billIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  billDetails: {
    flex: 1,
    minWidth: 0,
  },
  billName: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  billDueDate: {
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 1,
  },
  billAmountContainer: {
    alignItems: 'flex-end',
    gap: 2,
  },
  billAmount: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  perMonth: {
    fontSize: 11,
    fontFamily: fonts.regular,
    opacity: 0.7,
  },
  urgencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgencyBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: '#ffffff',
  },
  payButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  payButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#101914',
  },
  totalSection: {
    borderTopWidth: 1,
    borderTopColor: colors.background,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  subtotalRow: {
    marginTop: spacing.xs,
  },
  subtotalLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  addBillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  addBillButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
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
