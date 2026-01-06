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
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { useAgent } from '@/hooks/useAgent';
import { useChat } from '@/hooks/useChat';
import { useAgentMemory } from '@/hooks/useAgentMemory';
import { useToast } from '@/context/ToastContext';
import { BaseSlime, CoachSlime } from '@/components/slime';
import { NoMessagesEmptyState, ChatSkeleton, ErrorState } from '@/components/ui';
import { Message } from '@/types';
import { sendMessage as sendToClaudeAPI, generateGreeting } from '@/lib/claude';
import { parseError, ErrorType } from '@/lib/errors';

// Get the right slime component based on agent type
const AgentSlime = ({ type, size = 40, expression = 'motivated' }: { type?: string; size?: number; expression?: string }) => {
  switch (type) {
    case 'fitness':
      return <CoachSlime size={size} expression={expression as any} />;
    case 'budget':
      return <BaseSlime size={size} color={colors.slimeBudget} expression="happy" />;
    case 'study':
      return <BaseSlime size={size} color={colors.slimeStudy} expression="neutral" />;
    default:
      return <BaseSlime size={size} expression="happy" />;
  }
};

// Chat message bubble with optional error state
const MessageBubble = ({
  message,
  agentType,
  isError,
  onRetry,
}: {
  message: Message;
  agentType?: string;
  isError?: boolean;
  onRetry?: () => void;
}) => {
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
          <AgentSlime type={agentType} size={32} expression={isError ? 'sleepy' : 'happy'} />
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.agentBubble,
        isError && styles.errorBubble,
      ]}>
        <Text style={[styles.bubbleText, isError && styles.errorText]}>
          {message.content}
        </Text>
        <View style={styles.bubbleFooter}>
          <Text style={[styles.timestamp, isError && styles.errorTimestamp]}>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
          {isError && onRetry && (
            <Pressable onPress={onRetry} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

// Animated typing indicator
const TypingIndicator = ({ agentType }: { agentType?: string }) => {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      animateDot(dot1Anim, 0),
      animateDot(dot2Anim, 150),
      animateDot(dot3Anim, 300),
    ]);

    animation.start();

    return () => animation.stop();
  }, []);

  const getDotStyle = (anim: Animated.Value) => ({
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
        <AgentSlime type={agentType} size={32} expression="thinking" />
      </View>
      <View style={[styles.bubble, styles.agentBubble, styles.typingBubble]}>
        <View style={styles.typingDots}>
          <Animated.View style={[styles.dot, getDotStyle(dot1Anim)]} />
          <Animated.View style={[styles.dot, getDotStyle(dot2Anim)]} />
          <Animated.View style={[styles.dot, getDotStyle(dot3Anim)]} />
        </View>
      </View>
    </View>
  );
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessageId, setErrorMessageId] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Show toast for chat errors
  useEffect(() => {
    if (chatError && !messagesLoading) {
      showError(chatError, refetch);
    }
  }, [chatError, messagesLoading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

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

    // Show typing indicator
    setIsTyping(true);

    try {
      // Call Claude API with agent context and memories
      const { response, newMemories } = await sendToClaudeAPI(
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

      // Save assistant response to Supabase
      await saveAssistantMessage(response);

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
      const { response, newMemories } = await sendToClaudeAPI(
        agent,
        messages.filter(m => m.id !== errorMessageId), // Exclude error message
        memories,
        lastFailedMessage
      );

      if (newMemories.length > 0) {
        await saveMemories(newMemories);
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
      <View style={styles.loadingContainer}>
        <BaseSlime size={80} expression="sleepy" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Custom Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            router.back();
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <Pressable
          style={styles.headerCenter}
          onPress={() => {
            triggerHaptic('light');
            router.push(`/settings/${id}`);
          }}
        >
          <AgentSlime type={agent?.type} size={40} expression={isTyping ? 'thinking' : 'motivated'} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{agent?.name || 'Agent'}</Text>
            <Text style={[styles.headerStatus, isTyping && styles.headerStatusTyping]}>
              {isTyping ? 'Typing...' : 'Online'}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            router.push(`/settings/${id}`);
          }}
          style={styles.settingsButton}
        >
          <Text style={styles.settingsButtonText}>⚙</Text>
        </Pressable>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={[
          styles.messagesContent,
          messages.length === 0 && !isTyping && styles.messagesContentEmpty,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.mint}
            colors={[colors.mint]}
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
                agentType={agent?.type}
                isError={msg.id === errorMessageId}
                onRetry={msg.id === errorMessageId ? handleRetry : undefined}
              />
            ))}
            {isTyping && <TypingIndicator agentType={agent?.type} />}
          </>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={colors.textLight}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
          multiline
          maxLength={1000}
          editable={!isTyping}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            (!inputText.trim() || sending || isTyping) && styles.sendButtonDisabled,
            pressed && inputText.trim() && !sending && !isTyping && styles.sendButtonPressed,
          ]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || sending || isTyping}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={styles.sendButtonText}>↑</Text>
          )}
        </Pressable>
      </View>
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
    marginTop: 16,
    fontSize: 16,
    color: colors.textLight,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.mint,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 32,
    color: colors.text,
    marginTop: -4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  headerInfo: {
    marginLeft: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerStatus: {
    fontSize: 13,
    color: colors.mint,
    marginTop: 2,
  },
  headerStatusTyping: {
    color: colors.slimeCoach,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
    color: colors.textLight,
  },
  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messagesContentEmpty: {
    flex: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  agentMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarSmall: {
    marginRight: 8,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  agentBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: colors.mint,
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  errorBubble: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FFB8B8',
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 16,
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
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textLight,
  },
  errorTimestamp: {
    color: '#E74C3C',
  },
  retryButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.slimeCoach,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  // Typing indicator
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textLight,
    marginHorizontal: 3,
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.mint,
    maxHeight: 120,
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
  sendButtonPressed: {
    backgroundColor: '#9DD8C0',
    transform: [{ scale: 0.95 }],
  },
  sendButtonText: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '600',
  },
});
