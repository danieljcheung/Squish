import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing, radius } from '@/constants/theme';
import { WeeklySummary, TrendDirection, WORKOUT_TYPE_INFO } from '@/types';
import { WeeklyCalendar } from './WeeklyCalendar';

interface WeeklySummaryCardProps {
  summary: WeeklySummary;
  isCurrentWeek?: boolean;
  onDismiss?: () => void;
}

function TrendBadge({ trend, label }: { trend: TrendDirection; label: string }) {
  const getIcon = () => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      case 'stable':
        return '→';
      default:
        return '•';
    }
  };

  const getColor = () => {
    switch (trend) {
      case 'up':
        return '#4ECDC4';
      case 'down':
        return '#FF6B6B';
      case 'stable':
        return colors.textMuted;
      default:
        return colors.textMuted;
    }
  };

  return (
    <View style={[styles.trendBadge, { backgroundColor: `${getColor()}15` }]}>
      <Text style={[styles.trendIcon, { color: getColor() }]}>{getIcon()}</Text>
      <Text style={[styles.trendLabel, { color: getColor() }]}>{label}</Text>
    </View>
  );
}

function StatRow({
  label,
  value,
  unit,
  target,
}: {
  label: string;
  value: number;
  unit: string;
  target?: number;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {Math.round(value)}
        <Text style={styles.statUnit}>
          {unit}
          {target ? ` / ${target}` : ''}
        </Text>
      </Text>
    </View>
  );
}

export function WeeklySummaryCard({
  summary,
  isCurrentWeek = true,
  onDismiss,
}: WeeklySummaryCardProps) {
  const formatDateRange = () => {
    const start = new Date(summary.week_start);
    const end = new Date(summary.week_end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  // Format workout types for display
  const formatWorkoutTypes = () => {
    const types = summary.workout_types_json;
    if (!types || Object.keys(types).length === 0) return null;

    return Object.entries(types)
      .map(([type, count]) => {
        const info = WORKOUT_TYPE_INFO[type as keyof typeof WORKOUT_TYPE_INFO];
        return `${count} ${info?.label.toLowerCase() || type}`;
      })
      .join(', ');
  };

  const workoutTypeStr = formatWorkoutTypes();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>
            {isCurrentWeek ? '📊 This Week' : '📊 Weekly Summary'}
          </Text>
          <Text style={styles.dateRange}>{formatDateRange()}</Text>
        </View>
        {onDismiss && (
          <Pressable style={styles.dismissButton} onPress={onDismiss}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Calendar View */}
      {summary.daily_breakdown_json && summary.daily_breakdown_json.length > 0 && (
        <WeeklyCalendar
          dailyBreakdown={summary.daily_breakdown_json}
          weekStart={summary.week_start}
        />
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Nutrition */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>🍽️ Nutrition</Text>
          <StatRow
            label="Avg Calories"
            value={summary.avg_daily_calories}
            unit=" cal/day"
          />
          <StatRow
            label="Avg Protein"
            value={summary.avg_daily_protein_g}
            unit="g/day"
          />
          <StatRow
            label="Days at Goal"
            value={summary.days_at_calorie_goal}
            unit="/7"
          />
        </View>

        {/* Hydration */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>💧 Hydration</Text>
          <StatRow
            label="Avg Water"
            value={Math.round(summary.avg_daily_water_ml / 1000 * 10) / 10}
            unit="L/day"
          />
          <StatRow
            label="Days at Goal"
            value={summary.days_at_water_goal}
            unit="/7"
          />
        </View>

        {/* Workouts */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>💪 Workouts</Text>
          <StatRow
            label="Total"
            value={summary.total_workouts}
            unit=" workouts"
          />
          <StatRow
            label="Time"
            value={summary.total_workout_mins}
            unit=" mins"
          />
          <StatRow
            label="Days Active"
            value={summary.days_with_workouts}
            unit="/7"
          />
          {workoutTypeStr && (
            <Text style={styles.workoutBreakdown}>{workoutTypeStr}</Text>
          )}
        </View>
      </View>

      {/* Trends */}
      <View style={styles.trendsRow}>
        <TrendBadge trend={summary.calories_trend} label="Calories" />
        <TrendBadge trend={summary.water_trend} label="Water" />
        <TrendBadge trend={summary.workouts_trend} label="Workouts" />
      </View>

      {/* Highlights */}
      {summary.highlights_json && summary.highlights_json.length > 0 && (
        <View style={styles.highlightsSection}>
          <Text style={styles.highlightsTitle}>Highlights</Text>
          {summary.highlights_json.map((highlight, i) => (
            <Text key={i} style={styles.highlightItem}>
              ⭐ {highlight}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  dateRange: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  dismissButton: {
    padding: spacing.xs,
  },
  statsGrid: {
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  statsSection: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: spacing.sm,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  statUnit: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  workoutBreakdown: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    paddingLeft: spacing.sm,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  trendsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  trendIcon: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  trendLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  highlightsSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  highlightsTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  highlightItem: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.text,
    marginBottom: spacing.xs,
  },
});
