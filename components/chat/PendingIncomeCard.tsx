import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import {
  CardContainer,
  CardHeader,
  CardContent,
  CardActions,
} from './shared';

interface PendingIncomeData {
  amount: number;
  category: string;
  description: string;
}

interface PendingIncomeCardProps {
  data: PendingIncomeData;
  onConfirm: () => void;
  onAdjust: () => void;
  isLoading?: boolean;
  isConfirmed?: boolean;
  currencySymbol?: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  salary: '💼',
  freelance: '💻',
  investment: '📈',
  gift: '🎁',
  refund: '↩️',
  bonus: '🎉',
  other: '💰',
};

const CARD_COLOR = '#22c55e';

export function PendingIncomeCard({
  data,
  onConfirm,
  onAdjust,
  isLoading = false,
  isConfirmed = false,
  currencySymbol = '$',
}: PendingIncomeCardProps) {
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
          title="Income Logged"
          color={CARD_COLOR}
          backgroundColor="#dcfce7"
          variant="confirmed"
        />
        <CardContent emoji={emoji}>
          <Text style={[styles.amount, { color: CARD_COLOR }]}>
            +{formatAmount(data.amount)}
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
        iconName="trending-up-outline"
        title="Log Income"
        color={CARD_COLOR}
      />

      <CardContent emoji={emoji}>
        <Text style={[styles.amount, { color: CARD_COLOR }]}>
          +{formatAmount(data.amount)}
        </Text>
        <Text style={[styles.category, { color: themeColors.text }]}>
          {categoryLabel}
        </Text>
        {data.description && (
          <Text style={[styles.description, { color: themeColors.textMuted }]} numberOfLines={1}>
            {data.description}
          </Text>
        )}
      </CardContent>

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
});
