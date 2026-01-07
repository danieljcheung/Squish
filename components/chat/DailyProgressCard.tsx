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
import { useTheme } from '@/context/ThemeContext';
import { DailyNutrition, NutritionGoals, WATER_GLASS_ML, DEFAULT_WATER_GOAL_ML, WorkoutLog, WORKOUT_TYPE_INFO } from '@/types';

interface DailyProgressCardProps {
  nutrition: DailyNutrition;
  goals?: NutritionGoals;
  waterGoalMl?: number;
  showWaterAsGlasses?: boolean;
  todayWorkout?: WorkoutLog | null;
}

const COLLAPSED_HEIGHT = 48;
const EXPANDED_HEIGHT = 240;

export function DailyProgressCard({
  nutrition,
  goals,
  waterGoalMl = DEFAULT_WATER_GOAL_ML,
  showWaterAsGlasses = true,
  todayWorkout,
}: DailyProgressCardProps) {
  const { colors: themeColors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const height = useSharedValue(COLLAPSED_HEIGHT);
  const rotation = useSharedValue(180);
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
    rotation.value = withTiming(toExpanded ? 0 : 180, {
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

  const hasWorkout = nutrition.workouts_count > 0 || todayWorkout;

  return (
    <Animated.View style={[styles.container, { backgroundColor: themeColors.surface }, containerStyle]}>
      {/* Collapsed Header - Always visible */}
      <Pressable style={styles.collapsedHeader} onPress={toggleExpanded}>
        {/* Left content - calories, water, workout */}
        <View style={styles.collapsedContent}>
          <Text style={styles.fireEmoji}>🔥</Text>
          <Text style={[styles.collapsedCalories, { color: themeColors.text }]}>
            {nutrition.total_calories}
          </Text>
          <Text style={[styles.collapsedTarget, { color: themeColors.textMuted }]}>/ {targetCalories}</Text>

          <View style={[styles.collapsedDivider, { backgroundColor: `${themeColors.textMuted}30` }]} />

          <Text style={styles.waterEmoji}>💧</Text>
          <Text style={styles.collapsedWater}>
            {showWaterAsGlasses ? waterGlasses : waterMl}
          </Text>
          <Text style={[styles.collapsedTarget, { color: themeColors.textMuted }]}>
            / {showWaterAsGlasses ? waterGoalGlasses : waterGoalMl}
          </Text>

          {hasWorkout && (
            <>
              <View style={[styles.collapsedDivider, { backgroundColor: `${themeColors.textMuted}30` }]} />
              <Text style={styles.workoutCheck}>🏋️</Text>
              <Ionicons name="checkmark" size={14} color="#4ade80" />
            </>
          )}
        </View>

        {/* Chevron button - fixed on right */}
        <Pressable
          style={[styles.chevronButton, { backgroundColor: `${themeColors.textMuted}10` }]}
          onPress={toggleExpanded}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={18} color={themeColors.textMuted} />
          </Animated.View>
        </Pressable>
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
            themeColors={themeColors}
          />
          <MacroBar
            label="Carbs"
            current={Math.round(nutrition.total_carbs_g)}
            target={targetCarbs}
            unit="g"
            percent={carbsPercent}
            color="#FFE66D"
            themeColors={themeColors}
          />
          <MacroBar
            label="Fat"
            current={Math.round(nutrition.total_fat_g)}
            target={targetFat}
            unit="g"
            percent={fatPercent}
            color="#A78BFA"
            themeColors={themeColors}
          />
        </View>

        {/* Workout info */}
        <View style={[styles.workoutRow, { borderTopColor: themeColors.background }]}>
          <Text style={[styles.workoutLabel, { color: themeColors.text }]}>Workout</Text>
          {todayWorkout ? (
            <Text style={[styles.workoutValue, { color: themeColors.text }]}>
              {todayWorkout.duration_mins} min {WORKOUT_TYPE_INFO[todayWorkout.workout_type].label.toLowerCase()}{' '}
              {WORKOUT_TYPE_INFO[todayWorkout.workout_type].emoji}
            </Text>
          ) : nutrition.workouts_count > 0 ? (
            <Text style={[styles.workoutValue, { color: themeColors.text }]}>
              {nutrition.workout_mins} min total 💪
            </Text>
          ) : (
            <Text style={[styles.workoutNone, { color: themeColors.textMuted }]}>None yet</Text>
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
  themeColors,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  percent: number;
  color: string;
  themeColors: { text: string; textMuted: string; background: string };
}) {
  return (
    <View style={styles.macroBar}>
      <View style={styles.macroBarHeader}>
        <Text style={[styles.macroBarLabel, { color: themeColors.text }]}>{label}</Text>
        <Text style={[styles.macroBarValue, { color: themeColors.text }]}>
          {current}
          <Text style={[styles.macroBarTarget, { color: themeColors.textMuted }]}> / {target}{unit}</Text>
        </Text>
      </View>
      <View style={[styles.macroBarTrack, { backgroundColor: themeColors.background }]}>
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
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    height: COLLAPSED_HEIGHT,
    gap: spacing.md,
  },
  collapsedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.sm,
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
    marginHorizontal: spacing.xs,
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
  chevronButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // Expanded content
  expandedContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
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
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
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
