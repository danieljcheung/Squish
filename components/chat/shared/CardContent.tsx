import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface CardContentProps {
  children: React.ReactNode;
  emoji?: string;
  title?: string;
  subtitle?: string;
  titleColor?: string;
  subtitleColor?: string;
  style?: ViewStyle;
}

export function CardContent({
  children,
  emoji,
  title,
  subtitle,
  titleColor,
  subtitleColor,
  style,
}: CardContentProps) {
  const { colors: themeColors } = useTheme();

  // If emoji and title are provided, render the standard layout
  if (emoji || title) {
    return (
      <View style={[styles.container, style]}>
        {emoji && <Text style={styles.emoji}>{emoji}</Text>}
        <View style={styles.details}>
          {title && (
            <Text style={[styles.title, { color: titleColor || themeColors.text }]}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={[styles.subtitle, { color: subtitleColor || themeColors.textMuted }]}>
              {subtitle}
            </Text>
          )}
          {children}
        </View>
      </View>
    );
  }

  // Otherwise, just render children with padding
  return <View style={[styles.simpleContainer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  simpleContainer: {
    padding: spacing.lg,
  },
  emoji: {
    fontSize: 36,
  },
  details: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
});
