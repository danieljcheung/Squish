import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { useAgent } from '@/hooks/useAgent';
import { useToast } from '@/context/ToastContext';
import { BaseSlime, CoachSlime } from '@/components/slime';
import { AgentSettings, PersonaJson } from '@/types';

// Coaching style options
const COACHING_STYLES = [
  {
    id: 'tough_love',
    label: 'Tough Love',
    emoji: '🔥',
    description: 'Direct, no-nonsense motivation',
  },
  {
    id: 'gentle',
    label: 'Gentle',
    emoji: '🌸',
    description: 'Patient and encouraging',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    emoji: '⚖️',
    description: 'Supportive but honest',
  },
];

// Section header component
const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

// Setting row component
const SettingRow = ({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <View style={styles.settingRow}>
    <View style={styles.settingInfo}>
      <Text style={styles.settingLabel}>{label}</Text>
      {description && <Text style={styles.settingDescription}>{description}</Text>}
    </View>
    {children}
  </View>
);

// Style selector component
const StyleSelector = ({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (style: string) => void;
}) => (
  <View style={styles.styleSelector}>
    {COACHING_STYLES.map((style) => (
      <Pressable
        key={style.id}
        style={[
          styles.styleOption,
          selected === style.id && styles.styleOptionSelected,
        ]}
        onPress={() => onSelect(style.id)}
      >
        <Text style={styles.styleEmoji}>{style.emoji}</Text>
        <Text
          style={[
            styles.styleLabel,
            selected === style.id && styles.styleLabelSelected,
          ]}
        >
          {style.label}
        </Text>
        <Text style={styles.styleDescription}>{style.description}</Text>
      </Pressable>
    ))}
  </View>
);

// Time picker component (simplified)
const TimePicker = ({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) => {
  const formattedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;

  const adjustHour = (delta: number) => {
    const newHour = (hour + delta + 24) % 24;
    onChange(newHour, minute);
  };

  return (
    <View style={styles.timePicker}>
      <Pressable style={styles.timeButton} onPress={() => adjustHour(-1)}>
        <Text style={styles.timeButtonText}>-</Text>
      </Pressable>
      <Text style={styles.timeDisplay}>
        {displayHour}:{minute.toString().padStart(2, '0')} {period}
      </Text>
      <Pressable style={styles.timeButton} onPress={() => adjustHour(1)}>
        <Text style={styles.timeButtonText}>+</Text>
      </Pressable>
    </View>
  );
};

export default function SettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { agent, loading, error, updateAgent, deleteAgent, refetch } = useAgent(id);
  const { showSuccess, showError, showToast } = useToast();

  // Local state for editing
  const [name, setName] = useState('');
  const [style, setStyle] = useState('balanced');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [morningCheckinEnabled, setMorningCheckinEnabled] = useState(true);
  const [morningCheckinHour, setMorningCheckinHour] = useState(8);
  const [morningCheckinMinute, setMorningCheckinMinute] = useState(0);
  const [mealReminders, setMealReminders] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize state from agent data
  useEffect(() => {
    if (agent) {
      const persona = agent.persona_json as PersonaJson;
      const settings = agent.settings_json as AgentSettings;

      setName(persona?.name || agent.name);
      setStyle(persona?.style || 'balanced');

      if (settings) {
        setNotificationsEnabled(settings.notifications_enabled ?? true);
        setMorningCheckinEnabled(settings.morning_checkin?.enabled ?? true);
        setMorningCheckinHour(settings.morning_checkin?.time?.hour ?? 8);
        setMorningCheckinMinute(settings.morning_checkin?.time?.minute ?? 0);
        setMealReminders(settings.meal_reminders ?? false);
      }
    }
  }, [agent]);

  // Track changes
  useEffect(() => {
    if (!agent) return;

    const persona = agent.persona_json as PersonaJson;
    const settings = agent.settings_json as AgentSettings;

    const nameChanged = name !== (persona?.name || agent.name);
    const styleChanged = style !== (persona?.style || 'balanced');
    const notifChanged = notificationsEnabled !== (settings?.notifications_enabled ?? true);
    const morningChanged =
      morningCheckinEnabled !== (settings?.morning_checkin?.enabled ?? true) ||
      morningCheckinHour !== (settings?.morning_checkin?.time?.hour ?? 8);
    const mealChanged = mealReminders !== (settings?.meal_reminders ?? false);

    setHasChanges(nameChanged || styleChanged || notifChanged || morningChanged || mealChanged);
  }, [agent, name, style, notificationsEnabled, morningCheckinEnabled, morningCheckinHour, mealReminders]);

  const triggerHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleSave = async () => {
    if (!agent || !hasChanges) return;

    setIsSaving(true);
    await triggerHaptic();

    const persona = agent.persona_json as PersonaJson;

    const { error: saveError } = await updateAgent({
      name,
      persona_json: {
        ...persona,
        name,
        style: style as PersonaJson['style'],
      },
      settings_json: {
        notifications_enabled: notificationsEnabled,
        morning_checkin: {
          enabled: morningCheckinEnabled,
          time: { hour: morningCheckinHour, minute: morningCheckinMinute },
        },
        meal_reminders: mealReminders,
        workout_reminders: {
          enabled: false,
          days: [1, 3, 5],
          time: { hour: 18, minute: 0 },
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    setIsSaving(false);

    if (saveError) {
      showError(saveError);
    } else {
      showSuccess('Settings saved!');
      setHasChanges(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Coach',
      `Are you sure you want to delete ${name}? This will also delete all your conversation history. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    await triggerHaptic();

    const { error: deleteError } = await deleteAgent();

    if (deleteError) {
      setIsDeleting(false);
      showError(deleteError);
    } else {
      showToast({
        type: 'success',
        message: `${name} has been deleted`,
        duration: 3000,
      });
      router.replace('/(main)');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.mint} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  if (error || !agent) {
    return (
      <View style={styles.errorContainer}>
        <BaseSlime size={80} expression="sleepy" />
        <Text style={styles.errorText}>Couldn't load settings</Text>
        <Pressable style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            triggerHaptic();
            router.back();
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <Pressable
          style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text
              style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}
            >
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Agent Preview */}
        <View style={styles.previewCard}>
          {agent.type === 'fitness' ? (
            <CoachSlime size={80} expression="happy" />
          ) : (
            <BaseSlime size={80} expression="happy" />
          )}
          <Text style={styles.previewName}>{name}</Text>
          <Text style={styles.previewType}>
            {agent.type.charAt(0).toUpperCase() + agent.type.slice(1)} Coach
          </Text>
        </View>

        {/* Name */}
        <SectionHeader title="Coach Name" />
        <View style={styles.card}>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Enter coach name"
            placeholderTextColor={colors.textLight}
            maxLength={20}
          />
        </View>

        {/* Coaching Style */}
        <SectionHeader title="Coaching Style" />
        <View style={styles.card}>
          <StyleSelector selected={style} onSelect={setStyle} />
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <SettingRow
            label="Enable Notifications"
            description="Receive check-ins and reminders"
          >
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.background, true: colors.mint }}
              thumbColor={colors.surface}
            />
          </SettingRow>

          {notificationsEnabled && (
            <>
              <View style={styles.divider} />

              <SettingRow
                label="Morning Check-in"
                description="Daily motivation to start your day"
              >
                <Switch
                  value={morningCheckinEnabled}
                  onValueChange={setMorningCheckinEnabled}
                  trackColor={{ false: colors.background, true: colors.mint }}
                  thumbColor={colors.surface}
                />
              </SettingRow>

              {morningCheckinEnabled && (
                <View style={styles.timePickerContainer}>
                  <Text style={styles.timePickerLabel}>Check-in time</Text>
                  <TimePicker
                    hour={morningCheckinHour}
                    minute={morningCheckinMinute}
                    onChange={(h, m) => {
                      setMorningCheckinHour(h);
                      setMorningCheckinMinute(m);
                    }}
                  />
                </View>
              )}

              <View style={styles.divider} />

              <SettingRow
                label="Meal Reminders"
                description="Reminders for healthy eating"
              >
                <Switch
                  value={mealReminders}
                  onValueChange={setMealReminders}
                  trackColor={{ false: colors.background, true: colors.mint }}
                  thumbColor={colors.surface}
                />
              </SettingRow>
            </>
          )}
        </View>

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" />
        <View style={[styles.card, styles.dangerCard]}>
          <Pressable
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#E74C3C" />
            ) : (
              <>
                <Text style={styles.deleteButtonText}>Delete {name}</Text>
                <Text style={styles.deleteDescription}>
                  This will permanently delete your coach and all conversation history
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Spacer for bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.text,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.mint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.mint,
  },
  saveButtonDisabled: {
    backgroundColor: colors.background,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  saveButtonTextDisabled: {
    color: colors.textLight,
  },
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  // Preview card
  previewCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: 24,
  },
  previewName: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  previewType: {
    marginTop: 4,
    fontSize: 14,
    color: colors.mint,
    fontWeight: '500',
  },
  // Section
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  // Name input
  nameInput: {
    fontSize: 18,
    color: colors.text,
    padding: 0,
  },
  // Style selector
  styleSelector: {
    gap: 12,
  },
  styleOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  styleOptionSelected: {
    borderColor: colors.mint,
    backgroundColor: `${colors.mint}20`,
  },
  styleEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  styleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  styleLabelSelected: {
    color: colors.text,
  },
  styleDescription: {
    fontSize: 13,
    color: colors.textLight,
  },
  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.background,
    marginVertical: 12,
  },
  // Time picker
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingLeft: 16,
  },
  timePickerLabel: {
    fontSize: 14,
    color: colors.textLight,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '600',
  },
  timeDisplay: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    marginHorizontal: 12,
    minWidth: 80,
    textAlign: 'center',
  },
  // Danger zone
  dangerCard: {
    borderWidth: 1,
    borderColor: '#FFB8B8',
    backgroundColor: '#FFF8F8',
  },
  deleteButton: {
    alignItems: 'center',
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E74C3C',
  },
  deleteDescription: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
});
