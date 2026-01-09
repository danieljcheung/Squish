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

interface PendingMealData {
  description: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface PendingMealCardProps {
  data: PendingMealData;
  onConfirm: () => void;
  onAdjust: () => void;
  isLoading?: boolean;
  isConfirmed?: boolean;
}

const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
};

const CARD_COLOR = '#f97316';

export function PendingMealCard({
  data,
  onConfirm,
  onAdjust,
  isLoading = false,
  isConfirmed = false,
}: PendingMealCardProps) {
  const { colors: themeColors } = useTheme();

  const emoji = MEAL_TYPE_EMOJI[data.mealType] || '🍽️';

  if (isConfirmed) {
    return (
      <CardContainer maxWidth={280}>
        <CardHeader
          iconName="checkmark-circle"
          title="Meal Logged"
          color="#22c55e"
          backgroundColor="#dcfce7"
          variant="confirmed"
        />
        <CardContent emoji={emoji}>
          <Text style={[styles.description, { color: themeColors.text }]} numberOfLines={1}>
            {data.description}
          </Text>
          <Text style={[styles.macrosSummary, { color: themeColors.textMuted }]}>
            {data.calories} cal
          </Text>
        </CardContent>
      </CardContainer>
    );
  }

  return (
    <CardContainer maxWidth={320}>
      <CardHeader
        iconName="restaurant-outline"
        title="Confirm Meal"
        color={CARD_COLOR}
        backgroundColor="#fef3c720"
      />

      <CardContent emoji={emoji}>
        <Text style={[styles.description, { color: themeColors.text }]} numberOfLines={2}>
          {data.description}
        </Text>
        <Text style={[styles.mealType, { color: themeColors.textMuted }]}>
          {data.mealType.charAt(0).toUpperCase() + data.mealType.slice(1)}
        </Text>
      </CardContent>

      {/* Macros */}
      <View style={[styles.macrosContainer, { borderTopColor: themeColors.background }]}>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: themeColors.text }]}>{data.calories}</Text>
          <Text style={[styles.macroLabel, { color: themeColors.textMuted }]}>cal</Text>
        </View>
        <View style={[styles.macroDivider, { backgroundColor: themeColors.background }]} />
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: themeColors.text }]}>{data.proteinG}g</Text>
          <Text style={[styles.macroLabel, { color: themeColors.textMuted }]}>protein</Text>
        </View>
        <View style={[styles.macroDivider, { backgroundColor: themeColors.background }]} />
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: themeColors.text }]}>{data.carbsG}g</Text>
          <Text style={[styles.macroLabel, { color: themeColors.textMuted }]}>carbs</Text>
        </View>
        <View style={[styles.macroDivider, { backgroundColor: themeColors.background }]} />
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: themeColors.text }]}>{data.fatG}g</Text>
          <Text style={[styles.macroLabel, { color: themeColors.textMuted }]}>fat</Text>
        </View>
      </View>

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
  description: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  mealType: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  macrosSummary: {
    fontSize: 13,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  macrosContainer: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  macroLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  macroDivider: {
    width: 1,
    height: '100%',
  },
});
