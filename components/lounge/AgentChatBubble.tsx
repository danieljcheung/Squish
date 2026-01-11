import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing, radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { ProfileSlime, SlimeColor, SlimeType } from '@/components/slime';
import { Agent } from '@/types';
import { LoungeMessage } from '@/lib/loungeConversation';

interface AgentChatBubbleProps {
  message: LoungeMessage;
  agent: Agent;
}

// Get bubble background color based on slime color
const getBubbleColor = (slimeColor: SlimeColor, isDark: boolean): string => {
  const slimeColors: Record<SlimeColor, string> = {
    mint: colors.slime.mint,
    peach: colors.slime.peach,
    lavender: colors.slime.lavender,
    skyBlue: colors.slime.skyBlue,
    coral: colors.slime.coral,
    lemon: colors.slime.lemon,
    rose: colors.slime.rose,
    sage: colors.slime.sage,
  };

  const baseColor = slimeColors[slimeColor] || slimeColors.mint;
  // Lower opacity in dark mode for better contrast
  const opacity = isDark ? '25' : '40';
  return `${baseColor}${opacity}`;
};

export function AgentChatBubble({ message, agent }: AgentChatBubbleProps) {
  const { colors: themeColors, isDarkMode } = useTheme();

  const slimeColor = (agent.persona_json?.slime_color || 'mint') as SlimeColor;
  const slimeType = agent.type as SlimeType;
  const isLeft = message.speaker === 'fitness';

  const bubbleColor = getBubbleColor(slimeColor, isDarkMode);

  return (
    <View style={[styles.container, isLeft ? styles.leftContainer : styles.rightContainer]}>
      {isLeft && (
        <View style={styles.avatarContainer}>
          <ProfileSlime color={slimeColor} type={slimeType} size={40} animated={false} />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          { backgroundColor: bubbleColor },
          isLeft ? styles.leftBubble : styles.rightBubble,
        ]}
      >
        <Text style={[styles.messageText, { color: themeColors.text }]}>
          {message.message}
        </Text>
      </View>

      {!isLeft && (
        <View style={styles.avatarContainer}>
          <ProfileSlime color={slimeColor} type={slimeType} size={40} animated={false} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  leftContainer: {
    justifyContent: 'flex-start',
  },
  rightContainer: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    marginHorizontal: spacing.xs,
  },
  bubble: {
    maxWidth: '70%',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  leftBubble: {
    borderBottomLeftRadius: radius.sm,
  },
  rightBubble: {
    borderBottomRightRadius: radius.sm,
  },
  messageText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    lineHeight: 20,
  },
});
