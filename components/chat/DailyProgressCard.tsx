import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { DailyNutrition, NutritionGoals, WATER_GLASS_ML, DEFAULT_WATER_GOAL_ML, WorkoutLog, WORKOUT_TYPE_INFO } from '@/types';

interface DailyProgressCardProps {
  nutrition: DailyNutrition;
  goals?: NutritionGoals;
  waterGoalMl?: number;
  showWaterAsGlasses?: boolean;
  todayWorkout?: WorkoutLog | null;
}

const COLLAPSED_HEIGHT = 48;
const EXPANDED_HEIGHT = 200;

export function DailyProgressCard({
  nutrition,
  goals,
  waterGoalMl = DEFAULT_WATER_GOAL_ML,
  showWaterAsGlasses = true,
  todayWorkout,
}: DailyProgressCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const height = useSharedValue(COLLAPSED_HEIGHT);
  const rotation = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  const targetCalories = goals?.calories || nutrition.target_calories || 2000;
  const targetProtein = goals?.proteinG || 150;
  const targetCarbs = goals?.carbsG || 200;
  const targetFat = goals?.fatG || 67;

  // Water calculations
  const waterMl = nutrition.total_water_ml || 0;
  const waterGlasses = Math.round(waterMl / WATER_GLASS_ML);
  const waterGoalGlasses = Math.round(waterGoalMl / WATER_GLASS_ML);
  const waterPercent = Math.min((waterMl / waterGoalMl) * 100, 100);

  const caloriePercent = Math.min(
    (nutrition.total_calories / targetCalories) * 100,
    100
  );
  const proteinPercent = Math.min(
    (nutrition.total_protein_g / targetProtein) * 100,
    100
  );
  const carbsPercent = Math.min(
    (nutrition.total_carbs_g / targetCarbs) * 100,
    100
  );
  const fatPercent = Math.min((nutrition.total_fat_g / targetFat) * 100, 100);

  const toggleExpanded = () => {
    const toExpanded = !isExpanded;
    setIsExpanded(toExpanded);

    height.value = withTiming(toExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT, {
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    rotation.value = withTiming(toExpanded ? 180 : 0, {
      duration: 200,
    });
    contentOpacity.value = withTiming(toExpanded ? 1 : 0, {
      duration: toExpanded ? 200 : 100,
    });
  };

  const containerStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const expandedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Collapsed Header - Always visible */}
      <Pressable style={styles.collapsedHeader} onPress={toggleExpanded}>
        <View style={styles.collapsedLeft}>
          <Text style={styles.fireEmoji}>🔥</Text>
          <Text style={styles.collapsedCalories}>
            {nutrition.total_calories}
          </Text>
          <Text style={styles.collapsedTarget}>/ {targetCalories}</Text>
          <View style={styles.collapsedDivider} />
          <Text style={styles.waterEmoji}>💧</Text>
          <Text style={styles.collapsedWater}>
            {showWaterAsGlasses ? waterGlasses : waterMl}
          </Text>
          <Text style={styles.collapsedTarget}>
            / {showWaterAsGlasses ? waterGoalGlasses : waterGoalMl}
          </Text>
          {(nutrition.workouts_count > 0 || todayWorkout) && (
            <>
              <View style={styles.collapsedDivider} />
              <Text style={styles.workoutCheck}>🏋️ ✓</Text>
            </>
          )}
        </View>
        <View style={styles.collapsedRight}>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Expanded Content - macros + workout */}
      <Animated.View style={[styles.expandedContent, expandedContentStyle]}>
        <View style={styles.macroGrid}>
          <MacroBar
            label="Protein"
            current={Math.round(nutrition.total_protein_g)}
            target={targetProtein}
            unit="g"
            percent={proteinPercent}
            color="#4ECDC4"
          />
          <MacroBar
            label="Carbs"
            current={Math.round(nutrition.total_carbs_g)}
            target={targetCarbs}
            unit="g"
            percent={carbsPercent}
            color="#FFE66D"
          />
          <MacroBar
            label="Fat"
            current={Math.round(nutrition.total_fat_g)}
            target={targetFat}
            unit="g"
            percent={fatPercent}
            color="#A78BFA"
          />
        </View>

        {/* Workout info */}
        <View style={styles.workoutRow}>
          <Text style={styles.workoutLabel}>Workout</Text>
          {todayWorkout ? (
            <Text style={styles.workoutValue}>
              {todayWorkout.duration_mins} min {WORKOUT_TYPE_INFO[todayWorkout.workout_type].label.toLowerCase()}{' '}
              {WORKOUT_TYPE_INFO[todayWorkout.workout_type].emoji}
            </Text>
          ) : nutrition.workouts_count > 0 ? (
            <Text style={styles.workoutValue}>
              {nutrition.workout_mins} min total 💪
            </Text>
          ) : (
            <Text style={styles.workoutNone}>None yet</Text>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function MacroBar({
  label,
  current,
  target,
  unit,
  percent,
  color,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  percent: number;
  color: string;
}) {
  return (
    <View style={styles.macroBar}>
      <View style={styles.macroBarHeader}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={styles.macroBarValue}>
          {current}
          <Text style={styles.macroBarTarget}> / {target}{unit}</Text>
        </Text>
      </View>
      <View style={styles.macroBarTrack}>
        <View
          style={[
            styles.macroBarFill,
            { width: `${percent}%`, backgroundColor: color },
            percent >= 100 && styles.macroBarFillOver,
          ]}
        />
      </View>
    </View>
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
  // Collapsed header
  collapsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    height: COLLAPSED_HEIGHT,
  },
  collapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fireEmoji: {
    fontSize: 18,
  },
  collapsedCalories: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  collapsedTarget: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  collapsedDivider: {
    width: 1,
    height: 16,
    backgroundColor: `${colors.textMuted}30`,
    marginHorizontal: spacing.sm,
  },
  waterEmoji: {
    fontSize: 14,
  },
  collapsedWater: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#60a5fa',
  },
  workoutCheck: {
    fontSize: 14,
  },
  collapsedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealCountBadge: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  // Expanded content
  expandedContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  macroGrid: {
    gap: spacing.md,
  },
  // Macro bar
  macroBar: {},
  macroBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  macroBarLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  macroBarValue: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  macroBarTarget: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  macroBarTrack: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroBarFillOver: {
    backgroundColor: '#FF6B6B',
  },
  // Workout row
  workoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  workoutLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  workoutValue: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  workoutNone: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
