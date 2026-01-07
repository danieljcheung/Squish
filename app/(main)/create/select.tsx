import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing, shadows, typography } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { Slime, SlimeColor, SlimeType } from '@/components/slime';
import { AGENT_TYPES, AgentTypeConfig } from '@/constants/agentTypes';

// Agent type card component
const AgentTypeCard = ({
  config,
  onPress,
}: {
  config: AgentTypeConfig;
  onPress: () => void;
}) => {
  const isAvailable = config.available;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && isAvailable && styles.cardPressed,
        !isAvailable && styles.cardDisabled,
      ]}
      onPress={onPress}
      disabled={!isAvailable}
    >
      {/* Coming Soon Badge */}
      {!isAvailable && (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>
      )}

      {/* Slime Preview */}
      <View style={[styles.slimeContainer, !isAvailable && styles.slimeContainerDisabled]}>
        <Slime
          color={config.defaultColor as SlimeColor}
          type={config.slimeType as SlimeType}
          size="small"
          animated={false}
          hideAccessories
        />
      </View>

      {/* Text Content */}
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, !isAvailable && styles.cardTitleDisabled]}>
          {config.name}
        </Text>
        <Text style={[styles.cardDescription, !isAvailable && styles.cardDescriptionDisabled]}>
          {config.description}
        </Text>
      </View>

      {/* Arrow */}
      {isAvailable && (
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      )}
    </Pressable>
  );
};

// Placeholder card for future Squish types
const MoreComingCard = () => (
  <View style={styles.moreComingCard}>
    <Ionicons name="add-circle-outline" size={32} color={colors.textMuted} />
    <Text style={styles.moreComingText}>More Squish coming soon...</Text>
  </View>
);

export default function AgentSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const handleSelectAgent = (config: AgentTypeConfig) => {
    if (!config.available) {
      showToast({
        type: 'info',
        message: 'Coming soon!',
        duration: 2000,
      });
      return;
    }

    // Navigate to onboarding with the selected agent type
    router.push({
      pathname: '/(main)/create',
      params: { agentType: config.id },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerContent}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Choose Your Squish</Text>
            <Text style={styles.headerSubtitle}>What do you need help with?</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      {/* Agent Types List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {AGENT_TYPES.map((agentType) => (
          <AgentTypeCard
            key={agentType.id}
            config={agentType}
            onPress={() => handleSelectAgent(agentType)}
          />
        ))}

        <MoreComingCard />
      </ScrollView>
    </View>
  );
}

// Soft shadow for primary elements
const softShadow = Platform.select({
  ios: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  android: {
    elevation: 4,
  },
  default: {},
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  headerTitleContainer: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.sizes['2xl'],
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  headerSpacer: {
    width: 40,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    ...softShadow,
  },
  cardPressed: {
    backgroundColor: colors.primary,
    transform: [{ scale: 0.98 }],
  },
  cardDisabled: {
    opacity: 0.6,
  },

  // Coming Soon Badge
  comingSoonBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.textMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.surface,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Slime Container
  slimeContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  slimeContainerDisabled: {
    opacity: 0.5,
  },

  // Card Content
  cardContent: {
    flex: 1,
    paddingRight: spacing.md,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardTitleDisabled: {
    color: colors.textMuted,
  },
  cardDescription: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 18,
  },
  cardDescriptionDisabled: {
    color: colors.textLight,
  },

  // Arrow
  arrowContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // More Coming Card
  moreComingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.surface,
    borderStyle: 'dashed',
    padding: spacing.xl,
    gap: spacing.md,
  },
  moreComingText: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
});
