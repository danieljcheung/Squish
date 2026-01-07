import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated as RNAnimated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { spacing, radius } from '@/constants/theme';
import { fonts } from '@/constants/fonts';
import { useTheme } from '@/context/ThemeContext';
import { useAgent } from '@/hooks/useAgent';
import { useChat } from '@/hooks/useChat';
import { useAgentMemory } from '@/hooks/useAgentMemory';
import { useMealLogging } from '@/hooks/useMealLogging';
import { useMealPhoto } from '@/hooks/useMealPhoto';
import { useWaterLogging } from '@/hooks/useWaterLogging';
import { useWorkoutLogging, generateWorkoutConfirmation } from '@/hooks/useWorkoutLogging';
import { useWeeklySummary, detectSummaryRequest } from '@/hooks/useWeeklySummary';
import { useToast } from '@/context/ToastContext';
import { Slime, SlimeColor, SlimeType } from '@/components/slime';
import { NoMessagesEmptyState, ChatSkeleton, ErrorState } from '@/components/ui';
import { PhotoOptionsSheet } from '@/components/ui/PhotoOptionsSheet';
import { WaterAmountSheet } from '@/components/ui/WaterAmountSheet';
import { MealAnalysisBubble } from '@/components/chat/MealAnalysisBubble';
import { DailyProgressCard } from '@/components/chat/DailyProgressCard';
import { QuickActionsBar, QuickAction } from '@/components/chat/QuickActionsBar';
import { QuickReplies, QuickReply, getContextualReplies } from '@/components/chat/QuickReplies';
import { WeeklySummaryCard } from '@/components/chat/WeeklySummaryCard';
import { Message, Agent, WorkoutType } from '@/types';
import { sendMessage as sendToClaudeAPI, generateGreeting } from '@/lib/claude';
import { parseError, ErrorType } from '@/lib/errors';

// Get slime size based on pixel size
const getSlimeSize = (pixelSize: number): 'xs' | 'small' | 'medium' | 'large' => {
  if (pixelSize <= 48) return 'xs';
  if (pixelSize <= 80) return 'small';
  if (pixelSize <= 120) return 'medium';
  return 'large';
};

// Agent slime using unified component
const AgentSlime = ({
  agent,
  size = 40,
}: {
  agent?: Agent | null;
  size?: number;
}) => {
  const slimeColor = (agent?.persona_json?.slime_color || 'mint') as SlimeColor;
  const slimeType = (agent?.type || 'base') as SlimeType;
  const slimeSize = getSlimeSize(size);

  return <Slime color={slimeColor} type={slimeType} size={slimeSize} animated={false} />;
};

// Chat message bubble with optional error state
const MessageBubble = ({
  message,
  agent,
  isError,
  onRetry,
}: {
  message: Message;
  agent?: Agent | null;
  isError?: boolean;
  onRetry?: () => void;
}) => {
  const { colors: themeColors, isDarkMode } = useTheme();
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.agentMessageContainer,
      ]}
    >
      {!isUser && (
        <View style={styles.avatarSmall}>
          <AgentSlime agent={agent} size={32} />
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser
          ? [styles.userBubble, { backgroundColor: themeColors.primary }]
          : [styles.agentBubble, { backgroundColor: themeColors.surface }],
        isError && styles.errorBubble,
      ]}>
        <Text style={[styles.bubbleText, { color: isUser ? '#101914' : themeColors.text }, isError && styles.errorText]}>
          {message.content}
        </Text>
        <View style={styles.bubbleFooter}>
          <Text style={[styles.timestamp, { color: isUser ? '#101914' : themeColors.textMuted, opacity: isUser ? 0.6 : 0.7 }, isError && styles.errorTimestamp]}>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
          {isError && onRetry && (
            <Pressable onPress={onRetry} style={[styles.retryButton, { backgroundColor: themeColors.primary }]}>
              <Text style={[styles.retryText, { color: '#101914' }]}>Retry</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

// Animated typing indicator
const TypingIndicator = ({ agent }: { agent?: Agent | null }) => {
  const { colors: themeColors } = useTheme();
  const dot1Anim = useRef(new RNAnimated.Value(0)).current;
  const dot2Anim = useRef(new RNAnimated.Value(0)).current;
  const dot3Anim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const animateDot = (anim: RNAnimated.Value, delay: number) => {
      return RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          RNAnimated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = RNAnimated.parallel([
      animateDot(dot1Anim, 0),
      animateDot(dot2Anim, 150),
      animateDot(dot3Anim, 300),
    ]);

    animation.start();

    return () => animation.stop();
  }, []);

  const getDotStyle = (anim: RNAnimated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [{
      translateY: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -4],
      }),
    }],
  });

  return (
    <View style={[styles.messageContainer, styles.agentMessageContainer]}>
      <View style={styles.avatarSmall}>
        <AgentSlime agent={agent} size={32} />
      </View>
      <View style={[styles.bubble, styles.agentBubble, styles.typingBubble, { backgroundColor: themeColors.surface }]}>
        <View style={styles.typingDots}>
          <RNAnimated.View style={[styles.dot, { backgroundColor: themeColors.textMuted }, getDotStyle(dot1Anim)]} />
          <RNAnimated.View style={[styles.dot, { backgroundColor: themeColors.textMuted }, getDotStyle(dot2Anim)]} />
          <RNAnimated.View style={[styles.dot, { backgroundColor: themeColors.textMuted }, getDotStyle(dot3Anim)]} />
        </View>
      </View>
    </View>
  );
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors, isDarkMode } = useTheme();
  const { agent, loading: agentLoading, error: agentError } = useAgent(id);
  const { memories, saveMemories, loading: memoriesLoading } = useAgentMemory(id);
  const {
    messages,
    loading: messagesLoading,
    sending,
    error: chatError,
    sendUserMessage,
    saveAssistantMessage,
    refetch,
  } = useChat(id);
  const { showError, showToast } = useToast();

  // Meal logging hooks
  const mealLogging = useMealLogging(agent);
  const mealPhoto = useMealPhoto(agent?.id);

  // Water logging hook
  const waterLogging = useWaterLogging(agent);

  // Workout logging hook
  const workoutLogging = useWorkoutLogging(agent);

  // Weekly summary hook
  const weeklySummary = useWeeklySummary(agent);

  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessageId, setErrorMessageId] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showWaterSheet, setShowWaterSheet] = useState(false);
  const [confirmedMealId, setConfirmedMealId] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);

  // Scroll position tracking
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState<number | null>(null);
  const [savedScrollPosition, setSavedScrollPosition] = useState<number | null>(null);
  const [stateLoaded, setStateLoaded] = useState(false);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);
  const scrollViewHeightRef = useRef(0);
  const hasRestoredScroll = useRef(false);
  const lastScrollY = useRef(0);

  // Header animation
  const HEADER_HEIGHT = 70 + insets.top;
  const headerVisible = useSharedValue(1);

  // Quick actions toggle animation
  const toggleRotation = useSharedValue(0);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          headerVisible.value,
          [0, 1],
          [-HEADER_HEIGHT, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
    opacity: headerVisible.value,
  }));

  const messagesTopPadding = useAnimatedStyle(() => ({
    paddingTop: interpolate(
      headerVisible.value,
      [0, 1],
      [insets.top + spacing.md, HEADER_HEIGHT],
      Extrapolation.CLAMP
    ),
  }));

  const toggleButtonStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(
          toggleRotation.value,
          [0, 1],
          [0, 45],
          Extrapolation.CLAMP
        )}deg`,
      },
    ],
  }));

  // Refresh nutrition on mount and when agent changes
  useEffect(() => {
    if (agent) {
      mealLogging.refreshTodayNutrition();
    }
  }, [agent?.id]);

  // Show toast for chat errors
  useEffect(() => {
    if (chatError && !messagesLoading) {
      showError(chatError, refetch);
    }
  }, [chatError, messagesLoading]);

  // Show toast for meal logging errors
  useEffect(() => {
    if (mealLogging.error) {
      showError(mealLogging.error);
    }
  }, [mealLogging.error]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Storage keys for this chat
  const scrollPositionKey = `chat_scroll_${id}`;
  const lastSeenKey = `chat_lastseen_${id}`;

  // Reset state when chat id changes
  useEffect(() => {
    hasRestoredScroll.current = false;
    setStateLoaded(false);
    setSavedScrollPosition(null);
    setLastSeenMessageCount(null);
    setShowNewMessages(false);
  }, [id]);

  // Load saved state from AsyncStorage
  useEffect(() => {
    const loadState = async () => {
      try {
        const [savedPosition, savedLastSeen] = await Promise.all([
          AsyncStorage.getItem(scrollPositionKey),
          AsyncStorage.getItem(lastSeenKey),
        ]);

        if (savedPosition) {
          setSavedScrollPosition(parseFloat(savedPosition));
        }
        if (savedLastSeen) {
          setLastSeenMessageCount(parseInt(savedLastSeen, 10));
        }
      } catch (e) {
        console.log('Failed to load chat state:', e);
      }
      setStateLoaded(true);
    };

    loadState();
  }, [scrollPositionKey, lastSeenKey]);

  // Restore scroll position after messages load AND saved state is loaded
  useEffect(() => {
    if (!messagesLoading && messages.length > 0 && stateLoaded && !hasRestoredScroll.current) {
      hasRestoredScroll.current = true;

      // Check for new messages since last visit
      const hasNewMessages = lastSeenMessageCount !== null && messages.length > lastSeenMessageCount;

      if (hasNewMessages && savedScrollPosition !== null) {
        // New messages exist - restore to previous position and show button
        setShowNewMessages(true);
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: savedScrollPosition,
            animated: false,
          });
        }, 150);
      } else if (savedScrollPosition !== null && lastSeenMessageCount !== null) {
        // No new messages - restore to saved position
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: savedScrollPosition,
            animated: false,
          });
        }, 150);
      } else {
        // First visit or no saved state - scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 150);
      }
    }
  }, [messagesLoading, messages.length, stateLoaded, lastSeenMessageCount, savedScrollPosition]);

  // Save state when leaving the chat
  useEffect(() => {
    return () => {
      // Save scroll position and message count on unmount
      AsyncStorage.setItem(scrollPositionKey, scrollPositionRef.current.toString());
      AsyncStorage.setItem(lastSeenKey, messages.length.toString());
    };
  }, [messages.length, scrollPositionKey, lastSeenKey]);

  // Handle scroll events
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const currentY = contentOffset.y;
    scrollPositionRef.current = currentY;
    contentHeightRef.current = contentSize.height;
    scrollViewHeightRef.current = layoutMeasurement.height;

    // Check if at bottom (within 50px threshold)
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - currentY;
    const atBottom = distanceFromBottom < 50;

    setIsAtBottom(atBottom);

    // Hide new messages button if user scrolled to bottom
    if (atBottom && showNewMessages) {
      setShowNewMessages(false);
    }

    // Header visibility based on scroll direction
    const scrollDiff = currentY - lastScrollY.current;
    const scrollThreshold = 10; // Minimum scroll to trigger hide/show

    if (currentY <= 0) {
      // At top - always show header
      headerVisible.value = withTiming(1, { duration: 200 });
    } else if (scrollDiff > scrollThreshold) {
      // Scrolling down - hide header
      headerVisible.value = withTiming(0, { duration: 200 });
    } else if (scrollDiff < -scrollThreshold) {
      // Scrolling up - show header
      headerVisible.value = withTiming(1, { duration: 200 });
    }

    lastScrollY.current = currentY;
  }, [showNewMessages, headerVisible]);

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
    setShowNewMessages(false);
  }, []);

  // Add welcome message if no messages exist
  useEffect(() => {
    if (!messagesLoading && messages.length === 0 && agent) {
      const welcomeMessage = generateGreeting(agent);
      saveAssistantMessage(welcomeMessage);
    }
  }, [messagesLoading, messages.length, agent]);

  const triggerHaptic = async (type: 'light' | 'medium' | 'success' | 'error') => {
    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch (e) {
      // Haptics not available (e.g., on web)
    }
  };

  // Toggle quick actions bar
  const toggleQuickActions = () => {
    triggerHaptic('light');
    const newState = !showQuickActions;
    setShowQuickActions(newState);
    toggleRotation.value = withTiming(newState ? 1 : 0, { duration: 200 });
  };

  // Handle camera button press (now from quick actions)
  const handleCameraPress = () => {
    triggerHaptic('light');
    setShowQuickActions(false);
    toggleRotation.value = withTiming(0, { duration: 200 });
    setShowPhotoOptions(true);
  };

  // Handle water logging - quick tap for 250ml
  const handleLogWater = async () => {
    triggerHaptic('light');
    setShowQuickActions(false);
    toggleRotation.value = withTiming(0, { duration: 200 });

    const log = await waterLogging.logWater();
    if (log) {
      await triggerHaptic('success');
      const glasses = Math.round(waterLogging.todayWaterMl / 250) + 1;
      const goalGlasses = Math.round(waterLogging.waterGoalMl / 250);
      showToast({
        type: 'success',
        message: `Water logged! ${glasses}/${goalGlasses} glasses today`,
        duration: 2000,
      });
      // Refresh nutrition data to update progress card
      mealLogging.refreshTodayNutrition();
    } else if (waterLogging.error) {
      await triggerHaptic('error');
      showError(waterLogging.error);
    }
  };

  // Handle water logging - long press for custom amount sheet
  const handleLogWaterLongPress = () => {
    triggerHaptic('medium');
    setShowQuickActions(false);
    toggleRotation.value = withTiming(0, { duration: 200 });
    setShowWaterSheet(true);
  };

  // Handle custom water amount selection
  const handleWaterAmountSelect = async (amountMl: number) => {
    const log = await waterLogging.logWater(amountMl);
    if (log) {
      await triggerHaptic('success');
      const glasses = Math.round((waterLogging.todayWaterMl + amountMl) / 250);
      const goalGlasses = Math.round(waterLogging.waterGoalMl / 250);
      showToast({
        type: 'success',
        message: `${amountMl}ml logged! ${glasses}/${goalGlasses} glasses today`,
        duration: 2000,
      });
      mealLogging.refreshTodayNutrition();
    } else if (waterLogging.error) {
      await triggerHaptic('error');
      showError(waterLogging.error);
    }
  };

  // Quick actions for the chat
  const quickActions: QuickAction[] = [
    {
      id: 'log-meal',
      label: 'Log Meal',
      icon: 'camera-outline',
      onPress: handleCameraPress,
    },
    {
      id: 'log-water',
      label: 'Log Water',
      icon: 'water-outline',
      onPress: handleLogWater,
      onLongPress: handleLogWaterLongPress,
    },
    {
      id: 'log-workout',
      label: 'Log Workout',
      icon: 'barbell-outline',
      onPress: () => {
        triggerHaptic('light');
        setShowQuickActions(false);
        toggleRotation.value = withTiming(0, { duration: 200 });
        // Send a message to trigger the workout logging flow
        handleSend("I want to log a workout");
      },
    },
    {
      id: 'check-progress',
      label: 'My Progress',
      icon: 'stats-chart-outline',
      onPress: () => {
        triggerHaptic('light');
        setShowQuickActions(false);
        toggleRotation.value = withTiming(0, { duration: 200 });
        handleSend("How am I doing with my goals?");
      },
    },
    {
      id: 'weekly-summary',
      label: 'Summary',
      icon: 'bar-chart-outline',
      onPress: async () => {
        triggerHaptic('light');
        setShowQuickActions(false);
        toggleRotation.value = withTiming(0, { duration: 200 });
        // Fetch and show weekly summary
        const summary = await weeklySummary.getCurrentWeekSummary();
        if (summary) {
          setShowWeeklySummary(true);
        } else if (weeklySummary.error) {
          showError(weeklySummary.error);
        }
      },
    },
    {
      id: 'get-tips',
      label: 'Quick Tips',
      icon: 'bulb-outline',
      onPress: () => {
        triggerHaptic('light');
        setShowQuickActions(false);
        toggleRotation.value = withTiming(0, { duration: 200 });
        handleSend("Give me a quick fitness tip!");
      },
    },
    {
      id: 'motivation',
      label: 'Motivate Me',
      icon: 'flame-outline',
      onPress: () => {
        triggerHaptic('light');
        setShowQuickActions(false);
        toggleRotation.value = withTiming(0, { duration: 200 });
        handleSend("I need some motivation today!");
      },
    },
  ];

  // Get last agent message for contextual quick replies
  const lastAgentMessage = messages
    .filter((m) => m.role === 'assistant')
    .slice(-1)[0]?.content;

  // Get contextual quick replies based on last agent message
  const quickReplies = getContextualReplies(lastAgentMessage);

  // Handle quick reply selection
  const handleQuickReply = (reply: QuickReply) => {
    triggerHaptic('light');
    handleSend(reply.text);
  };

  // Handle taking a photo with camera
  const handleTakePhoto = async () => {
    console.log('handleTakePhoto START');
    // Don't close modal yet - let picker open on top of it

    console.log('Calling mealPhoto.takePhoto...');
    const photoUrl = await mealPhoto.takePhoto();
    console.log('takePhoto result:', photoUrl);

    // Close modal after picker returns
    setShowPhotoOptions(false);

    if (photoUrl) {
      await processMealPhoto(photoUrl);
    } else if (mealPhoto.error) {
      showError(mealPhoto.error);
      mealPhoto.clearError();
    }
  };

  // Handle selecting from library
  const handlePickFromLibrary = async () => {
    console.log('handlePickFromLibrary START');
    // Don't close modal yet - let picker open on top of it

    console.log('Calling mealPhoto.pickFromLibrary...');
    const photoUrl = await mealPhoto.pickFromLibrary();
    console.log('pickFromLibrary result:', photoUrl);

    // Close modal after picker returns
    setShowPhotoOptions(false);

    if (photoUrl) {
      await processMealPhoto(photoUrl);
    } else if (mealPhoto.error) {
      showError(mealPhoto.error);
      mealPhoto.clearError();
    }
  };

  // Process the captured/selected photo (URL is already uploaded)
  const processMealPhoto = async (photoUrl: string) => {
    if (!agent) return;

    // Analyze the meal
    const pending = await mealLogging.analyzeMeal(photoUrl);
    if (pending) {
      // Add the analysis message to chat
      await saveAssistantMessage(pending.message);
      await triggerHaptic('success');
    } else {
      showError('Failed to analyze meal. Please try again.');
      await triggerHaptic('error');
    }
  };

  // Handle confirming a meal
  const handleConfirmMeal = async (context?: string) => {
    await triggerHaptic('medium');
    const success = await mealLogging.confirmMeal(context ? { notes: context } : undefined);

    if (success) {
      // Set confirmed ID for UI feedback
      setConfirmedMealId(mealLogging.pendingMeal?.photoUrl || null);

      await triggerHaptic('success');
      showToast({
        type: 'success',
        message: 'Meal logged successfully!',
        duration: 2000,
      });

      // Add confirmation message to chat
      const persona = agent?.persona_json as Record<string, any>;
      const style = persona?.style || 'balanced';
      let confirmMsg = '';

      if (style === 'tough_love') {
        confirmMsg = "Logged! Keep fueling right and stay on track! 💪";
      } else if (style === 'gentle') {
        confirmMsg = "Great job logging your meal! Every entry helps us track your progress together. 🌟";
      } else {
        confirmMsg = "Got it! Your meal has been logged. Keep up the good work! 💪";
      }

      await saveAssistantMessage(confirmMsg);

      // Clear confirmed ID after animation
      setTimeout(() => setConfirmedMealId(null), 2000);
    } else {
      await triggerHaptic('error');
    }
  };

  // Handle canceling a meal
  const handleCancelMeal = async () => {
    await triggerHaptic('light');
    mealLogging.cancelMeal();

    await saveAssistantMessage("No problem! Let me know when you're ready to log a meal. 📸");
  };

  const handleSend = async (retryMessage?: string) => {
    const messageText = retryMessage || inputText.trim();
    if (!messageText || sending || !agent) return;

    // Clear input and trigger haptic
    if (!retryMessage) {
      setInputText('');
    }
    await triggerHaptic('light');

    // Clear any previous error state
    setErrorMessageId(null);
    setLastFailedMessage(null);

    // Save user message to Supabase
    const { data: userMessage, error: sendError } = await sendUserMessage(messageText);
    if (sendError || !userMessage) {
      await triggerHaptic('error');
      if (sendError) {
        showError(sendError, () => handleSend(messageText));
      }
      return;
    }

    // Scroll to bottom to show user's message
    scrollToBottom();

    // Show typing indicator
    setIsTyping(true);

    try {
      // Call Claude API with agent context and memories
      const { response, newMemories, workout } = await sendToClaudeAPI(
        agent,
        messages,
        memories,
        messageText
      );

      // Save any new memories extracted from Claude's response
      if (newMemories.length > 0) {
        const savedCount = await saveMemories(newMemories);
        console.log(`Saved ${savedCount} new memories`);
      }

      // If Claude detected a workout to log, save it
      if (workout) {
        const workoutLog = await workoutLogging.logWorkout(
          workout.type as WorkoutType,
          workout.duration,
          messageText
        );
        if (workoutLog) {
          console.log('Workout logged from Claude response:', workoutLog);
          // Refresh nutrition data to update progress card
          mealLogging.refreshTodayNutrition();
        }
      }

      // Save assistant response to Supabase
      await saveAssistantMessage(response);

      // Scroll to show the response
      setTimeout(scrollToBottom, 100);

      // Success haptic
      await triggerHaptic('success');
    } catch (error) {
      console.error('Error getting response:', error);

      // Error haptic
      await triggerHaptic('error');

      // Parse and handle the error
      const appError = parseError(error);

      // Check for rate limit
      if (appError.type === ErrorType.RATE_LIMIT) {
        showToast({
          type: 'warning',
          message: appError.message,
          duration: 5000,
        });
      } else {
        // Save error message and track it for retry
        const errorResponse = appError.retryable
          ? "Oops! I couldn't connect. Tap retry to try again."
          : appError.message;

        const { data: errorMsg } = await saveAssistantMessage(errorResponse);
        if (errorMsg && appError.retryable) {
          setErrorMessageId(errorMsg.id);
          setLastFailedMessage(messageText);
        }
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = async () => {
    if (!lastFailedMessage || !agent) return;

    await triggerHaptic('medium');

    // Clear the error message from display (it's still in DB but we'll replace it)
    setErrorMessageId(null);

    // Retry with the last failed message
    setIsTyping(true);

    try {
      const { response, newMemories, workout } = await sendToClaudeAPI(
        agent,
        messages.filter(m => m.id !== errorMessageId), // Exclude error message
        memories,
        lastFailedMessage
      );

      if (newMemories.length > 0) {
        await saveMemories(newMemories);
      }

      // If Claude detected a workout to log, save it
      if (workout) {
        await workoutLogging.logWorkout(
          workout.type as WorkoutType,
          workout.duration,
          lastFailedMessage
        );
        mealLogging.refreshTodayNutrition();
      }

      await saveAssistantMessage(response);
      setLastFailedMessage(null);
      await triggerHaptic('success');

      // Show success toast
      showToast({
        type: 'success',
        message: 'Message sent successfully!',
        duration: 2000,
      });
    } catch (error) {
      console.error('Retry failed:', error);
      await triggerHaptic('error');

      const appError = parseError(error);
      showError(appError, handleRetry);
    } finally {
      setIsTyping(false);
    }
  };

  const loading = agentLoading || messagesLoading || memoriesLoading;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <Slime color="mint" type="base" size="small" animated />
        <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Custom Header - Animated */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + spacing.md, backgroundColor: `${themeColors.surface}F2` }, headerAnimatedStyle]}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            router.back();
          }}
          style={[styles.backButton, { backgroundColor: themeColors.background }]}
        >
          <Text style={[styles.backButtonText, { color: themeColors.text }]}>‹</Text>
        </Pressable>
        <Pressable
          style={styles.headerCenter}
          onPress={() => {
            triggerHaptic('light');
            router.push(`/settings/${id}`);
          }}
        >
          <AgentSlime agent={agent} size={40} />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: themeColors.text }]}>{agent?.name || 'Slime'}</Text>
            <Text style={[styles.headerStatus, { color: themeColors.textMuted }, isTyping && styles.headerStatusTyping]}>
              {isTyping ? 'Typing...' : 'Online'}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            router.push(`/settings/${id}`);
          }}
          style={[styles.settingsButton, { backgroundColor: themeColors.background }]}
        >
          <Text style={[styles.settingsButtonText, { color: themeColors.textMuted }]}>⚙</Text>
        </Pressable>
      </Animated.View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingTop: HEADER_HEIGHT + spacing.md },
          messages.length === 0 && !isTyping && styles.messagesContentEmpty,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
            progressViewOffset={HEADER_HEIGHT}
          />
        }
      >
        {messagesLoading ? (
          <ChatSkeleton />
        ) : messages.length === 0 && !isTyping ? (
          <NoMessagesEmptyState />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                agent={agent}
                isError={msg.id === errorMessageId}
                onRetry={msg.id === errorMessageId ? handleRetry : undefined}
              />
            ))}
            {isTyping && <TypingIndicator agent={agent} />}
          </>
        )}
      </ScrollView>

      {/* Pending Meal Analysis Modal */}
      <MealAnalysisBubble
        visible={!!mealLogging.pendingMeal}
        photoUrl={mealLogging.pendingMeal?.photoUrl || ''}
        analysis={mealLogging.pendingMeal?.analysis || {
          description: '',
          mealType: 'snack',
          calories: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
          confidence: 'medium',
          breakdown: [],
        }}
        onConfirm={handleConfirmMeal}
        onCancel={handleCancelMeal}
        isConfirming={mealLogging.saving}
        isConfirmed={confirmedMealId === mealLogging.pendingMeal?.photoUrl}
      />

      {/* Daily Progress after confirming meal, logging water, or logging workout */}
      {mealLogging.todayNutrition && (
        mealLogging.todayNutrition.meal_count > 0 ||
        (mealLogging.todayNutrition.total_water_ml || 0) > 0 ||
        (mealLogging.todayNutrition.workouts_count || 0) > 0 ||
        workoutLogging.todayWorkouts.length > 0
      ) && !mealLogging.pendingMeal && (
        <View style={[styles.dailyProgressContainer, { backgroundColor: themeColors.background }]}>
          <DailyProgressCard
            nutrition={mealLogging.todayNutrition}
            goals={(agent?.persona_json as Record<string, any>)?.nutritionGoals}
            waterGoalMl={waterLogging.waterGoalMl}
            showWaterAsGlasses={waterLogging.showAsGlasses}
            todayWorkout={workoutLogging.todayWorkouts[workoutLogging.todayWorkouts.length - 1] || null}
          />
        </View>
      )}

      {/* Weekly Summary Card */}
      {showWeeklySummary && weeklySummary.summary && (
        <WeeklySummaryCard
          summary={weeklySummary.summary}
          isCurrentWeek={weeklySummary.getWeekDates().isCurrentWeek}
          onDismiss={() => setShowWeeklySummary(false)}
        />
      )}

      {/* Floating "New messages" button */}
      {showNewMessages && (
        <Pressable
          style={({ pressed }) => [
            styles.newMessagesButton,
            { backgroundColor: themeColors.text },
            pressed && styles.newMessagesButtonPressed,
          ]}
          onPress={scrollToBottom}
        >
          <Text style={[styles.newMessagesText, { color: themeColors.background }]}>New messages</Text>
          <Ionicons name="arrow-down" size={14} color={themeColors.background} />
        </Pressable>
      )}

      {/* Quick Replies - contextual suggestions */}
      {quickReplies.length > 0 && !isTyping && !mealLogging.pendingMeal && (
        <QuickReplies replies={quickReplies} onSelect={handleQuickReply} />
      )}

      {/* Quick Actions Bar - toggleable */}
      <QuickActionsBar actions={quickActions} visible={showQuickActions} />

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: themeColors.surface }]}>
        {/* Quick actions toggle button */}
        <Pressable
          style={({ pressed }) => [
            styles.toggleButton,
            { backgroundColor: themeColors.background },
            pressed && styles.toggleButtonPressed,
            showQuickActions && { backgroundColor: themeColors.primary },
          ]}
          onPress={toggleQuickActions}
        >
          <Animated.View style={toggleButtonStyle}>
            <Ionicons
              name="add"
              size={24}
              color={showQuickActions ? '#101914' : themeColors.text}
            />
          </Animated.View>
        </Pressable>

        <TextInput
          style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={themeColors.textMuted}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
          multiline
          maxLength={1000}
          editable={!isTyping}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: themeColors.primary },
            (!inputText.trim() || sending || isTyping) && { backgroundColor: themeColors.background },
            pressed && inputText.trim() && !sending && !isTyping && styles.sendButtonPressed,
          ]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || sending || isTyping}
        >
          {sending ? (
            <ActivityIndicator size="small" color={themeColors.text} />
          ) : (
            <Text style={[styles.sendButtonText, { color: themeColors.text }]}>↑</Text>
          )}
        </Pressable>
      </View>

      {/* Photo Options Sheet */}
      <PhotoOptionsSheet
        visible={showPhotoOptions}
        onClose={() => setShowPhotoOptions(false)}
        onCamera={handleTakePhoto}
        onLibrary={handlePickFromLibrary}
      />

      {/* Water Amount Sheet */}
      <WaterAmountSheet
        visible={showWaterSheet}
        onClose={() => setShowWaterSheet(false)}
        onSelect={handleWaterAmountSelect}
        currentTotalMl={waterLogging.todayWaterMl}
        goalMl={waterLogging.waterGoalMl}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  // Header - with soft shadow and blur effect
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: `${colors.surface}F2`, // 95% opacity for blur effect
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: -2,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: spacing.md,
  },
  headerInfo: {
    marginLeft: spacing.md,
  },
  headerName: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerStatus: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginTop: 2,
  },
  headerStatusTyping: {
    color: colors.primary,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
    color: colors.textMuted,
  },
  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  messagesContentEmpty: {
    flex: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  agentMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarSmall: {
    marginRight: spacing.sm,
  },
  // Message bubbles - rounded-2xl with soft shadows
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 20,
  },
  agentBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
    marginLeft: 'auto',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  errorBubble: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFD4D4',
    borderWidth: 1,
    shadowOpacity: 0,
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 22,
  },
  errorText: {
    color: '#C0392B',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    opacity: 0.7,
  },
  errorTimestamp: {
    color: '#E74C3C',
  },
  retryButton: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  // Typing indicator
  typingBubble: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    marginHorizontal: 3,
  },
  // Input area - white card with subtle shadow
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.md,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    maxHeight: 120,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: colors.background,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.96 }],
  },
  sendButtonText: {
    fontSize: 22,
    color: colors.text,
    fontFamily: fonts.bold,
  },
  // Toggle button for quick actions
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  toggleButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  // Daily progress container
  dailyProgressContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  // New messages button - floating pill
  newMessagesButton: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  newMessagesButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  newMessagesText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.surface,
  },
});
