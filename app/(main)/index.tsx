import { useState, useEffect } from 'react';
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
import { useToast } from '@/context/ToastContext';
import { Agent } from '@/types';
import { BaseSlime, CoachSlime } from '@/components/slime';
import { AgentListSkeleton, ErrorState } from '@/components/ui';

// Slime avatar component that picks the right slime type
const SlimeAvatar = ({ type, size = 60 }: { type: string; size?: number }) => {
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
    <BaseSlime size={120} expression="excited" />
    <Text style={styles.emptyTitle}>No agents yet!</Text>
    <Text style={styles.emptySubtitle}>
      Create your first AI coaching companion{'\n'}to get started on your goals
    </Text>
    <View style={styles.emptyHints}>
      <View style={styles.hintRow}>
        <CoachSlime size={40} expression="happy" />
        <Text style={styles.hintText}>Fitness Coach</Text>
      </View>
      <View style={styles.hintRow}>
        <BaseSlime size={40} color={colors.slimeBudget} expression="happy" />
        <Text style={styles.hintText}>Budget Buddy</Text>
      </View>
      <View style={styles.hintRow}>
        <BaseSlime size={40} color={colors.slimeStudy} expression="neutral" />
        <Text style={styles.hintText}>Study Partner</Text>
      </View>
    </View>
  </View>
);

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { agents, loading, error, refetch } = useAgents();
  const { showError } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  // Show toast when there's an error
  useEffect(() => {
    if (error && !loading) {
      showError(error, refetch);
    }
  }, [error, loading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BaseSlime size={44} expression="happy" />
          <View style={styles.headerText}>
            <Text style={styles.logo}>Squish</Text>
            {user && (
              <Text style={styles.email} numberOfLines={1}>
                {user.email}
              </Text>
            )}
          </View>
        </View>
        <Pressable onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          (error && !loading) && styles.contentContainerCentered,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.mint}
            colors={[colors.mint]}
          />
        }
      >
        {loading ? (
          <AgentListSkeleton count={2} />
        ) : error ? (
          <ErrorState
            message={error.message}
            onRetry={refetch}
          />
        ) : agents.length === 0 ? (
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  email: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
    maxWidth: 180,
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
  contentContainerCentered: {
    justifyContent: 'center',
  },
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  emptyTitle: {
    marginTop: 16,
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  hintText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
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
