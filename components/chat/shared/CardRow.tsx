import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface CardRowProps {
  label: string;
  value: string | number;
  valueColor?: string;
  icon?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  showChevron?: boolean;
  style?: ViewStyle;
  backgroundColor?: string;
}

export function CardRow({
  label,
  value,
  valueColor,
  icon,
  iconName,
  onPress,
  showChevron = false,
  style,
  backgroundColor,
}: CardRowProps) {
  const { colors: themeColors } = useTheme();

  const content = (
    <>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      {iconName && (
        <Ionicons name={iconName} size={14} color={themeColors.textMuted} />
      )}
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: themeColors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: valueColor || themeColors.text }]}>
        {value}
      </Text>
      {showChevron && (
        <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={[
          styles.row,
          { backgroundColor: backgroundColor || themeColors.background },
          style,
        ]}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.rowPlain, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  rowPlain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  value: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
});
