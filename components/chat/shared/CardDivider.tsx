import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface CardDividerProps {
  style?: ViewStyle;
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export function CardDivider({ style, spacing: spacingSize = 'md' }: CardDividerProps) {
  const { colors: themeColors } = useTheme();

  const paddingTop =
    spacingSize === 'none'
      ? 0
      : spacingSize === 'sm'
        ? spacing.sm
        : spacingSize === 'lg'
          ? spacing.lg
          : spacing.md;

  return (
    <View
      style={[
        styles.divider,
        { borderTopColor: themeColors.background, paddingTop },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
});
