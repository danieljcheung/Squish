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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { CommonActions, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useAgent } from '@/hooks/useAgent';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { BaseSlime, CoachSlime, Slime, ProfileSlime, SlimeColor, SlimeType } from '@/components/slime';
import { AgentSettings, PersonaJson, DEFAULT_WATER_GOAL_ML, WATER_GLASS_ML } from '@/types';

// Coaching style options (Fitness)
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

// Finance personality options
const FINANCE_STYLES = [
  {
    id: 'strict',
    label: 'Strict',
    emoji: '🎯',
    description: 'Keep me accountable, call out overspending',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    emoji: '⚖️',
    description: 'Friendly reminders, celebrate wins',
  },
  {
    id: 'relaxed',
    label: 'Relaxed',
    emoji: '😌',
    description: 'Just track, no judgment',
  },
];

// Section header component
const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
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

// Avatar with edit button
const AvatarWithEdit = ({ agent, onPress }: { agent: any; onPress?: () => void }) => {
  const slimeColor = (agent?.persona_json?.slime_color || 'mint') as SlimeColor;
  const slimeType = (agent?.type || 'base') as SlimeType;

  return (
    <View style={styles.avatarContainer}>
      <ProfileSlime color={slimeColor} type={slimeType} size={100} animated={false} />
      {onPress && (
        <Pressable style={styles.editAvatarButton} onPress={onPress}>
          <Ionicons name="pencil" size={14} color={colors.text} />
        </Pressable>
      )}
    </View>
  );
};

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
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors, isDarkMode } = useTheme();
  const navigation = useNavigation();
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
  const [waterReminders, setWaterReminders] = useState(false);
  const [waterGoalMl, setWaterGoalMl] = useState(DEFAULT_WATER_GOAL_ML);
  const [showWaterAsGlasses, setShowWaterAsGlasses] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Finance-specific settings
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(true);
  const [dailySummaryHour, setDailySummaryHour] = useState(20); // 8pm
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(true);
  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(true);
  const [billRemindersEnabled, setBillRemindersEnabled] = useState(true);

  // Check agent type
  const isFinanceAgent = agent?.type === 'finance' || agent?.type === 'budget_helper';
  const isFitnessAgent = agent?.type === 'fitness' || agent?.type === 'fitness_coach';

  // Initialize state from agent data
  useEffect(() => {
    if (agent) {
      const persona = agent.persona_json as PersonaJson;
      const settings = agent.settings_json as AgentSettings;

      setName(persona?.name || agent.name);
      setStyle(persona?.style || 'balanced');

      // Hydration settings from persona
      setWaterGoalMl(persona?.daily_water_goal_ml ?? DEFAULT_WATER_GOAL_ML);
      setShowWaterAsGlasses(persona?.show_water_as_glasses ?? true);

      if (settings) {
        setNotificationsEnabled(settings.notifications_enabled ?? true);
        setMorningCheckinEnabled(settings.morning_checkin?.enabled ?? true);
        setMorningCheckinHour(settings.morning_checkin?.time?.hour ?? 8);
        setMorningCheckinMinute(settings.morning_checkin?.time?.minute ?? 0);
        setMealReminders(settings.meal_reminders ?? false);
        setWaterReminders(settings.water_reminders ?? false);

        // Finance-specific settings
        setDailySummaryEnabled(settings.daily_summary?.enabled ?? true);
        setDailySummaryHour(settings.daily_summary?.time?.hour ?? 20);
        setWeeklySummaryEnabled(settings.weekly_summary?.enabled ?? true);
        setBudgetAlertsEnabled(settings.budget_alerts?.enabled ?? true);
        setBillRemindersEnabled(settings.bill_reminders?.enabled ?? true);
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
    const waterGoalChanged = waterGoalMl !== (persona?.daily_water_goal_ml ?? DEFAULT_WATER_GOAL_ML);
    const waterDisplayChanged = showWaterAsGlasses !== (persona?.show_water_as_glasses ?? true);
    const waterRemindersChanged = waterReminders !== (settings?.water_reminders ?? false);

    // Finance settings changes
    const dailySummaryChanged = isFinanceAgent && (
      dailySummaryEnabled !== (settings?.daily_summary?.enabled ?? true) ||
      dailySummaryHour !== (settings?.daily_summary?.time?.hour ?? 20)
    );
    const weeklySummaryChanged = isFinanceAgent && weeklySummaryEnabled !== (settings?.weekly_summary?.enabled ?? true);
    const budgetAlertsChanged = isFinanceAgent && budgetAlertsEnabled !== (settings?.budget_alerts?.enabled ?? true);
    const billRemindersChanged = isFinanceAgent && billRemindersEnabled !== (settings?.bill_reminders?.enabled ?? true);

    // Fitness-specific changes only apply to fitness agents
    const fitnessChanges = isFitnessAgent && (mealChanged || waterGoalChanged || waterDisplayChanged || waterRemindersChanged);

    // Finance-specific changes only apply to finance agents
    const financeChanges = isFinanceAgent && (dailySummaryChanged || weeklySummaryChanged || budgetAlertsChanged || billRemindersChanged);

    setHasChanges(
      nameChanged || styleChanged || notifChanged || morningChanged || fitnessChanges || financeChanges
    );
  }, [agent, name, style, notificationsEnabled, morningCheckinEnabled, morningCheckinHour, mealReminders, waterGoalMl, showWaterAsGlasses, waterReminders, dailySummaryEnabled, dailySummaryHour, weeklySummaryEnabled, budgetAlertsEnabled, billRemindersEnabled, isFinanceAgent, isFitnessAgent]);

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
        daily_water_goal_ml: waterGoalMl,
        show_water_as_glasses: showWaterAsGlasses,
      },
      settings_json: {
        notifications_enabled: notificationsEnabled,
        morning_checkin: {
          enabled: morningCheckinEnabled,
          time: { hour: morningCheckinHour, minute: morningCheckinMinute },
        },
        meal_reminders: mealReminders,
        water_reminders: waterReminders,
        workout_reminders: {
          enabled: false,
          days: [1, 3, 5],
          time: { hour: 18, minute: 0 },
        },
        // Finance-specific settings
        daily_summary: {
          enabled: dailySummaryEnabled,
          time: { hour: dailySummaryHour, minute: 0 },
        },
        weekly_summary: {
          enabled: weeklySummaryEnabled,
        },
        budget_alerts: {
          enabled: budgetAlertsEnabled,
        },
        bill_reminders: {
          enabled: billRemindersEnabled,
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
      'Delete Squish',
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
      // Reset navigation stack to home only - removes deleted agent's chat from history
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'index' }],
        })
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>Loading settings...</Text>
      </View>
    );
  }

  if (error || !agent) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themeColors.background }]}>
        <BaseSlime size={80} expression="sleepy" />
        <Text style={[styles.errorText, { color: themeColors.text }]}>Couldn't load settings</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: themeColors.primary }]} onPress={refetch}>
          <Text style={[styles.retryButtonText, { color: themeColors.text }]}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md, backgroundColor: `${themeColors.surface}F2` }]}>
        <Pressable
          onPress={() => {
            triggerHaptic();
            router.back();
          }}
          style={[styles.backButton, { backgroundColor: themeColors.background }]}
        >
          <Text style={[styles.backButtonText, { color: themeColors.text }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Settings</Text>
        <Pressable
          style={[styles.saveButton, { backgroundColor: themeColors.primary }, !hasChanges && { backgroundColor: themeColors.background }]}
          onPress={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={themeColors.text} />
          ) : (
            <Text
              style={[styles.saveButtonText, { color: themeColors.text }, !hasChanges && { color: themeColors.textMuted }]}
            >
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing['3xl'] }]}
      >
        {/* Agent Preview */}
        <View style={[styles.previewCard, { backgroundColor: themeColors.surface }]}>
          <AvatarWithEdit agent={agent} />
          <Text style={[styles.previewName, { color: themeColors.text }]}>{name}</Text>
          <Text style={[styles.previewType, { color: themeColors.textMuted }]}>
            {agent.type === 'fitness_coach' ? 'Fitness Coach' :
             agent.type.charAt(0).toUpperCase() + agent.type.slice(1).replace('_', ' ')}
          </Text>
        </View>

        {/* Name */}
        <Text style={[styles.sectionHeader, { color: themeColors.textMuted }]}>NAME</Text>
        <View style={[styles.card, { backgroundColor: themeColors.surface }]}>
          <TextInput
            style={[styles.nameInput, { color: themeColors.text }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter name"
            placeholderTextColor={themeColors.textMuted}
            maxLength={20}
          />
        </View>

        {/* Personality */}
        <Text style={[styles.sectionHeader, { color: themeColors.textMuted }]}>PERSONALITY</Text>
        <View style={[styles.card, { backgroundColor: themeColors.surface }]}>
          <View style={styles.styleSelector}>
            {(isFinanceAgent ? FINANCE_STYLES : COACHING_STYLES).map((personalityStyle) => (
              <Pressable
                key={personalityStyle.id}
                style={[
                  styles.styleOption,
                  { backgroundColor: themeColors.background },
                  style === personalityStyle.id && { borderColor: themeColors.primary, backgroundColor: `${themeColors.primary}15` },
                ]}
                onPress={() => setStyle(personalityStyle.id)}
              >
                <Text style={styles.styleEmoji}>{personalityStyle.emoji}</Text>
                <Text style={[styles.styleLabel, { color: themeColors.text }]}>{personalityStyle.label}</Text>
                <Text style={[styles.styleDescription, { color: themeColors.textMuted }]}>{personalityStyle.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionHeader, { color: themeColors.textMuted }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: themeColors.surface }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Enable Notifications</Text>
              <Text style={[styles.settingDescription, { color: themeColors.textMuted }]}>Receive check-ins and reminders</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: themeColors.background, true: themeColors.primary }}
              thumbColor="#ffffff"
              ios_backgroundColor={themeColors.background}
            />
          </View>

          {notificationsEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: themeColors.background }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: themeColors.text }]}>Morning Check-in</Text>
                  <Text style={[styles.settingDescription, { color: themeColors.textMuted }]}>Daily motivation to start your day</Text>
                </View>
                <Switch
                  value={morningCheckinEnabled}
                  onValueChange={setMorningCheckinEnabled}
                  trackColor={{ false: themeColors.background, true: themeColors.primary }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={themeColors.background}
                />
              </View>

              {morningCheckinEnabled && (
                <View style={styles.timePickerContainer}>
                  <Text style={[styles.timePickerLabel, { color: themeColors.textMuted }]}>Check-in time</Text>
                  <View style={[styles.timePicker, { backgroundColor: themeColors.background }]}>
                    <Pressable style={[styles.timeButton, { backgroundColor: themeColors.surface }]} onPress={() => setMorningCheckinHour((h) => (h - 1 + 24) % 24)}>
                      <Text style={[styles.timeButtonText, { color: themeColors.text }]}>-</Text>
                    </Pressable>
                    <Text style={[styles.timeDisplay, { color: themeColors.text }]}>
                      {(morningCheckinHour % 12 || 12)}:{morningCheckinMinute.toString().padStart(2, '0')} {morningCheckinHour >= 12 ? 'PM' : 'AM'}
                    </Text>
                    <Pressable style={[styles.timeButton, { backgroundColor: themeColors.surface }]} onPress={() => setMorningCheckinHour((h) => (h + 1) % 24)}>
                      <Text style={[styles.timeButtonText, { color: themeColors.text }]}>+</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Fitness-specific notification settings */}
              {isFitnessAgent && (
                <>
                  <View style={[styles.divider, { backgroundColor: themeColors.background }]} />

                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={[styles.settingLabel, { color: themeColors.text }]}>Meal Reminders</Text>
                      <Text style={[styles.settingDescription, { color: themeColors.textMuted }]}>Reminders for healthy eating</Text>
                    </View>
                    <Switch
                      value={mealReminders}
                      onValueChange={setMealReminders}
                      trackColor={{ false: themeColors.background, true: themeColors.primary }}
                      thumbColor="#ffffff"
                      ios_backgroundColor={themeColors.background}
                    />
                  </View>

                  <View style={[styles.divider, { backgroundColor: themeColors.background }]} />

                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={[styles.settingLabel, { color: themeColors.text }]}>Water Reminders</Text>
                      <Text style={[styles.settingDescription, { color: themeColors.textMuted }]}>Smart hydration reminders</Text>
                    </View>
                    <Switch
                      value={waterReminders}
                      onValueChange={setWaterReminders}
                      trackColor={{ false: themeColors.background, true: themeColors.primary }}
                      thumbColor="#ffffff"
                      ios_backgroundColor={themeColors.background}
                    />
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* Hydration - Only for fitness agents */}
        {isFitnessAgent && (
          <>
            <Text style={[styles.sectionHeader, { color: themeColors.textMuted }]}>HYDRATION</Text>
            <View style={[styles.card, { backgroundColor: themeColors.surface }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: themeColors.text }]}>Daily Water Goal</Text>
                  <Text style={[styles.settingDescription, { color: themeColors.textMuted }]}>{Math.round(waterGoalMl / WATER_GLASS_ML)} glasses ({waterGoalMl}ml)</Text>
                </View>
                <View style={[styles.goalAdjuster, { backgroundColor: themeColors.background }]}>
                  <Pressable
                    style={[styles.goalButton, { backgroundColor: themeColors.surface }]}
                    onPress={() => setWaterGoalMl((prev) => Math.max(500, prev - 250))}
                  >
                    <Text style={[styles.goalButtonText, { color: themeColors.text }]}>-</Text>
                  </Pressable>
                  <Text style={[styles.goalValue, { color: themeColors.text }]}>{waterGoalMl}ml</Text>
                  <Pressable
                    style={[styles.goalButton, { backgroundColor: themeColors.surface }]}
                    onPress={() => setWaterGoalMl((prev) => Math.min(5000, prev + 250))}
                  >
                    <Text style={[styles.goalButtonText, { color: themeColors.text }]}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: themeColors.background }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: themeColors.text }]}>Show as Glasses</Text>
                  <Text style={[styles.settingDescription, { color: themeColors.textMuted }]}>Display water in glasses instead of ml</Text>
                </View>
                <Switch
                  value={showWaterAsGlasses}
                  onValueChange={setShowWaterAsGlasses}
                  trackColor={{ false: themeColors.background, true: themeColors.primary }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={themeColors.background}
                />
              </View>
            </View>
          </>
        )}

        {/* Finance Settings - Only for finance agents */}
        {isFinanceAgent && (
          <>
            <Text style={[styles.sectionHeader, { color: themeColors.textMuted }]}>BUDGET & SUMMARIES</Text>
            <View style={[styles.card, { backgroundColor: themeColors.surface }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: themeColors.text }]}>Daily Summary</Text>
                  <Text style={[styles.settingDescription, { color: themeColors.textMuted }]}>Evening recap of today's spending</Text>
                </View>
                <Switch
                  value={dailySummaryEnabled}
                  onValueChange={setDailySummaryEnabled}
                  trackColor={{ false: themeColors.background, true: themeColors.primary }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={themeColors.background}
                />
              </View>

              {dailySummaryEnabled && (
                <View style={styles.timePickerContainer}>
                  <Text style={[styles.timePickerLabel, { color: themeColors.textMuted }]}>Summary time</Text>
                  <View style={[styles.timePicker, { backgroundColor: themeColors.background }]}>
                    <Pressable style={[styles.timeButton, { backgroundColor: themeColors.surface }]} onPress={() => setDailySummaryHour((h) => (h - 1 + 24) % 24)}>
                      <Text style={[styles.timeButtonText, { color: themeColors.text }]}>-</Text>
                    </Pressable>
                    <Text style={[styles.timeDisplay, { color: themeColors.text }]}>
                      {(dailySummaryHour % 12 || 12)}:00 {dailySummaryHour >= 12 ? 'PM' : 'AM'}
                    </Text>
                    <Pressable style={[styles.timeButton, { backgroundColor: themeColors.surface }]} onPress={() => setDailySummaryHour((h) => (h + 1) % 24)}>
                      <Text style={[styles.timeButtonText, { color: themeColors.text }]}>+</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={[styles.divider, { backgroundColor: themeColors.background }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: themeColors.text }]}>Weekly Summary</Text>
                  <Text style={[styles.settingDescription, { color: themeColors.textMuted }]}>Sunday evening week recap</Text>
                </View>
                <Switch
                  value={weeklySummaryEnabled}
                  onValueChange={setWeeklySummaryEnabled}
                  trackColor={{ false: themeColors.background, true: themeColors.primary }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={themeColors.background}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: themeColors.background }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: themeColors.text }]}>Budget Alerts</Text>
                  <Text style={[styles.settingDescription, { color: themeColors.textMuted }]}>Warnings at 80% and 100% of budget</Text>
                </View>
                <Switch
                  value={budgetAlertsEnabled}
                  onValueChange={setBudgetAlertsEnabled}
                  trackColor={{ false: themeColors.background, true: themeColors.primary }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={themeColors.background}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: themeColors.background }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: themeColors.text }]}>Bill Reminders</Text>
                  <Text style={[styles.settingDescription, { color: themeColors.textMuted }]}>Reminders before bills are due</Text>
                </View>
                <Switch
                  value={billRemindersEnabled}
                  onValueChange={setBillRemindersEnabled}
                  trackColor={{ false: themeColors.background, true: themeColors.primary }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={themeColors.background}
                />
              </View>
            </View>
          </>
        )}

        {/* Danger Zone */}
        <Text style={[styles.sectionHeader, { color: themeColors.textMuted }]}>DANGER ZONE</Text>
        <View style={[styles.card, styles.dangerCard, isDarkMode && { backgroundColor: '#2a1f1f', borderColor: '#4a2a2a' }]}>
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
                <Text style={[styles.deleteDescription, { color: themeColors.textMuted }]}>
                  This will permanently delete this Squish and all conversation history
                </Text>
              </>
            )}
          </Pressable>
        </View>

      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing['3xl'],
  },
  errorText: {
    marginTop: spacing.lg,
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  // Header - with backdrop blur effect
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: `${colors.surface}F2`,
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
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  saveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonDisabled: {
    backgroundColor: colors.background,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  saveButtonTextDisabled: {
    color: colors.textMuted,
  },
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  // Preview card
  previewCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 24,
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  // Avatar with edit button
  avatarContainer: {
    position: 'relative',
  },
  avatarBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.primary}25`,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: colors.background,
  },
  previewName: {
    marginTop: spacing.md,
    fontSize: 26,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  previewType: {
    marginTop: spacing.xs,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  // Section header - uppercase with tracking
  sectionHeader: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    letterSpacing: 1,
  },
  // Cards with rounded-2xl and soft shadows
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  // Name input - clean style without border
  nameInput: {
    fontSize: 18,
    fontFamily: fonts.medium,
    color: colors.text,
    padding: 0,
  },
  // Style selector
  styleSelector: {
    gap: spacing.md,
  },
  styleOption: {
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  styleOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  styleEmoji: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  styleLabel: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  styleLabelSelected: {
    color: colors.text,
  },
  styleDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.background,
    marginVertical: spacing.md,
  },
  // Time picker
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.lg,
  },
  timePickerLabel: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.xs,
  },
  timeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeButtonText: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  timeDisplay: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginHorizontal: spacing.md,
    minWidth: 90,
    textAlign: 'center',
  },
  // Goal adjuster (for water goal)
  goalAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.xs,
  },
  goalButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  goalButtonText: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  goalValue: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginHorizontal: spacing.md,
    minWidth: 60,
    textAlign: 'center',
  },
  // Danger zone
  dangerCard: {
    borderWidth: 1,
    borderColor: '#FFDCDC',
    backgroundColor: '#FFFAFA',
    shadowOpacity: 0,
  },
  deleteButton: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: '#E74C3C',
  },
  deleteDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
