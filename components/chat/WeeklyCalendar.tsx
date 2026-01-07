import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { DailyGoalStatus } from '@/types';

interface WeeklyCalendarProps {
  dailyBreakdown: DailyGoalStatus[];
  weekStart: string;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyCalendar({ dailyBreakdown, weekStart }: WeeklyCalendarProps) {
  const today = new Date().toISOString().split('T')[0];

  // Sort by date to ensure Mon-Sun order
  const sortedDays = [...dailyBreakdown].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <View style={styles.container}>
      <View style={styles.calendarRow}>
        {sortedDays.map((day, index) => {
          const isToday = day.date === today;
          const isFuture = new Date(day.date) > new Date(today);
          const hasAnyGoal = day.caloriesHit || day.waterHit || day.workoutDone;
          const hasAnyData = day.totalCalories > 0 || day.totalWaterMl > 0 || day.workoutMins > 0;

          return (
            <View key={day.date} style={styles.dayColumn}>
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                {DAY_LABELS[index]}
              </Text>
              <View
                style={[
                  styles.dayCell,
                  isToday && styles.dayCellToday,
                  isFuture && styles.dayCellFuture,
                ]}
              >
                {isFuture ? (
                  <Text style={styles.futureDot}>-</Text>
                ) : hasAnyGoal ? (
                  <View style={styles.iconsContainer}>
                    {day.caloriesHit && <Text style={styles.icon}>🔥</Text>}
                    {day.waterHit && <Text style={styles.icon}>💧</Text>}
                    {day.workoutDone && <Text style={styles.icon}>🏋️</Text>}
                  </View>
                ) : hasAnyData ? (
                  <Text style={styles.partialDot}>○</Text>
                ) : (
                  <Text style={styles.emptyDot}>•</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🔥</Text>
          <Text style={styles.legendText}>Calories</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>💧</Text>
          <Text style={styles.legendText}>Water</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🏋️</Text>
          <Text style={styles.legendText}>Workout</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  dayLabelToday: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  dayCell: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  dayCellFuture: {
    backgroundColor: colors.background,
    opacity: 0.5,
  },
  iconsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
  },
  icon: {
    fontSize: 11,
  },
  emptyDot: {
    fontSize: 16,
    color: colors.textMuted,
    opacity: 0.3,
  },
  partialDot: {
    fontSize: 14,
    color: colors.textMuted,
    opacity: 0.5,
  },
  futureDot: {
    fontSize: 14,
    color: colors.textMuted,
    opacity: 0.3,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendIcon: {
    fontSize: 12,
  },
  legendText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
