import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { createAgent } from '@/lib/supabase';

// Question configuration
interface Question {
  id: string;
  text: string;
  type: 'choice' | 'text';
  options?: string[];
  placeholder?: string;
}

const QUESTIONS: Question[] = [
  {
    id: 'goal',
    text: "Hey there! I'm excited to be your fitness coach! 💪\n\nFirst up - what's your main fitness goal?",
    type: 'choice',
    options: ['Lose weight', 'Build muscle', 'Get healthier', 'Train for an event'],
  },
  {
    id: 'target',
    text: 'Great choice! Do you have a specific target or timeline in mind?',
    type: 'text',
    placeholder: 'e.g., "Lose 10 lbs in 3 months" or "No specific target"',
  },
  {
    id: 'frequency',
    text: 'How often do you currently work out?',
    type: 'choice',
    options: ['Never', '1-2 times/week', '3-4 times/week', '5+ times/week'],
  },
  {
    id: 'location',
    text: 'Where do you prefer to work out?',
    type: 'choice',
    options: ['At the gym', 'At home', 'Outdoors', 'Mix of everything'],
  },
  {
    id: 'diet',
    text: 'Any dietary restrictions I should know about?',
    type: 'text',
    placeholder: 'e.g., "Vegetarian", "No dairy", or "None"',
  },
  {
    id: 'style',
    text: 'How should I coach you? What style works best for you?',
    type: 'choice',
    options: ['Tough love 🔥', 'Gentle encouragement 🌸', 'Balanced approach ⚖️'],
  },
  {
    id: 'name',
    text: "Last question! What should I call myself?\n\nYou can pick a name or keep the default.",
    type: 'text',
    placeholder: 'Coach',
  },
];

// Chat bubble component
const ChatBubble = ({
  text,
  isUser,
  animate = false,
}: {
  text: string;
  isUser: boolean;
  animate?: boolean;
}) => {
  const fadeAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(animate ? 20 : 0)).current;

  useEffect(() => {
    if (animate) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  return (
    <Animated.View
      style={[
        styles.bubbleContainer,
        isUser ? styles.userBubbleContainer : styles.botBubbleContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {!isUser && (
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>💪</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
};

// Progress indicator
const ProgressIndicator = ({ current, total }: { current: number; total: number }) => (
  <View style={styles.progressContainer}>
    <View style={styles.progressBar}>
      <View
        style={[
          styles.progressFill,
          { width: `${((current + 1) / total) * 100}%` },
        ]}
      />
    </View>
    <Text style={styles.progressText}>
      {current + 1} of {total}
    </Text>
  </View>
);

// Option button
const OptionButton = ({
  text,
  onPress,
  delay = 0,
}: {
  text: string;
  onPress: () => void;
  delay?: number;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Pressable
        style={({ pressed }) => [
          styles.optionButton,
          pressed && styles.optionButtonPressed,
        ]}
        onPress={onPress}
      >
        <Text style={styles.optionButtonText}>{text}</Text>
      </Pressable>
    </Animated.View>
  );
};

export default function CreateAgentScreen() {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [chatHistory, setChatHistory] = useState<Array<{ text: string; isUser: boolean }>>([
    { text: QUESTIONS[0].text, isUser: false },
  ]);
  const [textInput, setTextInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showOptions, setShowOptions] = useState(true);

  const currentQ = QUESTIONS[currentQuestion];

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleResponse = async (response: string) => {
    // Hide options while processing
    setShowOptions(false);

    // Save response
    const newResponses = { ...responses, [currentQ.id]: response };
    setResponses(newResponses);

    // Add user response to chat
    setChatHistory((prev) => [...prev, { text: response, isUser: true }]);
    scrollToBottom();

    // Check if this was the last question
    if (currentQuestion >= QUESTIONS.length - 1) {
      // Create the agent
      await createFitnessAgent(newResponses);
      return;
    }

    // Move to next question after a short delay
    setTimeout(() => {
      const nextQ = QUESTIONS[currentQuestion + 1];
      setChatHistory((prev) => [...prev, { text: nextQ.text, isUser: false }]);
      setCurrentQuestion((prev) => prev + 1);
      setShowOptions(true);
      setTextInput('');
      scrollToBottom();
    }, 500);
  };

  const handleTextSubmit = () => {
    const value = textInput.trim() || currentQ.placeholder || '';
    if (value) {
      handleResponse(value);
    }
  };

  const createFitnessAgent = async (finalResponses: Record<string, string>) => {
    if (!user) return;

    setIsCreating(true);

    // Add "creating" message
    setChatHistory((prev) => [
      ...prev,
      { text: "Perfect! I'm setting up your personalized coaching experience... 🎉", isUser: false },
    ]);
    scrollToBottom();

    const coachName = finalResponses.name || 'Coach';
    const coachingStyle = finalResponses.style?.includes('Tough')
      ? 'tough_love'
      : finalResponses.style?.includes('Gentle')
      ? 'gentle'
      : 'balanced';

    const persona = {
      name: coachName,
      style: coachingStyle,
      userGoal: finalResponses.goal,
      userTarget: finalResponses.target,
      currentFrequency: finalResponses.frequency,
      preferredLocation: finalResponses.location,
      dietaryRestrictions: finalResponses.diet,
    };

    const { data, error } = await createAgent({
      user_id: user.id,
      type: 'fitness',
      name: coachName,
      persona_json: persona,
      settings_json: {
        notifications: true,
        checkInTime: '09:00',
      },
    });

    if (error) {
      setChatHistory((prev) => [
        ...prev,
        { text: "Oops! Something went wrong. Please try again.", isUser: false },
      ]);
      setIsCreating(false);
      return;
    }

    // Success - show completion message then navigate to home
    setChatHistory((prev) => [
      ...prev,
      { text: `${coachName} is ready! Let's crush your goals together! 💪`, isUser: false },
    ]);
    scrollToBottom();

    setTimeout(() => {
      router.replace('/(main)');
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Create Fitness Coach</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress */}
      <ProgressIndicator current={currentQuestion} total={QUESTIONS.length} />

      {/* Chat */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={scrollToBottom}
      >
        {chatHistory.map((msg, index) => (
          <ChatBubble
            key={index}
            text={msg.text}
            isUser={msg.isUser}
            animate={index === chatHistory.length - 1}
          />
        ))}
      </ScrollView>

      {/* Input area */}
      {!isCreating && showOptions && (
        <View style={styles.inputArea}>
          {currentQ.type === 'choice' && currentQ.options ? (
            <View style={styles.optionsContainer}>
              {currentQ.options.map((option, index) => (
                <OptionButton
                  key={option}
                  text={option}
                  onPress={() => handleResponse(option)}
                  delay={index * 50}
                />
              ))}
            </View>
          ) : (
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                value={textInput}
                onChangeText={setTextInput}
                placeholder={currentQ.placeholder}
                placeholderTextColor={colors.textLight}
                onSubmitEditing={handleTextSubmit}
                returnKeyType="send"
                autoFocus
              />
              <Pressable
                style={[
                  styles.sendButton,
                  !textInput.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleTextSubmit}
              >
                <Text style={styles.sendButtonText}>→</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {isCreating && (
        <View style={styles.creatingContainer}>
          <Text style={styles.creatingText}>Creating your coach...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.mint,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.textLight,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  headerSpacer: {
    width: 36,
  },
  // Progress
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.background,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.mint,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  // Chat
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },
  bubbleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userBubbleContainer: {
    justifyContent: 'flex-end',
  },
  botBubbleContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slimeCoach,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatar: {
    fontSize: 18,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  botBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: colors.mint,
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  bubbleText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  userBubbleText: {
    color: colors.text,
  },
  // Input
  inputArea: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionButton: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    margin: 4,
    borderWidth: 2,
    borderColor: colors.mint,
  },
  optionButtonPressed: {
    backgroundColor: colors.mint,
  },
  optionButtonText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.mint,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.mint,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: colors.background,
  },
  sendButtonText: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '600',
  },
  creatingContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  creatingText: {
    fontSize: 16,
    color: colors.textLight,
  },
});
