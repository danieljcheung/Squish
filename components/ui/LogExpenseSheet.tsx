import { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  keywords?: string[];
}

// Default expense categories
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'food', name: 'Food & Dining', icon: '🍔', keywords: ['lunch', 'dinner', 'breakfast', 'restaurant', 'coffee', 'cafe', 'eat'] },
  { id: 'transport', name: 'Transport', icon: '🚗', keywords: ['gas', 'uber', 'lyft', 'taxi', 'bus', 'parking', 'transit', 'subway'] },
  { id: 'groceries', name: 'Groceries', icon: '🛒', keywords: ['groceries', 'costco', 'walmart', 'supermarket', 'food store'] },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', keywords: ['movie', 'concert', 'game', 'fun', 'theater'] },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', keywords: ['clothes', 'amazon', 'online', 'bought', 'purchased'] },
  { id: 'subscriptions', name: 'Subscriptions', icon: '📱', keywords: ['netflix', 'spotify', 'subscription', 'monthly'] },
  { id: 'rent', name: 'Rent & Housing', icon: '🏠', keywords: ['rent', 'mortgage', 'housing'] },
  { id: 'bills', name: 'Bills & Utilities', icon: '💡', keywords: ['hydro', 'electricity', 'internet', 'phone', 'water', 'utility'] },
  { id: 'health', name: 'Health', icon: '💊', keywords: ['doctor', 'medicine', 'pharmacy', 'hospital', 'medical'] },
  { id: 'travel', name: 'Travel', icon: '✈️', keywords: ['flight', 'hotel', 'vacation', 'trip'] },
  { id: 'other', name: 'Other', icon: '📦', keywords: [] },
];

// Common categories to show by default (subset of all)
const COMMON_CATEGORIES = ['food', 'transport', 'groceries', 'entertainment', 'shopping', 'other'];

interface LogExpenseSheetProps {
  visible: boolean;
  onClose: () => void;
  onLog: (expense: { amount: number; category: string; categoryName: string; description?: string }) => void | Promise<void>;
  currencySymbol?: string;
}

export function LogExpenseSheet({
  visible,
  onClose,
  onLog,
  currencySymbol = '$',
}: LogExpenseSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  const triggerHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleCategorySelect = (categoryId: string) => {
    triggerHaptic();
    setSelectedCategory(categoryId);
  };

  const handleLog = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0 || !selectedCategory) return;

    setIsLogging(true);
    const category = EXPENSE_CATEGORIES.find(c => c.id === selectedCategory);

    try {
      await onLog({
        amount: amountNum,
        category: selectedCategory,
        categoryName: category?.name || 'Other',
        description: description.trim() || undefined,
      });

      // Reset state
      setAmount('');
      setSelectedCategory(null);
      setDescription('');
      setShowAllCategories(false);
      onClose();
    } catch (error) {
      console.error('Error logging expense:', error);
    } finally {
      setIsLogging(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setSelectedCategory(null);
    setDescription('');
    setShowAllCategories(false);
    onClose();
  };

  const displayCategories = showAllCategories
    ? EXPENSE_CATEGORIES
    : EXPENSE_CATEGORIES.filter(c => COMMON_CATEGORIES.includes(c.id));

  const canLog = parseFloat(amount) > 0 && selectedCategory;

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
              <Ionicons name="cart" size={28} color={themeColors.primary} />
              <Text style={[styles.title, { color: themeColors.text }]}>Log Expense</Text>
            </View>

            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
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
                  {displayCategories.map((category) => (
                    <Pressable
                      key={category.id}
                      style={({ pressed }) => [
                        styles.categoryButton,
                        { backgroundColor: themeColors.surface },
                        selectedCategory === category.id && { backgroundColor: themeColors.primary },
                        pressed && styles.categoryButtonPressed,
                      ]}
                      onPress={() => handleCategorySelect(category.id)}
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

                {!showAllCategories && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.showMoreButton,
                      pressed && styles.showMoreButtonPressed,
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      setShowAllCategories(true);
                    }}
                  >
                    <Ionicons name="chevron-down" size={18} color={themeColors.textMuted} />
                    <Text style={[styles.showMoreText, { color: themeColors.textMuted }]}>Show all categories</Text>
                  </Pressable>
                )}
              </View>

              {/* Description (Optional) */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Note (optional)</Text>
                <TextInput
                  style={[styles.descriptionInput, { backgroundColor: themeColors.surface, color: themeColors.text }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What was it for?"
                  placeholderTextColor={themeColors.textMuted}
                  maxLength={100}
                  onFocus={() => {
                    // Scroll to bottom when focusing the note input
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                />
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
                  styles.logButton,
                  { backgroundColor: themeColors.primary },
                  !canLog && styles.logButtonDisabled,
                  pressed && canLog && styles.logButtonPressed,
                ]}
                onPress={handleLog}
                disabled={!canLog || isLogging}
              >
                <Text style={[styles.logButtonText, !canLog && { opacity: 0.5 }]}>
                  {isLogging ? 'Logging...' : 'Log Expense'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Helper function to detect category from text
export function detectCategoryFromText(text: string): string | null {
  const lowerText = text.toLowerCase();

  for (const category of EXPENSE_CATEGORIES) {
    if (category.keywords) {
      for (const keyword of category.keywords) {
        if (lowerText.includes(keyword)) {
          return category.id;
        }
      }
    }
  }

  return null;
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
    maxHeight: '85%',
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
    maxHeight: 400,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text,
    paddingVertical: spacing.sm,
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
  categoryButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryName: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  showMoreButtonPressed: {
    opacity: 0.7,
  },
  showMoreText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  descriptionInput: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
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
  logButton: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  logButtonDisabled: {
    opacity: 0.6,
  },
  logButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  logButtonText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#101914',
  },
});
