import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { MealAnalysis } from '@/types';

interface MealAnalysisCardProps {
  photoUrl: string;
  analysis: MealAnalysis;
}

export function MealAnalysisCard({ photoUrl, analysis }: MealAnalysisCardProps) {
  const { colors: themeColors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface }]}>
      {/* Photo */}
      <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />

      {/* Content */}
      <View style={styles.content}>
        {/* Description */}
        <Text style={[styles.description, { color: themeColors.text }]}>
          {analysis.description}
        </Text>

        {/* Confidence indicator */}
        {analysis.confidence !== 'high' && (
          <Text style={[styles.confidenceNote, { color: themeColors.textMuted }]}>
            {analysis.confidence === 'low' ? '* Best estimate' : '* Estimated values'}
          </Text>
        )}

        {/* Nutrition Grid */}
        <View style={styles.nutritionGrid}>
          <NutritionPill
            icon="flame"
            value={analysis.calories}
            unit="kcal"
            color="#FF6B6B"
            themeColors={themeColors}
          />
          <NutritionPill
            icon="fitness"
            value={analysis.proteinG}
            unit="g"
            color="#4ECDC4"
            themeColors={themeColors}
          />
          <NutritionPill
            icon="leaf"
            value={analysis.carbsG}
            unit="g"
            color="#FFE66D"
            themeColors={themeColors}
          />
          <NutritionPill
            icon="water"
            value={analysis.fatG}
            unit="g"
            color="#A78BFA"
            themeColors={themeColors}
          />
        </View>

        {/* Breakdown */}
        {analysis.breakdown && analysis.breakdown.length > 0 && (
          <View style={[styles.breakdown, { backgroundColor: themeColors.background }]}>
            {analysis.breakdown.slice(0, 4).map((item, index) => (
              <View key={index} style={styles.breakdownItem}>
                <Text style={[styles.breakdownText, { color: themeColors.text }]} numberOfLines={1}>
                  {item.item}
                </Text>
                <Text style={[styles.breakdownCalories, { color: themeColors.textMuted }]}>
                  {item.calories} cal
                </Text>
              </View>
            ))}
            {analysis.breakdown.length > 4 && (
              <Text style={[styles.moreItems, { color: themeColors.textMuted }]}>
                +{analysis.breakdown.length - 4} more items
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function NutritionPill({
  icon,
  value,
  unit,
  color,
  themeColors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  unit: string;
  color: string;
  themeColors: { text: string; textMuted: string; background: string };
}) {
  return (
    <View style={[styles.pill, { backgroundColor: themeColors.background }]}>
      <View style={[styles.pillIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={12} color={color} />
      </View>
      <Text style={[styles.pillValue, { color: themeColors.text }]}>
        {value}
        <Text style={[styles.pillUnit, { color: themeColors.textMuted }]}>{unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
    maxWidth: 280,
  },
  photo: {
    width: '100%',
    height: 140,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  confidenceNote: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  pillIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillValue: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  pillUnit: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  breakdown: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  breakdownText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  breakdownCalories: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  moreItems: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
