import { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { EXPENSE_CATEGORIES } from '@/components/ui/LogExpenseSheet';
import { BillFrequency } from '@/lib/supabase';

interface AddBillSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (bill: {
    name: string;
    icon?: string;
    amount: number;
    category?: string;
    frequency: BillFrequency;
    dueDay: number;
    reminderDaysBefore?: number;
    autoLog?: boolean;
    isSubscription?: boolean;
  }) => void | Promise<void>;
  currencySymbol?: string;
}

const FREQUENCY_OPTIONS: { id: BillFrequency; label: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

const REMINDER_OPTIONS = [
  { id: 0, label: 'Day of' },
  { id: 1, label: '1 day before' },
  { id: 3, label: '3 days before' },
  { id: 7, label: '1 week before' },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTHS = [
  { id: 1, label: 'Jan', full: 'January' },
  { id: 2, label: 'Feb', full: 'February' },
  { id: 3, label: 'Mar', full: 'March' },
  { id: 4, label: 'Apr', full: 'April' },
  { id: 5, label: 'May', full: 'May' },
  { id: 6, label: 'Jun', full: 'June' },
  { id: 7, label: 'Jul', full: 'July' },
  { id: 8, label: 'Aug', full: 'August' },
  { id: 9, label: 'Sep', full: 'September' },
  { id: 10, label: 'Oct', full: 'October' },
  { id: 11, label: 'Nov', full: 'November' },
  { id: 12, label: 'Dec', full: 'December' },
];

// Common bill categories (subset of expense categories)
const BILL_CATEGORIES = EXPENSE_CATEGORIES.filter(c =>
  ['rent', 'bills', 'subscriptions', 'transport', 'health', 'entertainment', 'other'].includes(c.id)
);

export function AddBillSheet({
  visible,
  onClose,
  onAdd,
  currencySymbol = '$',
}: AddBillSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('bills');
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [dueDay, setDueDay] = useState(1);
  const [dueMonth, setDueMonth] = useState(1); // For yearly frequency
  const [reminderDays, setReminderDays] = useState(1);
  const [autoLog, setAutoLog] = useState(true);
  const [isSubscription, setIsSubscription] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const triggerHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleAdd = async () => {
    const amountNum = parseFloat(amount);
    if (!name.trim() || !amountNum || amountNum <= 0) return;

    setIsAdding(true);
    const category = BILL_CATEGORIES.find(c => c.id === selectedCategory);

    // For yearly frequency, encode month and day as MMDD (e.g., 315 = March 15)
    const encodedDueDay = frequency === 'yearly' ? dueMonth * 100 + dueDay : dueDay;

    try {
      await onAdd({
        name: name.trim(),
        icon: category?.icon,
        amount: amountNum,
        category: selectedCategory,
        frequency,
        dueDay: encodedDueDay,
        reminderDaysBefore: reminderDays,
        autoLog,
        isSubscription,
      });

      // Reset state
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error adding bill:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const resetForm = () => {
    setName('');
    setAmount('');
    setSelectedCategory('bills');
    setFrequency('monthly');
    setDueDay(1);
    setDueMonth(1);
    setReminderDays(1);
    setAutoLog(true);
    setIsSubscription(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canAdd = name.trim().length > 0 && parseFloat(amount) > 0;

  // Generate day options based on frequency
  const renderDayPicker = () => {
    if (frequency === 'weekly') {
      return (
        <View style={styles.dayPickerRow}>
          {DAYS_OF_WEEK.map((day, index) => (
            <Pressable
              key={day}
              style={[
                styles.dayButton,
                { backgroundColor: themeColors.surface },
                dueDay === index && { backgroundColor: themeColors.primary },
              ]}
              onPress={() => {
                triggerHaptic();
                setDueDay(index);
              }}
            >
              <Text style={[
                styles.dayButtonText,
                { color: themeColors.text },
                dueDay === index && { color: '#101914' },
              ]}>
                {day}
              </Text>
            </Pressable>
          ))}
        </View>
      );
    }

    if (frequency === 'monthly') {
      return (
        <View style={[styles.numberPickerContainer, { backgroundColor: themeColors.surface }]}>
          <Pressable
            style={[styles.pickerButton, { backgroundColor: themeColors.background }]}
            onPress={() => {
              triggerHaptic();
              setDueDay(prev => Math.max(1, prev - 1));
            }}
          >
            <Ionicons name="remove" size={20} color={themeColors.text} />
          </Pressable>
          <View style={styles.pickerValue}>
            <Text style={[styles.pickerValueText, { color: themeColors.text }]}>{dueDay}</Text>
            <Text style={[styles.pickerValueLabel, { color: themeColors.textMuted }]}>
              {dueDay === 1 ? 'st' : dueDay === 2 ? 'nd' : dueDay === 3 ? 'rd' : 'th'} of month
            </Text>
          </View>
          <Pressable
            style={[styles.pickerButton, { backgroundColor: themeColors.background }]}
            onPress={() => {
              triggerHaptic();
              setDueDay(prev => Math.min(31, prev + 1));
            }}
          >
            <Ionicons name="add" size={20} color={themeColors.text} />
          </Pressable>
        </View>
      );
    }

    // Yearly - show month and day pickers
    const getDaysInMonth = (month: number) => {
      const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      return daysInMonth[month - 1];
    };

    const maxDay = getDaysInMonth(dueMonth);
    if (dueDay > maxDay) {
      setDueDay(maxDay);
    }

    return (
      <View style={styles.yearlyPickerContainer}>
        {/* Month Picker */}
        <View style={styles.monthPickerSection}>
          <Text style={[styles.pickerSubLabel, { color: themeColors.textMuted }]}>Month</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthScrollContent}
          >
            {MONTHS.map((month) => (
              <Pressable
                key={month.id}
                style={[
                  styles.monthButton,
                  { backgroundColor: themeColors.surface },
                  dueMonth === month.id && { backgroundColor: themeColors.primary },
                ]}
                onPress={() => {
                  triggerHaptic();
                  setDueMonth(month.id);
                }}
              >
                <Text style={[
                  styles.monthButtonText,
                  { color: themeColors.text },
                  dueMonth === month.id && { color: '#101914' },
                ]}>
                  {month.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Day Picker */}
        <View style={styles.dayPickerSection}>
          <Text style={[styles.pickerSubLabel, { color: themeColors.textMuted }]}>Day</Text>
          <View style={[styles.numberPickerContainer, { backgroundColor: themeColors.surface }]}>
            <Pressable
              style={[styles.pickerButton, { backgroundColor: themeColors.background }]}
              onPress={() => {
                triggerHaptic();
                setDueDay(prev => Math.max(1, prev - 1));
              }}
            >
              <Ionicons name="remove" size={20} color={themeColors.text} />
            </Pressable>
            <View style={styles.pickerValue}>
              <Text style={[styles.pickerValueText, { color: themeColors.text }]}>{dueDay}</Text>
              <Text style={[styles.pickerValueLabel, { color: themeColors.textMuted }]}>
                {MONTHS.find(m => m.id === dueMonth)?.full} {dueDay}
              </Text>
            </View>
            <Pressable
              style={[styles.pickerButton, { backgroundColor: themeColors.background }]}
              onPress={() => {
                triggerHaptic();
                setDueDay(prev => Math.min(maxDay, prev + 1));
              }}
            >
              <Ionicons name="add" size={20} color={themeColors.text} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

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

            <View style={styles.header}>
              <Ionicons name="calendar" size={28} color={themeColors.primary} />
              <Text style={[styles.title, { color: themeColors.text }]}>Add Bill</Text>
            </View>

            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Name Input */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Name</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: themeColors.surface, color: themeColors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Netflix, Rent, Phone"
                  placeholderTextColor={themeColors.textMuted}
                  maxLength={50}
                />
              </View>

              {/* Amount Input */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Amount</Text>
                <View style={[styles.amountContainer, { backgroundColor: themeColors.surface }]}>
                  <Text style={[styles.currencySymbol, { color: themeColors.textMuted }]}>{currencySymbol}</Text>
                  <TextInput
                    style={[styles.amountInput, { color: themeColors.text }]}
                    value={amount}
                    onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    placeholderTextColor={themeColors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Category Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Category</Text>
                <View style={styles.categoriesGrid}>
                  {BILL_CATEGORIES.map((category) => (
                    <Pressable
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        { backgroundColor: themeColors.surface },
                        selectedCategory === category.id && { backgroundColor: themeColors.primary },
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        setSelectedCategory(category.id);
                      }}
                    >
                      <Text style={styles.categoryIcon}>{category.icon}</Text>
                      <Text
                        style={[
                          styles.categoryName,
                          { color: themeColors.text },
                          selectedCategory === category.id && { color: '#101914' }
                        ]}
                        numberOfLines={1}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Frequency Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Frequency</Text>
                <View style={styles.frequencyRow}>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.frequencyButton,
                        { backgroundColor: themeColors.surface },
                        frequency === opt.id && { backgroundColor: themeColors.primary },
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        setFrequency(opt.id);
                        // Reset due day when frequency changes
                        if (opt.id === 'weekly') setDueDay(1); // Monday
                        else setDueDay(1); // 1st of month
                      }}
                    >
                      <Text
                        style={[
                          styles.frequencyButtonText,
                          { color: themeColors.text },
                          frequency === opt.id && { color: '#101914' }
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Due Day Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Due Date</Text>
                {renderDayPicker()}
              </View>

              {/* Reminder Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Remind Me</Text>
                <View style={styles.reminderRow}>
                  {REMINDER_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.reminderButton,
                        { backgroundColor: themeColors.surface },
                        reminderDays === opt.id && { backgroundColor: themeColors.primary },
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        setReminderDays(opt.id);
                      }}
                    >
                      <Text
                        style={[
                          styles.reminderButtonText,
                          { color: themeColors.text },
                          reminderDays === opt.id && { color: '#101914' }
                        ]}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Toggles */}
              <View style={styles.section}>
                <Pressable
                  style={styles.toggleRow}
                  onPress={() => {
                    triggerHaptic();
                    setAutoLog(!autoLog);
                  }}
                >
                  <View style={styles.toggleInfo}>
                    <Text style={[styles.toggleLabel, { color: themeColors.text }]}>Auto-log expense</Text>
                    <Text style={[styles.toggleDescription, { color: themeColors.textMuted }]}>
                      Automatically record on due date
                    </Text>
                  </View>
                  <View style={[
                    styles.toggle,
                    { backgroundColor: autoLog ? themeColors.primary : themeColors.surface }
                  ]}>
                    <View style={[
                      styles.toggleThumb,
                      { backgroundColor: '#fff', transform: [{ translateX: autoLog ? 16 : 0 }] }
                    ]} />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.toggleRow}
                  onPress={() => {
                    triggerHaptic();
                    setIsSubscription(!isSubscription);
                  }}
                >
                  <View style={styles.toggleInfo}>
                    <Text style={[styles.toggleLabel, { color: themeColors.text }]}>Is subscription</Text>
                    <Text style={[styles.toggleDescription, { color: themeColors.textMuted }]}>
                      Group with other subscriptions
                    </Text>
                  </View>
                  <View style={[
                    styles.toggle,
                    { backgroundColor: isSubscription ? themeColors.primary : themeColors.surface }
                  ]}>
                    <View style={[
                      styles.toggleThumb,
                      { backgroundColor: '#fff', transform: [{ translateX: isSubscription ? 16 : 0 }] }
                    ]} />
                  </View>
                </Pressable>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  { backgroundColor: themeColors.surface },
                  pressed && styles.cancelButtonPressed,
                ]}
                onPress={handleClose}
              >
                <Text style={[styles.cancelText, { color: themeColors.textMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.addButton,
                  { backgroundColor: themeColors.primary },
                  !canAdd && styles.addButtonDisabled,
                  pressed && canAdd && styles.addButtonPressed,
                ]}
                onPress={handleAdd}
                disabled={!canAdd || isAdding}
              >
                <Text style={[styles.addButtonText, !canAdd && { opacity: 0.5 }]}>
                  {isAdding ? 'Adding...' : 'Add Bill'}
                </Text>
              </Pressable>
            </View>
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
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.xl,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: 450,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  currencySymbol: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryName: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  frequencyButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  dayPickerRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  dayButtonText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  numberPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  pickerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  pickerValue: {
    alignItems: 'center',
  },
  pickerValueText: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  pickerValueLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  pickerHint: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  yearlyPickerContainer: {
    gap: spacing.md,
  },
  monthPickerSection: {
    gap: spacing.xs,
  },
  dayPickerSection: {
    gap: spacing.xs,
  },
  pickerSubLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  monthScrollContent: {
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  monthButton: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  monthButtonText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  reminderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reminderButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reminderButtonText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  toggleDescription: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButtonPressed: {
    backgroundColor: `${colors.textMuted}20`,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
  addButton: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonPressed: {
    opacity: 0.9,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#101914',
  },
});
