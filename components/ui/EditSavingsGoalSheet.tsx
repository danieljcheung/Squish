import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

// Goal icon options
const GOAL_ICONS = [
  { id: 'vacation', icon: '🏖️', label: 'Vacation' },
  { id: 'car', icon: '🚗', label: 'Car' },
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'emergency', icon: '🚨', label: 'Emergency' },
  { id: 'education', icon: '🎓', label: 'Education' },
  { id: 'wedding', icon: '💒', label: 'Wedding' },
  { id: 'tech', icon: '💻', label: 'Tech' },
  { id: 'health', icon: '🏥', label: 'Health' },
  { id: 'investment', icon: '📈', label: 'Investment' },
  { id: 'gift', icon: '🎁', label: 'Gift' },
  { id: 'travel', icon: '✈️', label: 'Travel' },
  { id: 'other', icon: '💰', label: 'Other' },
];

interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  monthly_contribution?: number;
}

type SheetMode = 'view' | 'edit' | 'add_funds';

interface EditSavingsGoalSheetProps {
  visible: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  onAddFunds: (goalId: string, amount: number) => void | Promise<void>;
  onEdit: (goalId: string, updates: { name?: string; icon?: string; target_amount?: number; target_date?: string | null }) => void | Promise<void>;
  onDelete: (goalId: string) => void | Promise<void>;
  currencySymbol?: string;
}

export function EditSavingsGoalSheet({
  visible,
  onClose,
  goal,
  onAddFunds,
  onEdit,
  onDelete,
  currencySymbol = '$',
}: EditSavingsGoalSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const [mode, setMode] = useState<SheetMode>('view');

  // Add funds state
  const [addAmount, setAddAmount] = useState('');
  const [isAddingFunds, setIsAddingFunds] = useState(false);

  // Edit state
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editTargetAmount, setEditTargetAmount] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when goal changes or sheet opens
  useEffect(() => {
    if (goal && visible) {
      setMode('view');
      setAddAmount('');
      setEditName(goal.name);
      setEditIcon(goal.icon || '💰');
      setEditTargetAmount(goal.target_amount.toString());
      setEditTargetDate(goal.target_date || '');
    }
  }, [goal, visible]);

  const triggerHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const formatAmount = (amount: number) => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  const getProgressPercent = () => {
    if (!goal) return 0;
    return (goal.current_amount / goal.target_amount) * 100;
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return '#22c55e';
    if (percent >= 75) return '#4ade80';
    if (percent >= 50) return themeColors.primary;
    if (percent >= 25) return '#fbbf24';
    return '#f97316';
  };

  const handleClose = () => {
    setMode('view');
    setAddAmount('');
    onClose();
  };

  const handleAddFunds = async () => {
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0 || !goal) return;

    setIsAddingFunds(true);
    try {
      await onAddFunds(goal.id, amount);
      setAddAmount('');
      setMode('view');
    } catch (error) {
      console.error('Error adding funds:', error);
    } finally {
      setIsAddingFunds(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!goal || !editName.trim() || !editTargetAmount) return;

    const newTargetAmount = parseFloat(editTargetAmount);
    if (!newTargetAmount || newTargetAmount <= 0) return;

    setIsSaving(true);
    try {
      await onEdit(goal.id, {
        name: editName.trim(),
        icon: editIcon,
        target_amount: newTargetAmount,
        target_date: editTargetDate || null,
      });
      setMode('view');
    } catch (error) {
      console.error('Error saving edits:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!goal) return;

    Alert.alert(
      'Delete Goal?',
      `Are you sure you want to delete "${goal.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete(goal.id);
              handleClose();
            } catch (error) {
              console.error('Error deleting goal:', error);
            }
          },
        },
      ]
    );
  };

  const handleDateChange = (text: string) => {
    const cleaned = text.replace(/[^0-9-]/g, '');
    if (cleaned.length <= 4) {
      setEditTargetDate(cleaned);
    } else if (cleaned.length <= 7) {
      setEditTargetDate(`${cleaned.slice(0, 4)}-${cleaned.slice(4)}`);
    } else {
      setEditTargetDate(`${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`);
    }
  };

  if (!goal) return null;

  const percent = getProgressPercent();
  const progressColor = getProgressColor(percent);
  const remaining = goal.target_amount - goal.current_amount;
  const isComplete = percent >= 100;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg, backgroundColor: themeColors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              {mode !== 'view' && (
                <Pressable onPress={() => setMode('view')} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color={themeColors.text} />
                </Pressable>
              )}
              <Text style={styles.headerIcon}>{goal.icon || '💰'}</Text>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
                  {mode === 'edit' ? 'Edit Goal' : mode === 'add_funds' ? 'Add Funds' : goal.name}
                </Text>
                {mode === 'view' && (
                  <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
                    {isComplete ? 'Goal Complete!' : `${formatAmount(remaining)} remaining`}
                  </Text>
                )}
              </View>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close-circle" size={28} color={themeColors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {mode === 'view' && (
                <>
                  {/* Progress Section */}
                  <View style={[styles.progressSection, { backgroundColor: themeColors.surface }]}>
                    <View style={styles.progressHeader}>
                      <Text style={[styles.progressLabel, { color: themeColors.textMuted }]}>Progress</Text>
                      <Text style={[styles.progressPercent, { color: progressColor }]}>
                        {percent.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.amountsRow}>
                      <Text style={[styles.currentAmount, { color: themeColors.text }]}>
                        {formatAmount(goal.current_amount)}
                      </Text>
                      <Text style={[styles.amountDivider, { color: themeColors.textMuted }]}> of </Text>
                      <Text style={[styles.targetAmount, { color: themeColors.textMuted }]}>
                        {formatAmount(goal.target_amount)}
                      </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: `${themeColors.textMuted}20` }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.min(percent, 100)}%`, backgroundColor: progressColor },
                        ]}
                      />
                    </View>
                    {goal.target_date && (
                      <Text style={[styles.targetDate, { color: themeColors.textMuted }]}>
                        Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </Text>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
                      onPress={() => {
                        triggerHaptic();
                        setMode('add_funds');
                      }}
                    >
                      <Ionicons name="add-circle" size={22} color="#101914" />
                      <Text style={styles.actionButtonText}>Add Funds</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, { backgroundColor: themeColors.surface }]}
                      onPress={() => {
                        triggerHaptic();
                        setMode('edit');
                      }}
                    >
                      <Ionicons name="pencil" size={20} color={themeColors.text} />
                      <Text style={[styles.actionButtonTextSecondary, { color: themeColors.text }]}>Edit</Text>
                    </Pressable>
                  </View>

                  {/* Delete Button */}
                  <Pressable
                    style={[styles.deleteButton, { backgroundColor: '#fef2f2' }]}
                    onPress={handleDelete}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={styles.deleteButtonText}>Delete Goal</Text>
                  </Pressable>
                </>
              )}

              {mode === 'add_funds' && (
                <>
                  {/* Current Progress */}
                  <View style={[styles.summaryCard, { backgroundColor: themeColors.surface }]}>
                    <Text style={[styles.summaryLabel, { color: themeColors.textMuted }]}>Current Balance</Text>
                    <Text style={[styles.summaryValue, { color: themeColors.text }]}>
                      {formatAmount(goal.current_amount)}
                    </Text>
                  </View>

                  {/* Amount Input */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Amount to Add</Text>
                    <View style={[styles.amountContainer, { backgroundColor: themeColors.surface }]}>
                      <Text style={[styles.currencySymbol, { color: themeColors.textMuted }]}>{currencySymbol}</Text>
                      <TextInput
                        style={[styles.amountInput, { color: themeColors.text }]}
                        value={addAmount}
                        onChangeText={(text) => setAddAmount(text.replace(/[^0-9.]/g, ''))}
                        placeholder="0.00"
                        placeholderTextColor={themeColors.textMuted}
                        keyboardType="decimal-pad"
                        autoFocus
                      />
                    </View>
                    {addAmount && parseFloat(addAmount) > 0 && (
                      <Text style={[styles.newBalancePreview, { color: themeColors.textMuted }]}>
                        New balance: {formatAmount(goal.current_amount + parseFloat(addAmount))}
                      </Text>
                    )}
                  </View>

                  {/* Quick amounts */}
                  <View style={styles.quickAmounts}>
                    {[10, 25, 50, 100].map((amount) => (
                      <Pressable
                        key={amount}
                        style={[styles.quickAmountButton, { backgroundColor: themeColors.surface }]}
                        onPress={() => {
                          triggerHaptic();
                          setAddAmount(amount.toString());
                        }}
                      >
                        <Text style={[styles.quickAmountText, { color: themeColors.text }]}>
                          +{currencySymbol}{amount}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Add Button */}
                  <Pressable
                    style={[
                      styles.submitButton,
                      { backgroundColor: themeColors.primary },
                      (!addAmount || parseFloat(addAmount) <= 0) && styles.submitButtonDisabled,
                    ]}
                    onPress={handleAddFunds}
                    disabled={!addAmount || parseFloat(addAmount) <= 0 || isAddingFunds}
                  >
                    {isAddingFunds ? (
                      <Text style={styles.submitButtonText}>Adding...</Text>
                    ) : (
                      <>
                        <Ionicons name="add" size={20} color="#101914" />
                        <Text style={styles.submitButtonText}>Add to Savings</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}

              {mode === 'edit' && (
                <>
                  {/* Goal Name */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Goal Name</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: themeColors.surface, color: themeColors.text }]}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="e.g., Emergency Fund, Vacation"
                      placeholderTextColor={themeColors.textMuted}
                      maxLength={50}
                    />
                  </View>

                  {/* Goal Icon */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Icon</Text>
                    <View style={styles.iconGrid}>
                      {GOAL_ICONS.map((item) => (
                        <Pressable
                          key={item.id}
                          style={[
                            styles.iconOption,
                            { backgroundColor: themeColors.surface },
                            editIcon === item.icon && { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
                          ]}
                          onPress={() => {
                            triggerHaptic();
                            setEditIcon(item.icon);
                          }}
                        >
                          <Text style={styles.iconEmoji}>{item.icon}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Target Amount */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Target Amount</Text>
                    <View style={[styles.amountContainer, { backgroundColor: themeColors.surface }]}>
                      <Text style={[styles.currencySymbol, { color: themeColors.textMuted }]}>{currencySymbol}</Text>
                      <TextInput
                        style={[styles.amountInput, { color: themeColors.text }]}
                        value={editTargetAmount}
                        onChangeText={(text) => setEditTargetAmount(text.replace(/[^0-9.]/g, ''))}
                        placeholder="0.00"
                        placeholderTextColor={themeColors.textMuted}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  {/* Target Date */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Target Date (Optional)</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: themeColors.surface, color: themeColors.text }]}
                      value={editTargetDate}
                      onChangeText={handleDateChange}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={themeColors.textMuted}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </View>

                  {/* Save Button */}
                  <Pressable
                    style={[
                      styles.submitButton,
                      { backgroundColor: themeColors.primary },
                      (!editName.trim() || !editTargetAmount || parseFloat(editTargetAmount) <= 0) && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSaveEdit}
                    disabled={!editName.trim() || !editTargetAmount || parseFloat(editTargetAmount) <= 0 || isSaving}
                  >
                    {isSaving ? (
                      <Text style={styles.submitButtonText}>Saving...</Text>
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color="#101914" />
                        <Text style={styles.submitButtonText}>Save Changes</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  headerIcon: {
    fontSize: 32,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollView: {
    maxHeight: 500,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  // Progress Section
  progressSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressPercent: {
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  amountsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  currentAmount: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  amountDivider: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  targetAmount: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  targetDate: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: 14,
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: '#101914',
  },
  actionButtonTextSecondary: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: 14,
    marginTop: spacing.sm,
  },
  deleteButtonText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: '#ef4444',
  },
  // Summary Card
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  newBalancePreview: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  // Quick amounts
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  // Icon grid
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconOption: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconEmoji: {
    fontSize: 26,
  },
  // Submit button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#101914',
  },
});
