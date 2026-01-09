import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import {
  CardContainer,
  CardHeader,
  CardContent,
  CardProgressBar,
  CardActions,
} from './shared';

interface PendingWaterData {
  amountMl: number;
}

interface PendingWaterCardProps {
  data: PendingWaterData;
  onConfirm: () => void;
  onChange: () => void;
  isLoading?: boolean;
  isConfirmed?: boolean;
  todayTotal?: number;
  goalMl?: number;
}

const CARD_COLOR = '#3b82f6';

export function PendingWaterCard({
  data,
  onConfirm,
  onChange,
  isLoading = false,
  isConfirmed = false,
  todayTotal = 0,
  goalMl = 2000,
}: PendingWaterCardProps) {
  const { colors: themeColors } = useTheme();

  const glasses = Math.round(data.amountMl / 250);
  const glassesLabel = glasses === 1 ? 'glass' : 'glasses';

  const newTotal = todayTotal + data.amountMl;
  const totalGlasses = Math.round(newTotal / 250);
  const goalGlasses = Math.round(goalMl / 250);

  const currentPercent = Math.min((todayTotal / goalMl) * 100, 100);
  const previewPercent = (data.amountMl / goalMl) * 100;

  if (isConfirmed) {
    return (
      <CardContainer maxWidth={240}>
        <CardHeader
          iconName="checkmark-circle"
          title="Water Logged"
          color={CARD_COLOR}
          backgroundColor="#dbeafe"
          variant="confirmed"
        />
        <CardContent emoji="💧">
          <Text style={[styles.amount, { color: themeColors.text }]}>{data.amountMl}ml</Text>
          <Text style={[styles.progress, { color: themeColors.textMuted }]}>
            {totalGlasses}/{goalGlasses} glasses today
          </Text>
        </CardContent>
      </CardContainer>
    );
  }

  return (
    <CardContainer maxWidth={280}>
      <CardHeader
        iconName="water-outline"
        title="Log Water"
        color={CARD_COLOR}
      />

      <CardContent emoji="💧">
        <Text style={[styles.amount, { color: themeColors.text }]}>{data.amountMl}ml</Text>
        <Text style={[styles.subtext, { color: themeColors.textMuted }]}>
          ~{glasses} {glassesLabel}
        </Text>
      </CardContent>

      {/* Progress Preview */}
      <View style={[styles.progressSection, { borderTopColor: themeColors.background }]}>
        <CardProgressBar
          percent={currentPercent}
          color={CARD_COLOR}
          size="md"
          showPreview
          previewPercent={previewPercent}
          previewColor="#93c5fd"
        />
        <Text style={[styles.progressText, { color: themeColors.textMuted }]}>
          {Math.round(todayTotal / 250)} → {totalGlasses}/{goalGlasses} glasses
        </Text>
      </View>

      <CardActions
        primaryLabel="Log it"
        secondaryLabel="Change"
        primaryColor={CARD_COLOR}
        onPrimary={onConfirm}
        onSecondary={onChange}
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
  subtext: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  progress: {
    fontSize: 13,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  progressSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  progressText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
