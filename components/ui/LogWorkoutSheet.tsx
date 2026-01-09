import { View, Text, Pressable, StyleSheet, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
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
import { WorkoutType, WORKOUT_TYPE_INFO } from '@/types';

interface LogWorkoutSheetProps {
  visible: boolean;
  onLog: (type: WorkoutType, durationMins: number, notes?: string) => void | Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90];

const WORKOUT_TYPES: WorkoutType[] = ['cardio', 'strength', 'flexibility', 'hiit', 'walk', 'other'];

export function LogWorkoutSheet({
  visible,
  onLog,
  onClose,
  loading = false,
}: LogWorkoutSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();

  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState('');
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [notes, setNotes] = useState('');

  const backdropOpacity = useSharedValue(0);
  const sheetTranslate = useSharedValue(400);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      sheetTranslate.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      sheetTranslate.value = withTiming(400, { duration: 200 });
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
    sheetTranslate.value = withTiming(400, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
    // Reset state
    setSelectedType(null);
    setSelectedDuration(null);
    setCustomDuration('');
    setShowCustomDuration(false);
    setNotes('');
  };

  const handleDurationSelect = (mins: number) => {
    setSelectedDuration(mins);
    setShowCustomDuration(false);
    setCustomDuration('');
  };

  const handleCustomDurationConfirm = () => {
    const mins = parseInt(customDuration, 10);
    if (mins > 0 && mins <= 480) {
      setSelectedDuration(mins);
    }
  };

  const handleLog = async () => {
    if (!selectedType || !selectedDuration) return;

    await onLog(selectedType, selectedDuration, notes.trim() || undefined);
    handleClose();
  };

  const isLogDisabled = !selectedType || !selectedDuration || loading;

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
            <Ionicons name="barbell-outline" size={28} color="#22c55e" />
            <Text style={[styles.title, { color: themeColors.text }]}>Log Workout</Text>
          </View>

          {/* Workout Type Selection */}
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Type</Text>
          <View style={styles.typeContainer}>
            {WORKOUT_TYPES.map((type) => {
              const info = WORKOUT_TYPE_INFO[type];
              const isSelected = selectedType === type;
              return (
                <Pressable
                  key={type}
                  style={[
                    styles.typePill,
                    { backgroundColor: themeColors.background },
                    isSelected && styles.typePillSelected,
                  ]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={styles.typeEmoji}>{info.emoji}</Text>
                  <Text
                    style={[
                      styles.typeLabel,
                      { color: isSelected ? '#22c55e' : themeColors.text },
                    ]}
                  >
                    {info.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Duration Selection */}
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Duration</Text>
          <View style={styles.durationContainer}>
            {DURATION_PRESETS.map((mins) => {
              const isSelected = selectedDuration === mins && !showCustomDuration;
              return (
                <Pressable
                  key={mins}
                  style={[
                    styles.durationPill,
                    { backgroundColor: themeColors.background },
                    isSelected && styles.durationPillSelected,
                  ]}
                  onPress={() => handleDurationSelect(mins)}
                >
                  <Text
                    style={[
                      styles.durationText,
                      { color: isSelected ? '#22c55e' : themeColors.text },
                    ]}
                  >
                    {mins}
                  </Text>
                  <Text
                    style={[
                      styles.durationUnit,
                      { color: isSelected ? '#22c55e' : themeColors.textMuted },
                    ]}
                  >
                    min
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom Duration */}
          {showCustomDuration ? (
            <View style={styles.customDurationContainer}>
              <View style={styles.customDurationRow}>
                <TextInput
                  style={[styles.customDurationInput, { backgroundColor: themeColors.background, color: themeColors.text }]}
                  value={customDuration}
                  onChangeText={setCustomDuration}
                  placeholder="0"
                  placeholderTextColor={themeColors.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                  autoFocus
                  onBlur={handleCustomDurationConfirm}
                  onSubmitEditing={handleCustomDurationConfirm}
                />
                <Text style={[styles.customDurationUnit, { color: themeColors.textMuted }]}>minutes</Text>
              </View>
              <Pressable
                style={styles.customDurationCancel}
                onPress={() => {
                  setShowCustomDuration(false);
                  setCustomDuration('');
                }}
              >
                <Text style={[styles.customDurationCancelText, { color: themeColors.textMuted }]}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.customToggle}
              onPress={() => setShowCustomDuration(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color={themeColors.textMuted} />
              <Text style={[styles.customToggleText, { color: themeColors.textMuted }]}>
                Custom duration
              </Text>
            </Pressable>
          )}

          {/* Notes Input */}
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: themeColors.background, color: themeColors.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g., chest and back, 5K run..."
            placeholderTextColor={themeColors.textMuted}
            multiline={false}
            maxLength={100}
          />

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
              <Text style={styles.logButtonText}>Log Workout</Text>
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
  sectionLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    borderColor: '#22c55e',
    backgroundColor: '#22c55e15',
  },
  typeEmoji: {
    fontSize: 16,
  },
  typeLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
  },
  durationContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  durationPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  durationPillSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#22c55e15',
  },
  durationText: {
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  durationUnit: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  customToggleText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  customDurationContainer: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  customDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  customDurationInput: {
    width: 80,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    fontSize: 24,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  customDurationUnit: {
    fontSize: 16,
    fontFamily: fonts.medium,
  },
  customDurationCancel: {
    paddingVertical: spacing.sm,
  },
  customDurationCancelText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  notesInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    fontSize: 15,
    fontFamily: fonts.regular,
    marginBottom: spacing.xl,
  },
  logButton: {
    backgroundColor: '#22c55e',
    paddingVertical: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logButtonDisabled: {
    opacity: 0.5,
  },
  logButtonPressed: {
    backgroundColor: '#16a34a',
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
