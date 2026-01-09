import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface CardSectionHeaderProps {
  title: string;
  emoji?: string;
  uppercase?: boolean;
  style?: ViewStyle;
}

export function CardSectionHeader({
  title,
  emoji,
  uppercase = true,
  style,
}: CardSectionHeaderProps) {
  const { colors: themeColors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text
        style={[
          styles.title,
          { color: themeColors.textMuted },
          uppercase && styles.uppercase,
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  emoji: {
    fontSize: 16,
  },
  title: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  uppercase: {
    textTransform: 'uppercase',
  },
});
