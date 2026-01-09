import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { WorkoutType, WORKOUT_TYPE_INFO } from '@/types';
import {
  CardContainer,
  CardHeader,
  CardContent,
  CardDivider,
  CardRow,
  CardActions,
} from './shared';

interface PendingWorkoutData {
  type: WorkoutType;
  durationMins: number;
  notes?: string;
}

interface PendingWorkoutCardProps {
  data: PendingWorkoutData;
  onConfirm: () => void;
  onAdjust: () => void;
  isLoading?: boolean;
  isConfirmed?: boolean;
  weeklyCount?: number;
  streak?: number;
}

const CARD_COLOR = '#22c55e';

export function PendingWorkoutCard({
  data,
  onConfirm,
  onAdjust,
  isLoading = false,
  isConfirmed = false,
  weeklyCount = 0,
  streak = 0,
}: PendingWorkoutCardProps) {
  const { colors: themeColors } = useTheme();

  const typeInfo = WORKOUT_TYPE_INFO[data.type] || WORKOUT_TYPE_INFO.other;

  const formatDuration = (mins: number): string => {
    if (mins < 60) {
      return `${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours}h ${remainingMins}m`;
  };

  if (isConfirmed) {
    return (
      <CardContainer maxWidth={260}>
        <CardHeader
          iconName="checkmark-circle"
          title="Workout Logged"
          color={CARD_COLOR}
          backgroundColor="#dcfce7"
          variant="confirmed"
        />
        <CardContent emoji={typeInfo.emoji}>
          <Text style={[styles.title, { color: themeColors.text }]}>
            {typeInfo.label}
          </Text>
          <Text style={[styles.duration, { color: themeColors.textMuted }]}>
            {formatDuration(data.durationMins)}
          </Text>
        </CardContent>
        {(weeklyCount > 1 || streak >= 2) && (
          <View style={[styles.statsRow, { borderTopColor: themeColors.background }]}>
            {weeklyCount > 1 && (
              <Text style={[styles.statText, { color: themeColors.textMuted }]}>
                {weeklyCount} workouts this week
              </Text>
            )}
            {streak >= 2 && (
              <Text style={[styles.streakText, { color: '#f97316' }]}>
                {streak} day streak
              </Text>
            )}
          </View>
        )}
      </CardContainer>
    );
  }

  return (
    <CardContainer maxWidth={280}>
      <CardHeader
        iconName="barbell-outline"
        title="Log Workout"
        color={CARD_COLOR}
      />

      <CardContent emoji={typeInfo.emoji}>
        <Text style={[styles.title, { color: themeColors.text }]}>
          {typeInfo.label}
        </Text>
        <Text style={[styles.durationHighlight, { color: CARD_COLOR }]}>
          {formatDuration(data.durationMins)}
        </Text>
        {data.notes && (
          <Text style={[styles.notes, { color: themeColors.textMuted }]} numberOfLines={1}>
            {data.notes}
          </Text>
        )}
      </CardContent>

      {weeklyCount > 0 && (
        <View style={[styles.progressSection, { borderTopColor: themeColors.background }]}>
          <CardRow
            label="This week"
            value={`${weeklyCount} → ${weeklyCount + 1} workouts`}
            style={styles.progressRow}
          />
          {streak >= 1 && (
            <CardRow
              label="Streak"
              value={`${streak} → ${streak + 1} days`}
              valueColor="#f97316"
              style={styles.progressRow}
            />
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
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  duration: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    marginTop: 2,
  },
  durationHighlight: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    marginTop: 2,
  },
  notes: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  progressSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    gap: spacing.xs,
  },
  progressRow: {
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  statText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  streakText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
});
