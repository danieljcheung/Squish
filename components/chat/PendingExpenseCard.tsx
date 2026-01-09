import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import {
  CardContainer,
  CardHeader,
  CardContent,
  CardActions,
} from './shared';

interface PendingExpenseData {
  amount: number;
  category: string;
  description: string;
}

interface PendingExpenseCardProps {
  data: PendingExpenseData;
  onConfirm: () => void;
  onAdjust: () => void;
  isLoading?: boolean;
  isConfirmed?: boolean;
  currencySymbol?: string;
  todaySpent?: number;
  dailyBudget?: number;
}

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🍔',
  groceries: '🛒',
  transport: '🚗',
  entertainment: '🎬',
  shopping: '🛍️',
  utilities: '💡',
  health: '🏥',
  subscriptions: '📱',
  other: '📦',
};

const CARD_COLOR = '#ef4444';

export function PendingExpenseCard({
  data,
  onConfirm,
  onAdjust,
  isLoading = false,
  isConfirmed = false,
  currencySymbol = '$',
  todaySpent = 0,
  dailyBudget = 0,
}: PendingExpenseCardProps) {
  const { colors: themeColors } = useTheme();

  const emoji = CATEGORY_EMOJI[data.category.toLowerCase()] || CATEGORY_EMOJI.other;
  const categoryLabel = data.category.charAt(0).toUpperCase() + data.category.slice(1);

  const formatAmount = (amount: number): string => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  if (isConfirmed) {
    return (
      <CardContainer maxWidth={260}>
        <CardHeader
          iconName="checkmark-circle"
          title="Expense Logged"
          color={CARD_COLOR}
          backgroundColor="#fee2e2"
          variant="confirmed"
        />
        <CardContent emoji={emoji}>
          <Text style={[styles.amount, { color: themeColors.text }]}>
            {formatAmount(data.amount)}
          </Text>
          <Text style={[styles.description, { color: themeColors.textMuted }]} numberOfLines={1}>
            {data.description}
          </Text>
        </CardContent>
      </CardContainer>
    );
  }

  return (
    <CardContainer maxWidth={280}>
      <CardHeader
        iconName="cart-outline"
        title="Log Expense"
        color={CARD_COLOR}
      />

      <CardContent emoji={emoji}>
        <Text style={[styles.amount, { color: themeColors.text }]}>
          {formatAmount(data.amount)}
        </Text>
        <Text style={[styles.category, { color: CARD_COLOR }]}>
          {categoryLabel}
        </Text>
        {data.description && (
          <Text style={[styles.description, { color: themeColors.textMuted }]} numberOfLines={1}>
            {data.description}
          </Text>
        )}
      </CardContent>

      {/* Budget Impact Preview */}
      {dailyBudget > 0 && (
        <View style={[styles.budgetSection, { borderTopColor: themeColors.background }]}>
          <View style={styles.budgetRow}>
            <Text style={[styles.budgetLabel, { color: themeColors.textMuted }]}>
              Today's spending
            </Text>
            <Text style={[styles.budgetValue, { color: themeColors.text }]}>
              {formatAmount(todaySpent)} → {formatAmount(todaySpent + data.amount)}
            </Text>
          </View>
          {dailyBudget - todaySpent - data.amount < 0 && (
            <View style={styles.warningRow}>
              <Ionicons name="warning" size={14} color="#f97316" />
              <Text style={[styles.warningText, { color: '#f97316' }]}>
                Over daily budget by {formatAmount(Math.abs(dailyBudget - todaySpent - data.amount))}
              </Text>
            </View>
          )}
        </View>
      )}

      <CardActions
        primaryLabel="Log it"
        secondaryLabel="Adjust"
        primaryColor={CARD_COLOR}
        onPrimary={onConfirm}
        onSecondary={onAdjust}
        isLoading={isLoading}
      />
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  amount: {
    fontSize: 24,
    fontFamily: fonts.bold,
  },
  category: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  budgetSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    gap: spacing.xs,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  budgetValue: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  warningText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
});
