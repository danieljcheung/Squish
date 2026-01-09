import { View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface MealData {
  description: string;
  mealType: MealType;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface LogMealSheetProps {
  visible: boolean;
  initialData?: Partial<MealData>;
  onLog: (data: MealData) => void | Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

const MEAL_TYPES: { type: MealType; emoji: string; label: string }[] = [
  { type: 'breakfast', emoji: '🍳', label: 'Breakfast' },
  { type: 'lunch', emoji: '🥗', label: 'Lunch' },
  { type: 'dinner', emoji: '🍽️', label: 'Dinner' },
  { type: 'snack', emoji: '🍎', label: 'Snack' },
];

export function LogMealSheet({
  visible,
  initialData,
  onLog,
  onClose,
  loading = false,
}: LogMealSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();

  const [description, setDescription] = useState(initialData?.description || '');
  const [mealType, setMealType] = useState<MealType>(initialData?.mealType || 'lunch');
  const [calories, setCalories] = useState(initialData?.calories?.toString() || '');
  const [protein, setProtein] = useState(initialData?.proteinG?.toString() || '');
  const [carbs, setCarbs] = useState(initialData?.carbsG?.toString() || '');
  const [fat, setFat] = useState(initialData?.fatG?.toString() || '');

  const backdropOpacity = useSharedValue(0);
  const sheetTranslate = useSharedValue(600);

  // Update state when initialData changes
  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description || '');
      setMealType(initialData.mealType || 'lunch');
      setCalories(initialData.calories?.toString() || '');
      setProtein(initialData.proteinG?.toString() || '');
      setCarbs(initialData.carbsG?.toString() || '');
      setFat(initialData.fatG?.toString() || '');
    }
  }, [initialData]);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      sheetTranslate.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      sheetTranslate.value = withTiming(600, { duration: 200 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslate.value }],
  }));

  const handleClose = () => {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    sheetTranslate.value = withTiming(600, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  };

  const handleLog = async () => {
    const caloriesNum = parseInt(calories, 10) || 0;
    const proteinNum = parseInt(protein, 10) || 0;
    const carbsNum = parseInt(carbs, 10) || 0;
    const fatNum = parseInt(fat, 10) || 0;

    if (!description.trim() || caloriesNum <= 0) return;

    await onLog({
      description: description.trim(),
      mealType,
      calories: caloriesNum,
      proteinG: proteinNum,
      carbsG: carbsNum,
      fatG: fatNum,
    });
    handleClose();
  };

  const isLogDisabled = !description.trim() || !calories || parseInt(calories, 10) <= 0 || loading;

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={styles.backdropPressable} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: themeColors.surface, paddingBottom: insets.bottom + spacing.lg },
            sheetStyle,
          ]}
        >
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="restaurant-outline" size={28} color="#f97316" />
            <Text style={[styles.title, { color: themeColors.text }]}>Log Meal</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
            {/* Description */}
            <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>What did you eat?</Text>
            <TextInput
              style={[styles.descriptionInput, { backgroundColor: themeColors.background, color: themeColors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Grilled chicken with rice"
              placeholderTextColor={themeColors.textMuted}
              multiline
              maxLength={200}
            />

            {/* Meal Type Selection */}
            <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Meal Type</Text>
            <View style={styles.typeContainer}>
              {MEAL_TYPES.map((item) => {
                const isSelected = mealType === item.type;
                return (
                  <Pressable
                    key={item.type}
                    style={[
                      styles.typePill,
                      { backgroundColor: themeColors.background },
                      isSelected && styles.typePillSelected,
                    ]}
                    onPress={() => setMealType(item.type)}
                  >
                    <Text style={styles.typeEmoji}>{item.emoji}</Text>
                    <Text
                      style={[
                        styles.typeLabel,
                        { color: isSelected ? '#f97316' : themeColors.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Nutrition */}
            <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Nutrition</Text>
            <View style={styles.nutritionGrid}>
              {/* Calories */}
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionLabel, { color: themeColors.textMuted }]}>Calories</Text>
                <View style={[styles.nutritionInputWrapper, { backgroundColor: themeColors.background }]}>
                  <TextInput
                    style={[styles.nutritionInput, { color: themeColors.text }]}
                    value={calories}
                    onChangeText={setCalories}
                    placeholder="0"
                    placeholderTextColor={themeColors.textMuted}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                  <Text style={[styles.nutritionUnit, { color: themeColors.textMuted }]}>cal</Text>
                </View>
              </View>

              {/* Protein */}
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionLabel, { color: themeColors.textMuted }]}>Protein</Text>
                <View style={[styles.nutritionInputWrapper, { backgroundColor: themeColors.background }]}>
                  <TextInput
                    style={[styles.nutritionInput, { color: themeColors.text }]}
                    value={protein}
                    onChangeText={setProtein}
                    placeholder="0"
                    placeholderTextColor={themeColors.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <Text style={[styles.nutritionUnit, { color: themeColors.textMuted }]}>g</Text>
                </View>
              </View>

              {/* Carbs */}
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionLabel, { color: themeColors.textMuted }]}>Carbs</Text>
                <View style={[styles.nutritionInputWrapper, { backgroundColor: themeColors.background }]}>
                  <TextInput
                    style={[styles.nutritionInput, { color: themeColors.text }]}
                    value={carbs}
                    onChangeText={setCarbs}
                    placeholder="0"
                    placeholderTextColor={themeColors.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <Text style={[styles.nutritionUnit, { color: themeColors.textMuted }]}>g</Text>
                </View>
              </View>

              {/* Fat */}
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionLabel, { color: themeColors.textMuted }]}>Fat</Text>
                <View style={[styles.nutritionInputWrapper, { backgroundColor: themeColors.background }]}>
                  <TextInput
                    style={[styles.nutritionInput, { color: themeColors.text }]}
                    value={fat}
                    onChangeText={setFat}
                    placeholder="0"
                    placeholderTextColor={themeColors.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <Text style={[styles.nutritionUnit, { color: themeColors.textMuted }]}>g</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Log Button */}
          <Pressable
            style={({ pressed }) => [
              styles.logButton,
              isLogDisabled && styles.logButtonDisabled,
              pressed && !isLogDisabled && styles.logButtonPressed,
            ]}
            onPress={handleLog}
            disabled={isLogDisabled}
          >
            {loading ? (
              <Text style={styles.logButtonText}>Logging...</Text>
            ) : (
              <Text style={styles.logButtonText}>Log Meal</Text>
            )}
          </Pressable>

          {/* Cancel Button */}
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              { backgroundColor: themeColors.background },
              pressed && styles.cancelButtonPressed,
            ]}
            onPress={handleClose}
          >
            <Text style={[styles.cancelText, { color: themeColors.textMuted }]}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginBottom: spacing.lg,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  scrollContent: {
    flexGrow: 0,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    fontSize: 15,
    fontFamily: fonts.regular,
    marginBottom: spacing.lg,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typePillSelected: {
    borderColor: '#f97316',
    backgroundColor: '#f9731615',
  },
  typeEmoji: {
    fontSize: 16,
  },
  typeLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  nutritionItem: {
    width: '48%',
  },
  nutritionLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    marginBottom: spacing.xs,
  },
  nutritionInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  nutritionInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  nutritionUnit: {
    fontSize: 14,
    fontFamily: fonts.medium,
    marginLeft: spacing.xs,
  },
  logButton: {
    backgroundColor: '#f97316',
    paddingVertical: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  logButtonDisabled: {
    opacity: 0.5,
  },
  logButtonPressed: {
    backgroundColor: '#ea580c',
  },
  logButtonText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#ffffff',
  },
  cancelButton: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonPressed: {
    opacity: 0.8,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: fonts.medium,
  },
});
