import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

interface CardContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number;
  compact?: boolean;
}

export function CardContainer({
  children,
  style,
  maxWidth = 280,
  compact = false,
}: CardContainerProps) {
  const { colors: themeColors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: themeColors.surface },
        compact && styles.compact,
        maxWidth ? { maxWidth } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  compact: {
    borderRadius: 16,
  },
});
