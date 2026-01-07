import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';

export interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  onLongPress?: () => void;
}

interface QuickActionsBarProps {
  actions: QuickAction[];
  visible?: boolean;
}

const BAR_HEIGHT = 52;

export function QuickActionsBar({ actions, visible = true }: QuickActionsBarProps) {
  if (actions.length === 0) return null;

  const animatedStyle = useAnimatedStyle(() => ({
    height: withTiming(visible ? BAR_HEIGHT : 0, {
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    opacity: withTiming(visible ? 1 : 0, {
      duration: visible ? 200 : 100,
    }),
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {actions.map((action) => (
          <Pressable
            key={action.id}
            style={({ pressed }) => [
              styles.actionPill,
              pressed && styles.actionPillPressed,
            ]}
            onPress={action.onPress}
            onLongPress={action.onLongPress}
            delayLongPress={400}
          >
            <Ionicons name={action.icon} size={16} color={colors.text} />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.primary}20`, // Light pastel primary
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  actionPillPressed: {
    backgroundColor: colors.primary,
    transform: [{ scale: 0.96 }],
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
});
