import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

export interface QuickReply {
  id: string;
  text: string;
}

interface QuickRepliesProps {
  replies: QuickReply[];
  onSelect: (reply: QuickReply) => void;
}

export function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  const { colors: themeColors } = useTheme();

  if (replies.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {replies.map((reply) => (
          <Pressable
            key={reply.id}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: themeColors.surface },
              pressed && { backgroundColor: themeColors.primary },
            ]}
            onPress={() => onSelect(reply)}
          >
            <Text style={[styles.chipText, { color: themeColors.text }]}>{reply.text}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// Helper to get contextual quick replies based on the last agent message
export function getContextualReplies(lastAgentMessage: string | undefined): QuickReply[] {
  if (!lastAgentMessage) return [];

  const message = lastAgentMessage.toLowerCase();

  // Workout type selection
  if (message.includes('what type') || message.includes('what kind of workout') || message.includes('what workout')) {
    return [
      { id: 'type-cardio', text: 'Cardio' },
      { id: 'type-strength', text: 'Strength' },
      { id: 'type-flexibility', text: 'Flexibility' },
      { id: 'type-hiit', text: 'HIIT' },
      { id: 'type-walk', text: 'Walk' },
    ];
  }

  // Workout duration selection
  if (message.includes('how long') || message.includes('duration') || message.includes('how many minutes')) {
    return [
      { id: 'duration-15', text: '15 min' },
      { id: 'duration-30', text: '30 min' },
      { id: 'duration-45', text: '45 min' },
      { id: 'duration-60', text: '1 hour' },
      { id: 'duration-90', text: '1.5 hours' },
    ];
  }

  // Workout related questions
  if (message.includes('workout') && message.includes('?')) {
    if (message.includes('how did') || message.includes('how was')) {
      return [
        { id: 'workout-great', text: 'Great!' },
        { id: 'workout-tough', text: 'It was tough' },
        { id: 'workout-skipped', text: 'I skipped it' },
      ];
    }
    if (message.includes('ready') || message.includes('want to')) {
      return [
        { id: 'workout-yes', text: "Yes, let's go!" },
        { id: 'workout-later', text: 'Maybe later' },
        { id: 'workout-rest', text: 'I need a rest day' },
      ];
    }
  }

  // Workout logging initiated
  if (message.includes('log') && message.includes('workout')) {
    return [
      { id: 'workout-just-did', text: 'Just finished one!' },
      { id: 'workout-details', text: 'Let me tell you about it' },
    ];
  }

  // Water/hydration related
  if (message.includes('water') || message.includes('hydrat') || message.includes('drink')) {
    if (message.includes('how much') || message.includes('have you been') || message.includes('drinking enough')) {
      return [
        { id: 'water-yes', text: 'Yes, staying hydrated!' },
        { id: 'water-behind', text: "I'm a bit behind" },
        { id: 'water-log', text: 'Let me log some' },
      ];
    }
    if (message.includes('reminder') || message.includes('don\'t forget')) {
      return [
        { id: 'water-thanks', text: 'Thanks for the reminder!' },
        { id: 'water-drank', text: 'Just had some!' },
      ];
    }
    if (message.includes('great job') || message.includes('well done') || message.includes('keep it up')) {
      return [
        { id: 'water-thanks', text: 'Thanks!' },
        { id: 'water-more', text: 'Going for more!' },
      ];
    }
  }

  // Meal/food related
  if (message.includes('lunch') || message.includes('breakfast') || message.includes('dinner') || message.includes('eat')) {
    if (message.includes('what did you') || message.includes('what have you')) {
      return [
        { id: 'meal-notyet', text: "Haven't eaten yet" },
        { id: 'meal-log', text: 'Let me log it' },
        { id: 'meal-healthy', text: 'Something healthy!' },
      ];
    }
  }

  // Ready to log meals
  if (message.includes('log') && (message.includes('meal') || message.includes('food'))) {
    return [
      { id: 'log-yes', text: 'Yes!' },
      { id: 'log-later', text: 'Maybe later' },
    ];
  }

  // Meal analysis confirmation
  if (message.includes('look right') || message.includes('look correct') || message.includes('is this correct')) {
    return [
      { id: 'confirm-yes', text: 'Yes, log it' },
      { id: 'confirm-adjust', text: 'Let me adjust' },
    ];
  }

  // Feeling/energy related
  if (message.includes('how are you') || message.includes('how do you feel') || message.includes('feeling')) {
    return [
      { id: 'feel-great', text: 'Feeling great!' },
      { id: 'feel-tired', text: 'A bit tired' },
      { id: 'feel-motivated', text: 'Super motivated!' },
    ];
  }

  // Goals/progress related
  if (message.includes('goal') && message.includes('?')) {
    return [
      { id: 'goal-track', text: 'On track!' },
      { id: 'goal-struggling', text: 'Struggling a bit' },
      { id: 'goal-help', text: 'Need some help' },
    ];
  }

  // Yes/No questions
  if (message.includes('?')) {
    if (message.includes('would you like') || message.includes('do you want') || message.includes('shall')) {
      return [
        { id: 'yn-yes', text: 'Yes please!' },
        { id: 'yn-no', text: 'Not right now' },
      ];
    }
    if (message.includes('ready')) {
      return [
        { id: 'ready-yes', text: "Let's do it!" },
        { id: 'ready-no', text: 'Give me a moment' },
      ];
    }
  }

  // Greeting/check-in
  if (message.includes('good morning') || message.includes('morning!')) {
    return [
      { id: 'morning-great', text: 'Good morning!' },
      { id: 'morning-ready', text: 'Ready to crush it!' },
      { id: 'morning-coffee', text: 'Need coffee first' },
    ];
  }

  // Motivation offered
  if (message.includes('you got this') || message.includes('keep going') || message.includes('proud of you')) {
    return [
      { id: 'thanks', text: 'Thanks!' },
      { id: 'motivated', text: "Let's go!" },
    ];
  }

  // Weekly summary shown
  if (message.includes('weekly') || message.includes('this week') || message.includes('summary')) {
    return [
      { id: 'summary-tips', text: 'What should I improve?' },
      { id: 'summary-compare', text: 'vs last week' },
      { id: 'summary-plan', text: 'Plan for next week' },
    ];
  }

  // Default - no contextual replies
  return [];
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  chipPressed: {
    backgroundColor: colors.primary,
    transform: [{ scale: 0.96 }],
  },
  chipText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text,
  },
});
