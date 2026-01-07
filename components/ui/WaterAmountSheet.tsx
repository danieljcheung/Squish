import { View, Text, Pressable, StyleSheet, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { WATER_PRESETS, WATER_GLASS_ML } from '@/types';

interface WaterAmountSheetProps {
  visible: boolean;
  onSelect: (amountMl: number) => void | Promise<void>;
  onClose: () => void;
  currentTotalMl?: number;
  goalMl?: number;
}

export function WaterAmountSheet({
  visible,
  onSelect,
  onClose,
  currentTotalMl = 0,
  goalMl = 2000,
}: WaterAmountSheetProps) {
  const insets = useSafeAreaInsets();
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetSelect = async (amountMl: number) => {
    await onSelect(amountMl);
    onClose();
  };

  const handleCustomSubmit = async () => {
    const amount = parseInt(customAmount, 10);
    if (amount > 0 && amount <= 2000) {
      await onSelect(amount);
      setCustomAmount('');
      setShowCustom(false);
      onClose();
    }
  };

  const remainingMl = Math.max(0, goalMl - currentTotalMl);
  const glasses = Math.round(currentTotalMl / WATER_GLASS_ML);
  const goalGlasses = Math.round(goalMl / WATER_GLASS_ML);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Ionicons name="water" size={28} color="#60a5fa" />
            <Text style={styles.title}>Log Water</Text>
          </View>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, (currentTotalMl / goalMl) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {glasses}/{goalGlasses} glasses today
            </Text>
          </View>

          {/* Preset options */}
          <View style={styles.presetsContainer}>
            {WATER_PRESETS.map((preset) => (
              <Pressable
                key={preset.id}
                style={({ pressed }) => [
                  styles.presetButton,
                  pressed && styles.presetButtonPressed,
                ]}
                onPress={() => handlePresetSelect(preset.amount_ml)}
              >
                <Text style={styles.presetIcon}>{preset.icon}</Text>
                <Text style={styles.presetAmount}>{preset.amount_ml}ml</Text>
                <Text style={styles.presetLabel}>{preset.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Custom amount section */}
          {showCustom ? (
            <View style={styles.customContainer}>
              <View style={styles.customInputRow}>
                <TextInput
                  style={styles.customInput}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  placeholder="Enter amount"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                />
                <Text style={styles.customUnit}>ml</Text>
              </View>
              <View style={styles.customButtonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.customCancelButton,
                    pressed && styles.customCancelButtonPressed,
                  ]}
                  onPress={() => {
                    setShowCustom(false);
                    setCustomAmount('');
                  }}
                >
                  <Text style={styles.customCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.customConfirmButton,
                    pressed && styles.customConfirmButtonPressed,
                    !customAmount && styles.customConfirmButtonDisabled,
                  ]}
                  onPress={handleCustomSubmit}
                  disabled={!customAmount}
                >
                  <Text style={styles.customConfirmText}>Add</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.customToggle,
                pressed && styles.customTogglePressed,
              ]}
              onPress={() => setShowCustom(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.textMuted} />
              <Text style={styles.customToggleText}>Custom amount</Text>
            </Pressable>
          )}

          {/* Cancel button */}
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
            ]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.xl,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: `${colors.textMuted}20`,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#60a5fa',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  presetButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  presetButtonPressed: {
    backgroundColor: '#60a5fa20',
    transform: [{ scale: 0.98 }],
  },
  presetIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  presetAmount: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  presetLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  customTogglePressed: {
    opacity: 0.7,
  },
  customToggleText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  customContainer: {
    marginBottom: spacing.lg,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  customInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    width: 120,
    textAlign: 'center',
  },
  customUnit: {
    fontSize: 18,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  customButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  customCancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  customCancelButtonPressed: {
    backgroundColor: `${colors.textMuted}15`,
  },
  customCancelText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  customConfirmButton: {
    flex: 2,
    backgroundColor: '#60a5fa',
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  customConfirmButtonPressed: {
    backgroundColor: '#3b82f6',
  },
  customConfirmButtonDisabled: {
    opacity: 0.5,
  },
  customConfirmText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: '#ffffff',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButtonPressed: {
    backgroundColor: `${colors.textMuted}20`,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
});
