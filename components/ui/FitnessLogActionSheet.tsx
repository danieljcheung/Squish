import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface FitnessLogActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onLogMeal: () => void;
  onLogWater: () => void;
  onLogWorkout: () => void;
}

export function FitnessLogActionSheet({
  visible,
  onClose,
  onLogMeal,
  onLogWater,
  onLogWorkout,
}: FitnessLogActionSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();

  const backdropOpacity = useSharedValue(0);
  const sheetTranslate = useSharedValue(300);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      sheetTranslate.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      sheetTranslate.value = withTiming(300, { duration: 200 });
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
    sheetTranslate.value = withTiming(300, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  };

  const handleAction = (action: () => void) => {
    handleClose();
    setTimeout(action, 200);
  };

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

          <Text style={[styles.title, { color: themeColors.text }]}>Log</Text>

          <View style={styles.optionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: themeColors.background },
                pressed && styles.optionPressed,
              ]}
              onPress={() => handleAction(onLogMeal)}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#f9731620' }]}>
                <Ionicons name="restaurant-outline" size={22} color="#f97316" />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: themeColors.text }]}>Log Meal</Text>
                <Text style={[styles.optionDescription, { color: themeColors.textMuted }]}>
                  Take a photo or describe what you ate
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textMuted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: themeColors.background },
                pressed && styles.optionPressed,
              ]}
              onPress={() => handleAction(onLogWater)}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#3b82f620' }]}>
                <Ionicons name="water-outline" size={22} color="#3b82f6" />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: themeColors.text }]}>Log Water</Text>
                <Text style={[styles.optionDescription, { color: themeColors.textMuted }]}>
                  Track your hydration
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textMuted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: themeColors.background },
                pressed && styles.optionPressed,
              ]}
              onPress={() => handleAction(onLogWorkout)}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#22c55e20' }]}>
                <Ionicons name="barbell-outline" size={22} color="#22c55e" />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: themeColors.text }]}>Log Workout</Text>
                <Text style={[styles.optionDescription, { color: themeColors.textMuted }]}>
                  Record your exercise activity
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textMuted} />
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              { backgroundColor: themeColors.background },
              pressed && styles.cancelPressed,
            ]}
            onPress={handleClose}
          >
            <Text style={[styles.cancelText, { color: themeColors.text }]}>Cancel</Text>
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
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  optionsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
  },
  optionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  cancelPressed: {
    opacity: 0.8,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
});
