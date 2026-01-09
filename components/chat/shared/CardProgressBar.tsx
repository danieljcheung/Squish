import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

type BarSize = 'sm' | 'md' | 'lg';

interface CardProgressBarProps {
  percent: number;
  color?: string;
  size?: BarSize;
  label?: string;
  value?: string;
  showPreview?: boolean;
  previewPercent?: number;
  previewColor?: string;
  style?: ViewStyle;
}

export function CardProgressBar({
  percent,
  color = '#22c55e',
  size = 'md',
  label,
  value,
  showPreview = false,
  previewPercent = 0,
  previewColor,
  style,
}: CardProgressBarProps) {
  const { colors: themeColors } = useTheme();

  const height = size === 'sm' ? 4 : size === 'lg' ? 10 : 6;
  const borderRadius = height / 2;
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const clampedPreviewPercent = Math.min(Math.max(previewPercent, 0), 100 - clampedPercent);

  return (
    <View style={style}>
      {(label || value) && (
        <View style={styles.header}>
          {label && (
            <Text style={[styles.label, { color: themeColors.text }]}>{label}</Text>
          )}
          {value && (
            <Text style={[styles.value, { color }]}>{value}</Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height, borderRadius, backgroundColor: themeColors.background }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedPercent}%`,
              backgroundColor: color,
              borderRadius,
            },
          ]}
        />
        {showPreview && previewPercent > 0 && (
          <View
            style={[
              styles.preview,
              {
                left: `${clampedPercent}%`,
                width: `${clampedPreviewPercent}%`,
                backgroundColor: previewColor || `${color}60`,
                borderRadius,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  value: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  track: {
    backgroundColor: colors.background,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    height: '100%',
  },
  preview: {
    position: 'absolute',
    height: '100%',
  },
});
