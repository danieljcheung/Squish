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

interface LogActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onLogExpense: () => void;
  onLogIncome: () => void;
  onAddBill: () => void;
  onScanReceipt?: () => void;
}

export function LogActionSheet({
  visible,
  onClose,
  onLogExpense,
  onLogIncome,
  onAddBill,
  onScanReceipt,
}: LogActionSheetProps) {
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
              onPress={() => handleAction(onLogExpense)}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#ef444420' }]}>
                <Ionicons name="cart-outline" size={22} color="#ef4444" />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: themeColors.text }]}>Log Expense</Text>
                <Text style={[styles.optionDescription, { color: themeColors.textMuted }]}>
                  Track a purchase or spending
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
              onPress={() => handleAction(onLogIncome)}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#22c55e20' }]}>
                <Ionicons name="wallet-outline" size={22} color="#22c55e" />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: themeColors.text }]}>Add Income</Text>
                <Text style={[styles.optionDescription, { color: themeColors.textMuted }]}>
                  Record salary, tips, or earnings
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
              onPress={() => handleAction(onAddBill)}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#3b82f620' }]}>
                <Ionicons name="calendar-outline" size={22} color="#3b82f6" />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: themeColors.text }]}>Add Bill</Text>
                <Text style={[styles.optionDescription, { color: themeColors.textMuted }]}>
                  Set up a recurring bill or subscription
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textMuted} />
            </Pressable>

            {onScanReceipt && (
              <Pressable
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: themeColors.background },
                  pressed && styles.optionPressed,
                ]}
                onPress={() => handleAction(onScanReceipt)}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#a855f720' }]}>
                  <Ionicons name="scan-outline" size={22} color="#a855f7" />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: themeColors.text }]}>Scan Receipt</Text>
                  <Text style={[styles.optionDescription, { color: themeColors.textMuted }]}>
                    Take a photo to log automatically
                  </Text>
                </View>
                <View style={[styles.comingSoonBadge, { backgroundColor: themeColors.primary }]}>
                  <Text style={styles.comingSoonText}>Soon</Text>
                </View>
              </Pressable>
            )}
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
  comingSoonBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: '#101914',
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
