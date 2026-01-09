import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

type HeaderVariant = 'default' | 'confirmed' | 'pending';

interface CardHeaderProps {
  icon?: string | React.ReactNode;
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  color?: string;
  backgroundColor?: string;
  variant?: HeaderVariant;
  onDismiss?: () => void;
}

export function CardHeader({
  icon,
  iconName,
  title,
  subtitle,
  color = '#22c55e',
  backgroundColor,
  variant = 'default',
  onDismiss,
}: CardHeaderProps) {
  const { colors: themeColors } = useTheme();

  const bgColor = backgroundColor || `${color}20`;
  const isConfirmed = variant === 'confirmed';

  const renderIcon = () => {
    if (typeof icon === 'string') {
      return <Text style={isConfirmed ? styles.emojiSmall : styles.emoji}>{icon}</Text>;
    }
    if (icon) {
      return icon;
    }
    if (iconName) {
      return <Ionicons name={iconName} size={isConfirmed ? 18 : 20} color={color} />;
    }
    return null;
  };

  if (isConfirmed) {
    return (
      <View style={[styles.confirmedHeader, { backgroundColor: bgColor }]}>
        {renderIcon()}
        <Text style={[styles.confirmedText, { color }]}>{title}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.header, { backgroundColor: bgColor }]}>
      {renderIcon()}
      <Text style={[styles.headerText, { color }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.headerSubtitle, { color: `${color}90` }]}>{subtitle}</Text>
      )}
      {onDismiss && (
        <Pressable style={styles.dismissButton} onPress={onDismiss}>
          <Ionicons name="close" size={20} color={themeColors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  emoji: {
    fontSize: 18,
  },
  emojiSmall: {
    fontSize: 16,
  },
  confirmedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  confirmedText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  dismissButton: {
    padding: spacing.xs,
  },
});
