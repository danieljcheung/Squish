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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/constants/colors';
import { useAgent } from '@/hooks/useAgent';
import { BaseSlime, CoachSlime } from '@/components/slime';

// Get the right slime component based on agent type
const AgentSlime = ({ type, size = 40 }: { type?: string; size?: number }) => {
  switch (type) {
    case 'fitness':
      return <CoachSlime size={size} expression="motivated" />;
    case 'budget':
      return <BaseSlime size={size} color={colors.slimeBudget} expression="happy" />;
    case 'study':
      return <BaseSlime size={size} color={colors.slimeStudy} expression="neutral" />;
    default:
      return <BaseSlime size={size} expression="happy" />;
  }
};

// Chat message bubble
const MessageBubble = ({
  content,
  isUser,
  agentType,
}: {
  content: string;
  isUser: boolean;
  agentType?: string;
}) => (
  <View
    style={[
      styles.messageContainer,
      isUser ? styles.userMessageContainer : styles.agentMessageContainer,
    ]}
  >
    {!isUser && (
      <View style={styles.avatarSmall}>
        <AgentSlime type={agentType} size={32} />
      </View>
    )}
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.agentBubble]}>
      <Text style={styles.bubbleText}>{content}</Text>
    </View>
  </View>
);

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { agent, loading } = useAgent(id);
  const scrollViewRef = useRef<ScrollView>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ content: string; isUser: boolean }>>([]);

  // Add welcome message when agent loads
  useEffect(() => {
    if (agent && messages.length === 0) {
      const welcomeMessage = agent.type === 'fitness'
        ? `Hey! I'm ${agent.name}, your fitness coach! Ready to crush some goals today? 💪`
        : `Hi there! I'm ${agent.name}. How can I help you today?`;

      setMessages([{ content: welcomeMessage, isUser: false }]);
    }
  }, [agent]);

  const handleSend = () => {
    if (!message.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { content: message.trim(), isUser: true }]);
    setMessage('');

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate agent response (placeholder)
    setTimeout(() => {
      const responses = [
        "That's great! Let's work on that together.",
        "I'm here to help! Tell me more.",
        "Awesome! You're doing amazing! 💪",
        "Keep pushing! You've got this!",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages((prev) => [...prev, { content: randomResponse, isUser: false }]);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1000);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <BaseSlime size={80} expression="sleepy" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Custom Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <AgentSlime type={agent?.type} size={36} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{agent?.name || 'Agent'}</Text>
            <Text style={styles.headerStatus}>Online</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push(`/settings/${id}`)}
          style={styles.settingsButton}
        >
          <Text style={styles.settingsButtonText}>⚙</Text>
        </Pressable>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map((msg, index) => (
          <MessageBubble
            key={index}
            content={msg.content}
            isUser={msg.isUser}
            agentType={agent?.type}
          />
        ))}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor={colors.textLight}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim()}
        >
          <Text style={styles.sendButtonText}>↑</Text>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: colors.text,
    marginTop: -2,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  headerInfo: {
    marginLeft: 10,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  headerStatus: {
    fontSize: 12,
    color: colors.mint,
    marginTop: 1,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 18,
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
  bubbleText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 16,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.mint,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mint,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: colors.background,
  },
  sendButtonText: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '600',
  },
});
