import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Agent } from '@/types';
import { LoungeMessage } from '@/lib/loungeConversation';
import { AgentChatBubble } from './AgentChatBubble';
import { spacing } from '@/constants/theme';
import { fonts } from '@/constants/fonts';

interface AgentConversationProps {
  messages: LoungeMessage[];
  fitnessAgent: Agent;
  financeAgent: Agent;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export function AgentConversation({
  messages,
  fitnessAgent,
  financeAgent,
  loading,
  onRefresh,
}: AgentConversationProps) {
  const { colors: themeColors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const getAgentForMessage = (message: LoungeMessage): Agent => {
    return message.speaker === 'fitness' ? fitnessAgent : financeAgent;
  };

  if (loading && messages.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>
          Squishes are catching up...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={themeColors.primary}
          colors={[themeColors.primary]}
        />
      }
    >
      {messages.map((message, index) => (
        <AgentChatBubble
          key={`${message.speaker}-${index}`}
          message={message}
          agent={getAgentForMessage(message)}
        />
      ))}

      {messages.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
            Your Squishes haven't chatted yet. Pull to refresh!
          </Text>
        </View>
      )}

      {messages.length > 0 && (
        <View style={styles.footerContainer}>
          <Text style={[styles.footerText, { color: themeColors.textMuted }]}>
            This is what your Squishes chat about behind the scenes!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
  footerContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
