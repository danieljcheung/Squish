import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { BillFrequency } from '@/lib/supabase';

interface BillConfirmationData {
  name: string;
  icon?: string;
  amount: number;
  category?: string;
  frequency: BillFrequency;
  dueDay: number;
  reminderDaysBefore?: number;
  autoLog?: boolean;
  isSubscription?: boolean;
  timestamp: string;
}

interface BillConfirmationCardProps {
  data: BillConfirmationData;
  currencySymbol?: string;
  onUndo?: () => void;
  onEdit?: () => void;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_OF_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function BillConfirmationCard({
  data,
  currencySymbol = '$',
  onUndo,
  onEdit,
}: BillConfirmationCardProps) {
  const { colors: themeColors } = useTheme();

  const formatAmount = (amount: number) => {
    return `${currencySymbol}${Math.abs(amount).toFixed(2)}`;
  };

  // Format due date based on frequency
  const formatDueDate = () => {
    if (data.frequency === 'weekly') {
      return `Every ${DAYS_OF_WEEK[data.dueDay]}`;
    } else if (data.frequency === 'monthly') {
      const suffix = data.dueDay === 1 ? 'st' : data.dueDay === 2 ? 'nd' : data.dueDay === 3 ? 'rd' : 'th';
      return `${data.dueDay}${suffix} of every month`;
    } else {
      // Yearly - dueDay is encoded as MMDD
      const month = Math.floor(data.dueDay / 100);
      const day = data.dueDay % 100;
      const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
      return `${MONTHS[month - 1]} ${day}${suffix} every year`;
    }
  };

  // Calculate next payment date
  const getNextPaymentDate = () => {
    const now = new Date();
    let nextDate = new Date();

    if (data.frequency === 'weekly') {
      const currentDay = now.getDay();
      let daysUntil = data.dueDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      nextDate.setDate(now.getDate() + daysUntil);
    } else if (data.frequency === 'monthly') {
      nextDate.setDate(data.dueDay);
      if (nextDate <= now) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
    } else {
      // Yearly
      const month = Math.floor(data.dueDay / 100) - 1;
      const day = data.dueDay % 100;
      nextDate.setMonth(month);
      nextDate.setDate(day);
      if (nextDate <= now) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
    }

    // Format as "Mon, Jan 15"
    const dayName = DAYS_OF_WEEK_SHORT[nextDate.getDay()];
    const monthName = MONTHS[nextDate.getMonth()].slice(0, 3);
    return `${dayName}, ${monthName} ${nextDate.getDate()}`;
  };

  // Get frequency label
  const getFrequencyLabel = () => {
    switch (data.frequency) {
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      default: return data.frequency;
    }
  };

  // Get reminder label
  const getReminderLabel = () => {
    if (data.reminderDaysBefore === undefined || data.reminderDaysBefore === 0) {
      return 'Day of';
    } else if (data.reminderDaysBefore === 1) {
      return '1 day before';
    } else if (data.reminderDaysBefore === 7) {
      return '1 week before';
    } else {
      return `${data.reminderDaysBefore} days before`;
    }
  };

  // Use a blue/primary color for bill added (different from expense red and income green)
  const headerColor = '#3b82f6'; // Blue
  const headerBgColor = '#eff6ff'; // Light blue

  const icon = data.icon || '📅';

  const CardWrapper = onEdit ? Pressable : View;
  const cardWrapperProps = onEdit ? { onPress: onEdit } : {};

  return (
    <CardWrapper
      style={[styles.container, { backgroundColor: themeColors.surface }]}
      {...cardWrapperProps}
    >
      {/* Success Header */}
      <View style={[styles.header, { backgroundColor: headerBgColor }]}>
        <Ionicons name="calendar-outline" size={20} color={headerColor} />
        <Text style={[styles.headerText, { color: headerColor }]}>
          Bill Added
        </Text>
        <Text style={[styles.headerTime, { color: `${headerColor}90` }]}>
          {getFrequencyLabel()}
        </Text>
        {onEdit && (
          <Ionicons name="chevron-forward" size={16} color={`${headerColor}60`} />
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.mainRow}>
          <Text style={styles.billIcon}>{icon}</Text>

          <View style={styles.details}>
            <Text style={[styles.billName, { color: themeColors.text }]}>
              {data.name}
            </Text>
            <Text style={[styles.amount, { color: themeColors.text }]}>
              {formatAmount(data.amount)}
              <Text style={[styles.frequencyHint, { color: themeColors.textMuted }]}>
                {' '}/ {data.frequency === 'weekly' ? 'week' : data.frequency === 'monthly' ? 'month' : 'year'}
              </Text>
            </Text>
          </View>

          {data.isSubscription && (
            <View style={[styles.subscriptionBadge, { backgroundColor: `${headerColor}15` }]}>
              <Ionicons name="refresh" size={12} color={headerColor} />
            </View>
          )}
        </View>

        {/* Bill Details */}
        <View style={[styles.detailsSection, { borderTopColor: themeColors.background }]}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar" size={14} color={themeColors.textMuted} />
              <Text style={[styles.detailLabel, { color: themeColors.textMuted }]}>Due</Text>
            </View>
            <Text style={[styles.detailValue, { color: themeColors.text }]}>
              {formatDueDate()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color={themeColors.textMuted} />
              <Text style={[styles.detailLabel, { color: themeColors.textMuted }]}>Next</Text>
            </View>
            <Text style={[styles.detailValue, { color: headerColor }]}>
              {getNextPaymentDate()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="notifications-outline" size={14} color={themeColors.textMuted} />
              <Text style={[styles.detailLabel, { color: themeColors.textMuted }]}>Remind</Text>
            </View>
            <Text style={[styles.detailValue, { color: themeColors.text }]}>
              {getReminderLabel()}
            </Text>
          </View>

          {data.autoLog && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="flash-outline" size={14} color={themeColors.textMuted} />
                <Text style={[styles.detailLabel, { color: themeColors.textMuted }]}>Auto-log</Text>
              </View>
              <Text style={[styles.detailValue, { color: '#22c55e' }]}>
                Enabled
              </Text>
            </View>
          )}
        </View>
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
  billIcon: {
    fontSize: 32,
  },
  details: {
    flex: 1,
  },
  billName: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  amount: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginTop: 2,
  },
  frequencyHint: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  subscriptionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
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
