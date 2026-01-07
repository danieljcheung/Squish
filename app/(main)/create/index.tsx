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
  Animated as RNAnimated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
  interpolateColor,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing, shadows, typography } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { createAgent } from '@/lib/supabase';
import { parseError } from '@/lib/errors';
import {
  lbsToKg,
  parseHeightToCm,
  parseActivityLevel,
  parseGender,
  calculateNutritionGoals,
} from '@/lib/nutrition';
import { Slime, SlimeColor, SlimeType } from '@/components/slime';
import { NumberInput } from '@/components/ui/NumberInput';
import { AgentTypeId, getAgentType } from '@/constants/agentTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Slime color options
const SLIME_COLORS: { name: SlimeColor; hex: string; label: string }[] = [
  { name: 'mint', hex: colors.slime.mint, label: 'Mint' },
  { name: 'peach', hex: colors.slime.peach, label: 'Peach' },
  { name: 'lavender', hex: colors.slime.lavender, label: 'Lavender' },
  { name: 'skyBlue', hex: colors.slime.skyBlue, label: 'Sky Blue' },
  { name: 'coral', hex: colors.slime.coral, label: 'Coral' },
  { name: 'lemon', hex: colors.slime.lemon, label: 'Lemon' },
  { name: 'rose', hex: colors.slime.rose, label: 'Rose' },
  { name: 'sage', hex: colors.slime.sage, label: 'Sage' },
];

// Soft shadow for primary elements
const softShadow = Platform.select({
  ios: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  android: {
    elevation: 8,
  },
  default: {},
});

// Question configuration
interface Question {
  id: string;
  text: string;
  type: 'choice' | 'text' | 'number';
  options?: string[];
  placeholder?: string;
  numberConfig?: {
    unit?: { options: string[]; default: string };
    validation?: { min?: number; max?: number };
  };
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
  // Nutrition-related questions
  {
    id: 'age',
    text: "Now let's set up your nutrition goals! How old are you?",
    type: 'number',
    placeholder: '25',
    numberConfig: {
      validation: { min: 13, max: 120 },
    },
  },
  {
    id: 'gender',
    text: 'What is your biological sex? (This helps calculate your metabolism)',
    type: 'choice',
    options: ['Male', 'Female', 'Prefer not to say'],
  },
  {
    id: 'weight',
    text: "What's your current weight?",
    type: 'number',
    placeholder: '150',
    numberConfig: {
      unit: { options: ['lbs', 'kg'], default: 'lbs' },
      validation: { min: 50, max: 700 },
    },
  },
  {
    id: 'height',
    text: 'How tall are you?',
    type: 'number',
    placeholder: '5.10',
    numberConfig: {
      unit: { options: ['ft', 'cm'], default: 'ft' },
      validation: { min: 3, max: 300 },
    },
  },
  {
    id: 'activityLevel',
    text: 'How active are you on a typical day?',
    type: 'choice',
    options: [
      'Sedentary (desk job, little exercise)',
      'Lightly active (light exercise 1-3 days/week)',
      'Moderately active (moderate exercise 3-5 days/week)',
      'Very active (hard exercise 6-7 days/week)',
      'Extremely active (athlete or physical job)',
    ],
  },
];

// Onboarding phases
type Phase = 'interview' | 'colorPicker' | 'namePicker' | 'transformation';

// Chat bubble component
const ChatBubble = ({
  text,
  isUser,
  animate = false,
  timestamp,
  isLast = false,
  themeColors,
}: {
  text: string;
  isUser: boolean;
  animate?: boolean;
  timestamp?: string;
  isLast?: boolean;
  themeColors: ReturnType<typeof useTheme>['colors'];
}) => {
  const fadeAnim = useRef(new RNAnimated.Value(animate ? 0 : 1)).current;
  const slideAnim = useRef(new RNAnimated.Value(animate ? 10 : 0)).current;

  useEffect(() => {
    if (animate) {
      RNAnimated.parallel([
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        RNAnimated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animate]);

  return (
    <RNAnimated.View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowUser : styles.bubbleRowBot,
        isLast && styles.bubbleRowLast,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.bubbleContent}>
        <View style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: themeColors.primary }]
            : [styles.botBubble, { backgroundColor: themeColors.surface }]
        ]}>
          <Text style={[styles.bubbleText, { color: themeColors.text }, isUser && styles.userBubbleText]}>
            {text}
          </Text>
        </View>
        {timestamp && (
          <Text style={[styles.timestamp, { color: themeColors.textMuted }]}>{timestamp}</Text>
        )}
      </View>
    </RNAnimated.View>
  );
};

// Progress bar component
const ProgressBar = ({ progress, themeColors }: { progress: number; themeColors: ReturnType<typeof useTheme>['colors'] }) => {
  return (
    <View style={[styles.progressBarOuter, { backgroundColor: themeColors.surface }]}>
      <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: themeColors.primary }]} />
    </View>
  );
};

// Option button
const OptionButton = ({
  text,
  onPress,
  delay = 0,
  themeColors,
}: {
  text: string;
  onPress: () => void;
  delay?: number;
  themeColors: ReturnType<typeof useTheme>['colors'];
}) => {
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <RNAnimated.View style={{ opacity: fadeAnim }}>
      <Pressable
        style={({ pressed }) => [
          styles.optionButton,
          { backgroundColor: themeColors.surface, borderColor: themeColors.primary },
          pressed && { backgroundColor: themeColors.primary, transform: [{ scale: 0.98 }] },
        ]}
        onPress={onPress}
      >
        <Text style={[styles.optionButtonText, { color: themeColors.text }]}>{text}</Text>
      </Pressable>
    </RNAnimated.View>
  );
};

// Color swatch component with squish animation
const ColorSwatch = ({
  color,
  isSelected,
  onPress,
  themeColors,
}: {
  color: { name: SlimeColor; hex: string };
  isSelected: boolean;
  onPress: () => void;
  themeColors: ReturnType<typeof useTheme>['colors'];
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.85, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    onPress();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          styles.colorSwatch,
          { backgroundColor: color.hex },
          isSelected && [styles.colorSwatchSelected, { borderColor: themeColors.text }],
          animatedStyle,
        ]}
      >
        {isSelected && (
          <Ionicons name="checkmark" size={20} color="#fff" />
        )}
      </Animated.View>
    </Pressable>
  );
};

// Animated Slime for color picker with squish effect
const AnimatedColorSlime = ({ color, slimeType }: { color: SlimeColor; slimeType: SlimeType }) => {
  const squishY = useSharedValue(1);
  const squishX = useSharedValue(1);

  useEffect(() => {
    // Squish animation when color changes
    squishY.value = withSequence(
      withTiming(0.85, { duration: 150, easing: Easing.out(Easing.ease) }),
      withSpring(1, { damping: 8, stiffness: 300 })
    );
    squishX.value = withSequence(
      withTiming(1.15, { duration: 150, easing: Easing.out(Easing.ease) }),
      withSpring(1, { damping: 8, stiffness: 300 })
    );
  }, [color]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: squishY.value },
      { scaleX: squishX.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Slime color={color} type={slimeType} size="large" animated hideAccessories />
    </Animated.View>
  );
};

// Transformation animation screen - shows base slime morphing to target type
const TransformationScreen = ({
  targetColor,
  targetType,
  coachName,
  onComplete,
  themeColors,
}: {
  targetColor: SlimeColor;
  targetType: SlimeType;
  coachName: string;
  onComplete: () => void;
  themeColors: ReturnType<typeof useTheme>['colors'];
}) => {
  const [showFinalSlime, setShowFinalSlime] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const wobble = useSharedValue(0);
  const glow = useSharedValue(0);
  const morphProgress = useSharedValue(1);

  useEffect(() => {
    // Phase 1: Fade in base slime
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withTiming(1, { duration: 400 });

    // Phase 2: Start excited wobble (edges shifting more actively)
    setTimeout(() => {
      wobble.value = withSequence(
        withTiming(8, { duration: 150 }),
        withTiming(-8, { duration: 150 }),
        withTiming(10, { duration: 150 }),
        withTiming(-10, { duration: 150 }),
        withTiming(6, { duration: 150 }),
        withTiming(-6, { duration: 150 }),
        withTiming(0, { duration: 150 })
      );
    }, 400);

    // Phase 3: Glow effect as transformation begins
    setTimeout(() => {
      glow.value = withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.8, { duration: 200 }),
        withTiming(1, { duration: 200 }),
        withTiming(0.3, { duration: 400 })
      );
    }, 800);

    // Phase 4: Morph squish effect
    setTimeout(() => {
      morphProgress.value = withSequence(
        withTiming(1.2, { duration: 200, easing: Easing.out(Easing.ease) }),
        withTiming(0.85, { duration: 150 }),
        withTiming(1.05, { duration: 150 }),
        withTiming(1, { duration: 200 })
      );
    }, 1200);

    // Phase 5: Show final transformed slime
    setTimeout(() => {
      setShowFinalSlime(true);
    }, 1400);

    // Complete after animation
    setTimeout(() => {
      runOnJS(onComplete)();
    }, 2800);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value * morphProgress.value },
      { rotate: `${wobble.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 1.2 + glow.value * 0.4 }],
  }));

  // Generate sparkle positions once
  const sparklePositions = useRef(
    [...Array(8)].map(() => ({
      top: 80 + Math.random() * 120,
      left: 40 + Math.random() * (SCREEN_WIDTH - 120),
      delay: Math.random() * 800,
    }))
  ).current;

  return (
    <View style={styles.transformationContainer}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.transformationGlow,
          { backgroundColor: showFinalSlime ? colors.slime[targetColor] : themeColors.primary },
          glowStyle
        ]}
      />

      {/* Slime - starts as base mint, transforms to final */}
      <Animated.View style={containerStyle}>
        <Slime
          color={showFinalSlime ? targetColor : 'mint'}
          type={showFinalSlime ? targetType : 'base'}
          size="large"
          animated={false}
          hideAccessories
        />
      </Animated.View>

      {/* Creating text */}
      <View style={styles.transformationTextContainer}>
        <Text style={[styles.transformationText, { color: themeColors.textMuted }]}>
          {showFinalSlime ? `${coachName} is ready!` : `Creating ${coachName}...`}
        </Text>
      </View>

      {/* Animated sparkles */}
      <View style={styles.sparklesContainer}>
        {sparklePositions.map((pos, i) => (
          <SparkleParticle key={i} position={pos} delay={pos.delay} themeColors={themeColors} />
        ))}
      </View>
    </View>
  );
};

// Sparkle particle component
const SparkleParticle = ({
  position,
  delay,
  themeColors,
}: {
  position: { top: number; left: number };
  delay: number;
  themeColors: ReturnType<typeof useTheme>['colors'];
}) => {
  const sparkleOpacity = useSharedValue(0);
  const sparkleScale = useSharedValue(0);
  const sparkleY = useSharedValue(0);

  useEffect(() => {
    setTimeout(() => {
      sparkleOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(400, withTiming(0, { duration: 300 }))
      );
      sparkleScale.value = withSequence(
        withSpring(1, { damping: 8 }),
        withDelay(400, withTiming(0.5, { duration: 300 }))
      );
      sparkleY.value = withTiming(-30, { duration: 800, easing: Easing.out(Easing.ease) });
    }, delay + 1000);
  }, []);

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
    transform: [
      { scale: sparkleScale.value },
      { translateY: sparkleY.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.sparkle,
        { top: position.top, left: position.left, backgroundColor: themeColors.primary },
        sparkleStyle,
      ]}
    />
  );
};

export default function CreateAgentScreen() {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const scrollViewRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ agentType?: string }>();

  // Get agent type from params, default to fitness_coach
  const agentTypeId = (params.agentType || 'fitness_coach') as AgentTypeId;
  const agentConfig = getAgentType(agentTypeId);
  const slimeType = (agentConfig?.slimeType || 'fitness_coach') as SlimeType;

  // Redirect to selection screen if no agent type specified
  useEffect(() => {
    if (!params.agentType) {
      router.replace('/(main)/create/select');
    }
  }, [params.agentType]);

  // State
  const [phase, setPhase] = useState<Phase>('interview');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [chatHistory, setChatHistory] = useState<Array<{ text: string; isUser: boolean }>>([
    { text: QUESTIONS[0].text, isUser: false },
  ]);
  const [textInput, setTextInput] = useState('');
  const [showOptions, setShowOptions] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);

  // Color picker state
  const [selectedColor, setSelectedColor] = useState<SlimeColor>('mint');

  // Name picker state
  const [coachName, setCoachName] = useState('');

  // Number input state
  const [numberInput, setNumberInput] = useState('');
  const [weightUnit, setWeightUnit] = useState('lbs');
  const [heightUnit, setHeightUnit] = useState('ft');

  const currentQ = QUESTIONS[currentQuestion];

  // Calculate progress based on phase
  const getProgress = () => {
    if (phase === 'interview') {
      return (currentQuestion + 1) / (QUESTIONS.length + 2); // +2 for color and name steps
    } else if (phase === 'colorPicker') {
      return (QUESTIONS.length + 1) / (QUESTIONS.length + 2);
    } else {
      return 1;
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const handleResponse = async (response: string) => {
    setShowOptions(false);

    const newResponses = { ...responses, [currentQ.id]: response };
    setResponses(newResponses);

    setChatHistory((prev) => [...prev, { text: response, isUser: true }]);

    // Check if this was the last interview question
    if (currentQuestion >= QUESTIONS.length - 1) {
      // Move to color picker phase
      setTimeout(() => {
        setPhase('colorPicker');
      }, 600);
      return;
    }

    // Move to next question
    setTimeout(() => {
      const nextQ = QUESTIONS[currentQuestion + 1];
      setChatHistory((prev) => [...prev, { text: nextQ.text, isUser: false }]);
      setCurrentQuestion((prev) => prev + 1);
      setShowOptions(true);
      setTextInput('');
      setNumberInput('');
      scrollToBottom();
    }, 600);
  };

  const handleTextSubmit = () => {
    const value = textInput.trim() || currentQ.placeholder || '';
    if (value) {
      handleResponse(value);
    }
  };

  const handleNumberSubmit = () => {
    const value = numberInput.trim();
    if (!value) return;

    // Include unit in response if applicable
    let responseValue = value;
    if (currentQ.id === 'weight') {
      responseValue = `${value} ${weightUnit}`;
    } else if (currentQ.id === 'height') {
      responseValue = `${value} ${heightUnit}`;
    }

    handleResponse(responseValue);
  };

  const handleColorSelect = (color: SlimeColor) => {
    setSelectedColor(color);
  };

  const handleColorConfirm = () => {
    setPhase('namePicker');
  };

  const handleNameSubmit = () => {
    const name = coachName.trim() || 'Coach';
    setCoachName(name);
    setPhase('transformation');
  };

  const handleTransformationComplete = async () => {
    await createAgentHandler();
  };

  const createAgentHandler = async () => {
    if (!user) return;

    const finalName = coachName.trim() || agentConfig?.name || 'Squish';
    const coachingStyle = responses.style?.includes('Tough')
      ? 'tough_love'
      : responses.style?.includes('Gentle')
      ? 'gentle'
      : 'balanced';

    // Parse user metrics for nutrition calculations
    const age = parseInt(responses.age) || 25;
    const gender = parseGender(responses.gender || '');

    // Parse weight (could be "150 lbs" or "68 kg")
    const weightMatch = responses.weight?.match(/(\d+\.?\d*)\s*(lbs|kg)?/i);
    let weightKg = 70; // default
    if (weightMatch) {
      const value = parseFloat(weightMatch[1]);
      const unit = weightMatch[2]?.toLowerCase() || 'lbs';
      weightKg = unit === 'kg' ? value : lbsToKg(value);
    }

    // Parse height (could be "5.10 ft" or "178 cm")
    const heightMatch = responses.height?.match(/(\d+\.?\d*)\s*(ft|cm)?/i);
    let heightCm = 170; // default
    if (heightMatch) {
      const value = heightMatch[1];
      const unit = heightMatch[2]?.toLowerCase() || 'ft';
      heightCm = parseHeightToCm(value, unit as 'ft' | 'cm');
    }

    const activityLevel = parseActivityLevel(responses.activityLevel || '');

    // Build user metrics
    const userMetrics = {
      age,
      gender,
      weightKg,
      heightCm,
      activityLevel,
    };

    // Calculate nutrition goals based on user metrics and fitness goal
    const nutritionGoals = calculateNutritionGoals(userMetrics, responses.goal || '');

    const persona = {
      name: finalName,
      style: coachingStyle,
      slime_color: selectedColor,
      userGoal: responses.goal,
      userTarget: responses.target,
      currentFrequency: responses.frequency,
      preferredLocation: responses.location,
      dietaryRestrictions: responses.diet,
      userMetrics,
      nutritionGoals,
    };

    try {
      const { data, error } = await createAgent({
        user_id: user.id,
        type: agentTypeId,
        name: finalName,
        persona_json: persona,
        settings_json: {
          notifications_enabled: true,
          morning_checkin: {
            enabled: true,
            time: { hour: 9, minute: 0 },
          },
          meal_reminders: false,
          workout_reminders: {
            enabled: false,
            days: [1, 3, 5],
            time: { hour: 18, minute: 0 },
          },
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });

      if (error) {
        const appError = parseError(error);
        showError(appError);
        router.replace('/(main)');
        return;
      }

      showSuccess(`${finalName} has been created!`);
      router.replace('/(main)');
    } catch (err) {
      const appError = parseError(err);
      showError(appError);
      router.replace('/(main)');
    }
  };

  // Render color picker phase
  if (phase === 'colorPicker') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.lg, backgroundColor: themeColors.background }]}>
          <View style={styles.headerContent}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                { backgroundColor: themeColors.surface },
                pressed && styles.backButtonPressed,
              ]}
              onPress={() => setPhase('interview')}
            >
              <Ionicons name="arrow-back" size={20} color={themeColors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: themeColors.textMuted }]}>CUSTOMIZE</Text>
            <View style={styles.headerSpacer} />
          </View>
          <ProgressBar progress={getProgress()} themeColors={themeColors} />
        </View>

        {/* Content */}
        <View style={styles.colorPickerContent}>
          <Text style={[styles.colorPickerTitle, { color: themeColors.text }]}>Choose your coach's color</Text>
          <Text style={[styles.colorPickerSubtitle, { color: themeColors.textMuted }]}>
            Pick a color that matches your vibe!
          </Text>

          {/* Animated Slime Preview */}
          <View style={styles.slimePreviewContainer}>
            <AnimatedColorSlime color={selectedColor} slimeType={slimeType} />
          </View>

          {/* Color swatches */}
          <View style={styles.colorSwatchesContainer}>
            {SLIME_COLORS.map((color) => (
              <ColorSwatch
                key={color.name}
                color={color}
                isSelected={selectedColor === color.name}
                onPress={() => handleColorSelect(color.name)}
                themeColors={themeColors}
              />
            ))}
          </View>
        </View>

        {/* Continue button */}
        <View style={[styles.inputArea, { paddingBottom: insets.bottom + spacing.lg, backgroundColor: themeColors.surface, borderTopColor: themeColors.background }]}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              { backgroundColor: themeColors.primary },
              pressed && { backgroundColor: colors.primaryDark, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleColorConfirm}
          >
            <Text style={[styles.continueButtonText, { color: themeColors.text }]}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={themeColors.text} />
          </Pressable>
        </View>
      </View>
    );
  }

  // Render name picker phase
  if (phase === 'namePicker') {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.lg, backgroundColor: themeColors.background }]}>
          <View style={styles.headerContent}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                { backgroundColor: themeColors.surface },
                pressed && styles.backButtonPressed,
              ]}
              onPress={() => setPhase('colorPicker')}
            >
              <Ionicons name="arrow-back" size={20} color={themeColors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: themeColors.textMuted }]}>NAME</Text>
            <View style={styles.headerSpacer} />
          </View>
          <ProgressBar progress={getProgress()} themeColors={themeColors} />
        </View>

        {/* Content */}
        <View style={styles.colorPickerContent}>
          <Text style={[styles.colorPickerTitle, { color: themeColors.text }]}>Name your Squish</Text>
          <Text style={[styles.colorPickerSubtitle, { color: themeColors.textMuted }]}>
            What should your {agentConfig?.name || 'Squish'} be called?
          </Text>

          {/* Slime Preview */}
          <View style={styles.slimePreviewContainer}>
            <Slime color={selectedColor} type={slimeType} size="large" animated hideAccessories />
          </View>

          {/* Name input */}
          <View style={styles.nameInputContainer}>
            <TextInput
              style={[styles.nameInput, { backgroundColor: themeColors.surface, borderColor: themeColors.primary, color: themeColors.text }]}
              value={coachName}
              onChangeText={setCoachName}
              placeholder="Coach"
              placeholderTextColor={themeColors.textMuted}
              autoFocus={false}
              returnKeyType="done"
              onSubmitEditing={handleNameSubmit}
            />
          </View>
        </View>

        {/* Continue button */}
        <View style={[styles.inputArea, { paddingBottom: insets.bottom + spacing.lg, backgroundColor: themeColors.surface, borderTopColor: themeColors.background }]}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              { backgroundColor: themeColors.primary },
              pressed && { backgroundColor: colors.primaryDark, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleNameSubmit}
          >
            <Text style={[styles.continueButtonText, { color: themeColors.text }]}>Create Squish</Text>
            <Ionicons name="sparkles" size={20} color={themeColors.text} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Render transformation phase
  if (phase === 'transformation') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background }]}>
        <TransformationScreen
          targetColor={selectedColor}
          targetType={slimeType}
          coachName={coachName || agentConfig?.name || 'Squish'}
          onComplete={handleTransformationComplete}
          themeColors={themeColors}
        />
      </View>
    );
  }

  // Render interview phase (default)
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg, backgroundColor: themeColors.background }]}>
        <View style={styles.headerContent}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: themeColors.surface },
              pressed && styles.backButtonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={themeColors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: themeColors.textMuted }]}>ONBOARDING</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ProgressBar progress={getProgress()} themeColors={themeColors} />
      </View>

      {/* Chat messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
      >
        {chatHistory.map((msg, index) => (
          <ChatBubble
            key={index}
            text={msg.text}
            isUser={msg.isUser}
            animate={index === chatHistory.length - 1}
            timestamp={!msg.isUser && index === chatHistory.length - 1 ? 'Just now' : undefined}
            isLast={index === chatHistory.length - 1}
            themeColors={themeColors}
          />
        ))}
      </ScrollView>

      {/* Input area */}
      {showOptions && (
        <View style={[styles.inputArea, { backgroundColor: themeColors.surface, borderTopColor: themeColors.background }]}>
          {currentQ.type === 'choice' && currentQ.options ? (
            <View style={styles.optionsContainer}>
              {currentQ.options.map((option, index) => (
                <OptionButton
                  key={option}
                  text={option}
                  onPress={() => handleResponse(option)}
                  delay={index * 50}
                  themeColors={themeColors}
                />
              ))}
            </View>
          ) : currentQ.type === 'number' ? (
            <View style={styles.numberInputContainer}>
              <NumberInput
                value={numberInput}
                onChangeValue={setNumberInput}
                placeholder={currentQ.placeholder}
                unit={
                  currentQ.numberConfig?.unit
                    ? {
                        options: currentQ.numberConfig.unit.options,
                        selected: currentQ.id === 'weight' ? weightUnit : heightUnit,
                        onSelect: (unit) => {
                          if (currentQ.id === 'weight') setWeightUnit(unit);
                          if (currentQ.id === 'height') setHeightUnit(unit);
                        },
                      }
                    : undefined
                }
                validation={currentQ.numberConfig?.validation}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  { backgroundColor: themeColors.primary },
                  pressed && { backgroundColor: colors.primaryDark, transform: [{ scale: 0.95 }] },
                  !numberInput.trim() && { backgroundColor: themeColors.background },
                ]}
                onPress={handleNumberSubmit}
              >
                <Ionicons name="send" size={24} color={themeColors.text} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.textInputContainer}>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: themeColors.background },
                  inputFocused && { borderColor: `${themeColors.primary}80` },
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: themeColors.text }]}
                  value={textInput}
                  onChangeText={setTextInput}
                  placeholder={currentQ.placeholder || 'Type your answer...'}
                  placeholderTextColor={themeColors.textMuted}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onSubmitEditing={handleTextSubmit}
                  returnKeyType="send"
                />
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  { backgroundColor: themeColors.primary },
                  pressed && { backgroundColor: colors.primaryDark, transform: [{ scale: 0.95 }] },
                  !textInput.trim() && { backgroundColor: themeColors.background },
                ]}
                onPress={handleTextSubmit}
              >
                <Ionicons name="send" size={24} color={themeColors.text} />
              </Pressable>
            </View>
          )}
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

  // Header
  header: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    zIndex: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...softShadow,
  },
  backButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  headerTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 3,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },

  // Progress bar
  progressBarOuter: {
    height: 12,
    backgroundColor: colors.surface,
    borderRadius: 6,
    padding: 2,
    ...shadows.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
      },
      android: {},
      default: {},
    }),
  },

  // Chat
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: spacing.lg,
  },
  bubbleRow: {
    marginBottom: spacing.lg,
  },
  bubbleRowLast: {
    marginBottom: 0,
  },
  bubbleRowBot: {
    alignItems: 'flex-start',
  },
  bubbleRowUser: {
    alignItems: 'flex-end',
  },
  bubbleContent: {
    maxWidth: '85%',
  },
  bubble: {
    padding: spacing.xl,
    borderRadius: 16,
  },
  botBubble: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 4,
    ...softShadow,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 22,
  },
  userBubbleText: {
    fontFamily: fonts.medium,
  },
  timestamp: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    marginLeft: spacing.sm,
    marginTop: spacing.xs,
  },

  // Input area
  inputArea: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: 'rgba(186, 233, 209, 0.5)',
  },
  textInput: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  sendButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...softShadow,
  },
  sendButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: colors.primaryDark,
  },
  sendButtonDisabled: {
    backgroundColor: colors.background,
  },

  // Options
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    ...softShadow,
  },
  optionButtonPressed: {
    backgroundColor: colors.primary,
    transform: [{ scale: 0.98 }],
  },
  optionButtonText: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.text,
  },

  // Color picker
  colorPickerContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['3xl'],
  },
  colorPickerTitle: {
    fontSize: typography.sizes['2xl'],
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  colorPickerSubtitle: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  slimePreviewContainer: {
    marginBottom: spacing['3xl'],
  },
  colorSwatchesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: colors.text,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 24,
    ...softShadow,
  },
  continueButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  continueButtonText: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },

  // Name picker
  nameInputContainer: {
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    fontSize: typography.sizes.lg,
    fontFamily: fonts.medium,
    color: colors.text,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },

  // Transformation
  transformationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transformationGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  transformationTextContainer: {
    marginTop: spacing['3xl'],
  },
  transformationText: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  sparklesContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  sparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
});
