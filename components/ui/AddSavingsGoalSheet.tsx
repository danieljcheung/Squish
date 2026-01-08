import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

// Goal icon options
const GOAL_ICONS = [
  { id: 'vacation', icon: '🏖️', label: 'Vacation' },
  { id: 'car', icon: '🚗', label: 'Car' },
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'emergency', icon: '🚨', label: 'Emergency' },
  { id: 'education', icon: '🎓', label: 'Education' },
  { id: 'wedding', icon: '💒', label: 'Wedding' },
  { id: 'tech', icon: '💻', label: 'Tech' },
  { id: 'health', icon: '🏥', label: 'Health' },
  { id: 'investment', icon: '📈', label: 'Investment' },
  { id: 'gift', icon: '🎁', label: 'Gift' },
  { id: 'travel', icon: '✈️', label: 'Travel' },
  { id: 'other', icon: '💰', label: 'Other' },
];

interface AddSavingsGoalSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (goal: {
    name: string;
    icon: string;
    target_amount: number;
    target_date?: string;
  }) => void | Promise<void>;
  currencySymbol?: string;
}

export function AddSavingsGoalSheet({
  visible,
  onClose,
  onAdd,
  currencySymbol = '$',
}: AddSavingsGoalSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('💰');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const triggerHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleIconSelect = (icon: string) => {
    triggerHaptic();
    setSelectedIcon(icon);
  };

  const handleAdd = async () => {
    const amount = parseFloat(targetAmount);
    if (!name.trim() || !amount || amount <= 0) return;

    setIsAdding(true);

    try {
      await onAdd({
        name: name.trim(),
        icon: selectedIcon,
        target_amount: amount,
        target_date: targetDate || undefined,
      });

      // Reset state
      setName('');
      setSelectedIcon('💰');
      setTargetAmount('');
      setTargetDate('');
      onClose();
    } catch (error) {
      console.error('Error adding savings goal:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedIcon('💰');
    setTargetAmount('');
    setTargetDate('');
    onClose();
  };

  const canAdd = name.trim() && parseFloat(targetAmount) > 0;

  // Format target date input (YYYY-MM-DD)
  const handleDateChange = (text: string) => {
    // Only allow numbers and dashes
    const cleaned = text.replace(/[^0-9-]/g, '');

    // Auto-format as user types
    if (cleaned.length <= 4) {
      setTargetDate(cleaned);
    } else if (cleaned.length <= 7) {
      setTargetDate(`${cleaned.slice(0, 4)}-${cleaned.slice(4)}`);
    } else {
      setTargetDate(`${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg, backgroundColor: themeColors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.headerIcon}>🎯</Text>
              <Text style={[styles.title, { color: themeColors.text }]}>New Savings Goal</Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Goal Name */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Goal Name</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: themeColors.surface, color: themeColors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Emergency Fund, Vacation"
                  placeholderTextColor={themeColors.textMuted}
                  maxLength={50}
                />
              </View>

              {/* Goal Icon */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Icon</Text>
                <View style={styles.iconGrid}>
                  {GOAL_ICONS.map((item) => (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.iconOption,
                        { backgroundColor: themeColors.surface },
                        selectedIcon === item.icon && { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
                      ]}
                      onPress={() => handleIconSelect(item.icon)}
                    >
                      <Text style={styles.iconEmoji}>{item.icon}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Target Amount */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Target Amount</Text>
                <View style={[styles.amountContainer, { backgroundColor: themeColors.surface }]}>
                  <Text style={[styles.currencySymbol, { color: themeColors.textMuted }]}>{currencySymbol}</Text>
                  <TextInput
                    style={[styles.amountInput, { color: themeColors.text }]}
                    value={targetAmount}
                    onChangeText={(text) => setTargetAmount(text.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    placeholderTextColor={themeColors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Target Date (Optional) */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Target Date (Optional)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: themeColors.surface, color: themeColors.text }]}
                  value={targetDate}
                  onChangeText={handleDateChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={themeColors.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Pressable
                style={[styles.cancelButton, { backgroundColor: themeColors.surface }]}
                onPress={handleClose}
              >
                <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.addButton,
                  { backgroundColor: themeColors.primary },
                  !canAdd && styles.addButtonDisabled,
                ]}
                onPress={handleAdd}
                disabled={!canAdd || isAdding}
              >
                {isAdding ? (
                  <Text style={styles.addButtonText}>Adding...</Text>
                ) : (
                  <>
                    <Ionicons name="add" size={20} color="#101914" />
                    <Text style={styles.addButtonText}>Add Goal</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconOption: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconEmoji: {
    fontSize: 26,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  addButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#101914',
  },
});
