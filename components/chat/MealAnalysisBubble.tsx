import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { MealAnalysis } from '@/types';
import { triggerHaptic } from '@/lib/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_MODAL_HEIGHT = SCREEN_HEIGHT * 0.85;

interface MealAnalysisBubbleProps {
  visible: boolean;
  photoUrl: string;
  analysis: MealAnalysis;
  onConfirm: (context?: string) => void;
  onCancel: () => void;
  isConfirming?: boolean;
  isConfirmed?: boolean;
}

export function MealAnalysisBubble({
  visible,
  photoUrl,
  analysis,
  onConfirm,
  onCancel,
  isConfirming = false,
  isConfirmed = false,
}: MealAnalysisBubbleProps) {
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const [mealContext, setMealContext] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Listen for keyboard events
  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // Scroll to bottom when keyboard opens to keep input visible
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Reset context when modal opens
  useEffect(() => {
    if (visible) {
      setMealContext('');
    }
  }, [visible]);

  const handleConfirm = () => {
    triggerHaptic('success');
    Keyboard.dismiss();
    onConfirm(mealContext.trim() || undefined);
  };

  const handleCancel = () => {
    triggerHaptic('light');
    Keyboard.dismiss();
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop - tappable to close */}
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            Keyboard.dismiss();
            handleCancel();
          }}
        />

        {/* Modal Sheet */}
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: themeColors.surface,
              paddingBottom: keyboardVisible ? spacing.lg : Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: themeColors.textMuted }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: `${themeColors.textMuted}20` }]}>
            <Pressable
              onPress={handleCancel}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={themeColors.textMuted} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>
              Meal Analysis
            </Text>
            <View style={styles.closeButton} />
          </View>

          {/* Scrollable Content */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            nestedScrollEnabled={true}
          >
            {/* Photo Preview */}
            <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />

            {/* Analysis Results */}
            <View style={styles.analysisContainer}>
              <Text style={[styles.description, { color: themeColors.text }]}>
                {analysis.description}
              </Text>

              {analysis.confidence !== 'high' && (
                <Text style={[styles.confidenceNote, { color: themeColors.textMuted }]}>
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
                  backgroundColor={themeColors.background}
                  textColor={themeColors.text}
                  mutedColor={themeColors.textMuted}
                />
                <NutritionItem
                  icon="fitness"
                  label="Protein"
                  value={analysis.proteinG}
                  unit="g"
                  color="#4ECDC4"
                  backgroundColor={themeColors.background}
                  textColor={themeColors.text}
                  mutedColor={themeColors.textMuted}
                />
                <NutritionItem
                  icon="leaf"
                  label="Carbs"
                  value={analysis.carbsG}
                  unit="g"
                  color="#FFE66D"
                  backgroundColor={themeColors.background}
                  textColor={themeColors.text}
                  mutedColor={themeColors.textMuted}
                />
                <NutritionItem
                  icon="water"
                  label="Fat"
                  value={analysis.fatG}
                  unit="g"
                  color="#A78BFA"
                  backgroundColor={themeColors.background}
                  textColor={themeColors.text}
                  mutedColor={themeColors.textMuted}
                />
              </View>

              {/* Breakdown */}
              {analysis.breakdown && analysis.breakdown.length > 0 && (
                <View style={[styles.breakdownContainer, { backgroundColor: themeColors.background }]}>
                  <Text style={[styles.breakdownTitle, { color: themeColors.textMuted }]}>
                    Breakdown
                  </Text>
                  {analysis.breakdown.map((item, index) => (
                    <View key={index} style={styles.breakdownItem}>
                      <Text style={[styles.breakdownText, { color: themeColors.text }]}>
                        {item.item} ({item.portion})
                      </Text>
                      <Text style={[styles.breakdownCalories, { color: themeColors.textMuted }]}>
                        {item.calories} cal
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Meal Context Input */}
              <View style={styles.contextSection}>
                <Text style={[styles.contextLabel, { color: themeColors.textMuted }]}>
                  ADD NOTES (OPTIONAL)
                </Text>
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.contextInput,
                    {
                      backgroundColor: themeColors.background,
                      color: themeColors.text,
                      borderColor: keyboardVisible ? themeColors.primary : 'transparent',
                    },
                  ]}
                  placeholder="e.g., 'ate half', '200g chicken', 'no dressing'"
                  placeholderTextColor={themeColors.textMuted}
                  value={mealContext}
                  onChangeText={setMealContext}
                  multiline
                  maxLength={200}
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                <Text style={[styles.charCount, { color: themeColors.textMuted }]}>
                  {mealContext.length}/200
                </Text>
              </View>

            </View>
          </ScrollView>

          {/* Action Buttons - Fixed at bottom */}
          {!isConfirmed ? (
            <View style={[styles.buttonRow, { borderTopColor: `${themeColors.textMuted}20` }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  { backgroundColor: themeColors.background },
                  pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                ]}
                onPress={handleCancel}
                disabled={isConfirming}
              >
                <Ionicons name="close" size={20} color={themeColors.textMuted} />
                <Text style={[styles.cancelButtonText, { color: themeColors.textMuted }]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.confirmButton,
                  { backgroundColor: themeColors.primary },
                  pressed && { backgroundColor: themeColors.primaryDark, transform: [{ scale: 0.98 }] },
                  isConfirming && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <ActivityIndicator size="small" color="#101914" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#101914" />
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

function NutritionItem({
  icon,
  label,
  value,
  unit,
  color,
  backgroundColor,
  textColor,
  mutedColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  unit: string;
  color: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <View style={[styles.nutritionItem, { backgroundColor }]}>
      <View style={[styles.nutritionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.nutritionValue, { color: textColor }]}>
        {value}
        <Text style={[styles.nutritionUnit, { color: mutedColor }]}>{unit}</Text>
      </Text>
      <Text style={[styles.nutritionLabel, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  photo: {
    width: '100%',
    height: 200,
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
    marginBottom: spacing.md,
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
  contextSection: {
    marginTop: spacing.sm,
  },
  contextLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  contextInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 60,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  charCount: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
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
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: '#101914',
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  confirmedText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: '#4ade80',
  },
});
