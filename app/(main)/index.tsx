import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Link } from 'expo-router';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useAgents } from '@/hooks/useAgent';
import { Agent } from '@/types';

// Placeholder slime graphics for different agent types
const SlimeAvatar = ({ type, size = 60 }: { type: string; size?: number }) => {
  const getSlimeColor = () => {
    switch (type) {
      case 'fitness':
        return colors.slimeCoach;
      case 'budget':
        return colors.slimeBudget;
      case 'study':
        return colors.slimeStudy;
      default:
        return colors.slimeBase;
    }
  };

  return (
    <View
      style={[
        styles.slimeAvatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getSlimeColor(),
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.5 }}>
        {type === 'fitness' ? '💪' : type === 'budget' ? '💰' : type === 'study' ? '📚' : '🫧'}
      </Text>
    </View>
  );
};

// Agent card component
const AgentCard = ({ agent }: { agent: Agent }) => {
  return (
    <Link href={`/chat/${agent.id}`} asChild>
      <Pressable style={styles.agentCard}>
        <SlimeAvatar type={agent.type} />
        <View style={styles.agentInfo}>
          <Text style={styles.agentName}>{agent.name}</Text>
          <Text style={styles.agentType}>
            {agent.type.charAt(0).toUpperCase() + agent.type.slice(1)} Coach
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            Tap to start chatting!
          </Text>
        </View>
        <View style={styles.chevron}>
          <Text style={styles.chevronText}>›</Text>
        </View>
      </Pressable>
    </Link>
  );
};

// Empty state component
const EmptyState = () => (
  <View style={styles.emptyState}>
    <Text style={styles.emptySlime}>🫧</Text>
    <Text style={styles.emptyTitle}>No agents yet!</Text>
    <Text style={styles.emptySubtitle}>
      Create your first AI coaching companion{'\n'}to get started on your goals
    </Text>
    <View style={styles.emptyHints}>
      <View style={styles.hintRow}>
        <Text style={styles.hintEmoji}>💪</Text>
        <Text style={styles.hintText}>Fitness Coach</Text>
      </View>
      <View style={styles.hintRow}>
        <Text style={styles.hintEmoji}>💰</Text>
        <Text style={styles.hintText}>Budget Buddy</Text>
      </View>
      <View style={styles.hintRow}>
        <Text style={styles.hintEmoji}>📚</Text>
        <Text style={styles.hintText}>Study Partner</Text>
      </View>
    </View>
  </View>
);

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { agents, loading, refetch } = useAgents();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>🫧 Squish</Text>
          {user && (
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          )}
        </View>
        <Pressable onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.mint}
          />
        }
      >
        {!loading && agents.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.agentsList}>
            <Text style={styles.sectionTitle}>Your Agents</Text>
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <Link href="/create" asChild>
        <Pressable style={styles.fab}>
          <Text style={styles.fabIcon}>+</Text>
          <Text style={styles.fabText}>Create Agent</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.mint,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  email: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
    maxWidth: 200,
  },
  signOutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  signOutText: {
    fontSize: 14,
    color: colors.textLight,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  emptySlime: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyHints: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  hintEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  hintText: {
    fontSize: 16,
    color: colors.text,
  },
  // Agents list styles
  agentsList: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  slimeAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentInfo: {
    flex: 1,
    marginLeft: 16,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  agentType: {
    fontSize: 13,
    color: colors.mint,
    fontWeight: '500',
    marginTop: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
  },
  chevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronText: {
    fontSize: 20,
    color: colors.textLight,
  },
  // FAB styles
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    left: 20,
    backgroundColor: colors.mint,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.mint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabIcon: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  fabText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
});
