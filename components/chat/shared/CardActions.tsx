import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface CardActionsProps {
  primaryLabel?: string;
  primaryLoadingLabel?: string;
  primaryCompletedLabel?: string;
  secondaryLabel?: string;
  primaryColor?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  showCheckmark?: boolean;
  style?: ViewStyle;
}

export function CardActions({
  primaryLabel = 'Log it',
  primaryLoadingLabel = 'Logging...',
  primaryCompletedLabel = 'Logged',
  secondaryLabel = 'Adjust',
  primaryColor = '#22c55e',
  onPrimary,
  onSecondary,
  isLoading = false,
  isDisabled = false,
  showCheckmark = true,
  style,
}: CardActionsProps) {
  const { colors: themeColors } = useTheme();
  const [hasClicked, setHasClicked] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Mark as completed when loading finishes after a click
  useEffect(() => {
    if (!isLoading && hasClicked) {
      setIsCompleted(true);
    }
  }, [isLoading, hasClicked]);

  const pressedColor = adjustColor(primaryColor, -15);
  const isPrimaryDisabled = isLoading || isDisabled || hasClicked || isCompleted;

  const handlePrimaryPress = () => {
    if (isPrimaryDisabled) return;
    setHasClicked(true);
    onPrimary();
  };

  return (
    <View style={[styles.container, { borderTopColor: themeColors.background }, style]}>
      {onSecondary && (
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            { backgroundColor: themeColors.background },
            pressed && styles.buttonPressed,
          ]}
          onPress={onSecondary}
          disabled={isPrimaryDisabled}
        >
          <Text style={[styles.secondaryButtonText, { color: themeColors.textMuted }]}>
            {secondaryLabel}
          </Text>
        </Pressable>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: primaryColor },
          pressed && !isPrimaryDisabled && { backgroundColor: pressedColor },
          isPrimaryDisabled && styles.buttonDisabled,
          !onSecondary && styles.primaryButtonFull,
        ]}
        onPress={handlePrimaryPress}
        disabled={isPrimaryDisabled}
      >
        {isCompleted ? (
          <>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>{primaryCompletedLabel}</Text>
          </>
        ) : (isLoading || hasClicked) ? (
          <Text style={styles.primaryButtonText}>{primaryLoadingLabel}</Text>
        ) : (
          <>
            {showCheckmark && <Ionicons name="checkmark" size={18} color="#fff" />}
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

// Helper to darken/lighten a hex color
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
  primaryButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  primaryButtonFull: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: '#fff',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
