import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { MealAnalysis } from '@/types';

interface MealAnalysisBubbleProps {
  photoUrl: string;
  analysis: MealAnalysis;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
  isConfirmed?: boolean;
}

export function MealAnalysisBubble({
  photoUrl,
  analysis,
  onConfirm,
  onCancel,
  isConfirming = false,
  isConfirmed = false,
}: MealAnalysisBubbleProps) {
  return (
    <View style={styles.container}>
      {/* Photo Preview */}
      <Image source={{ uri: photoUrl }} style={styles.photo} />

      {/* Analysis Results */}
      <View style={styles.analysisContainer}>
        <Text style={styles.description}>{analysis.description}</Text>

        {analysis.confidence !== 'high' && (
          <Text style={styles.confidenceNote}>
            {analysis.confidence === 'low'
              ? '* Best estimate - image was unclear'
              : '* Estimated values'}
          </Text>
        )}

        {/* Nutrition Grid */}
        <View style={styles.nutritionGrid}>
          <NutritionItem
            icon="flame"
            label="Calories"
            value={analysis.calories}
            unit="kcal"
            color="#FF6B6B"
          />
          <NutritionItem
            icon="fitness"
            label="Protein"
            value={analysis.proteinG}
            unit="g"
            color="#4ECDC4"
          />
          <NutritionItem
            icon="leaf"
            label="Carbs"
            value={analysis.carbsG}
            unit="g"
            color="#FFE66D"
          />
          <NutritionItem
            icon="water"
            label="Fat"
            value={analysis.fatG}
            unit="g"
            color="#A78BFA"
          />
        </View>

        {/* Breakdown */}
        {analysis.breakdown && analysis.breakdown.length > 0 && (
          <View style={styles.breakdownContainer}>
            <Text style={styles.breakdownTitle}>Breakdown</Text>
            {analysis.breakdown.map((item, index) => (
              <View key={index} style={styles.breakdownItem}>
                <Text style={styles.breakdownText}>
                  {item.item} ({item.portion})
                </Text>
                <Text style={styles.breakdownCalories}>{item.calories} cal</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {!isConfirmed ? (
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
            ]}
            onPress={onCancel}
            disabled={isConfirming}
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.confirmButton,
              pressed && styles.confirmButtonPressed,
              isConfirming && styles.confirmButtonDisabled,
            ]}
            onPress={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={colors.text} />
                <Text style={styles.confirmButtonText}>Log Meal</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.confirmedBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
          <Text style={styles.confirmedText}>Meal Logged!</Text>
        </View>
      )}
    </View>
  );
}

function NutritionItem({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View style={styles.nutritionItem}>
      <View style={[styles.nutritionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.nutritionValue}>
        {value}
        <Text style={styles.nutritionUnit}>{unit}</Text>
      </Text>
      <Text style={styles.nutritionLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    maxWidth: 320,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  photo: {
    width: '100%',
    height: 160,
    backgroundColor: colors.background,
  },
  analysisContainer: {
    padding: spacing.lg,
  },
  description: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  confidenceNote: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  nutritionItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  nutritionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nutritionValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  nutritionUnit: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  nutritionLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginTop: 2,
  },
  breakdownContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
  },
  breakdownTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  breakdownText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.text,
    flex: 1,
  },
  breakdownCalories: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: 0,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    borderRadius: 16,
  },
  cancelButtonPressed: {
    backgroundColor: `${colors.textMuted}15`,
    transform: [{ scale: 0.98 }],
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    paddingTop: 0,
  },
  confirmedText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: '#4ade80',
  },
});
