import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated as RNAnimated,
  ScrollView,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { spacing, radius } from '@/constants/theme';
import { fonts } from '@/constants/fonts';
import { useTheme } from '@/context/ThemeContext';
import { useAgent } from '@/hooks/useAgent';
import { useChat } from '@/hooks/useChat';
import { useAgentMemory } from '@/hooks/useAgentMemory';
import { useMealLogging } from '@/hooks/useMealLogging';
import { useMealPhoto } from '@/hooks/useMealPhoto';
import { useWaterLogging } from '@/hooks/useWaterLogging';
import { useWorkoutLogging, generateWorkoutConfirmation } from '@/hooks/useWorkoutLogging';
import { useWeeklySummary, detectSummaryRequest } from '@/hooks/useWeeklySummary';
import { useFinance } from '@/hooks/useFinance';
import { useToast } from '@/context/ToastContext';
import { Slime, ProfileSlime, SlimeColor, SlimeType } from '@/components/slime';
import { NoMessagesEmptyState, ChatSkeleton, ErrorState } from '@/components/ui';
import { PhotoOptionsSheet } from '@/components/ui/PhotoOptionsSheet';
import { WaterAmountSheet } from '@/components/ui/WaterAmountSheet';
import { LogExpenseSheet, EXPENSE_CATEGORIES } from '@/components/ui/LogExpenseSheet';
import { AddIncomeSheet, INCOME_CATEGORIES } from '@/components/ui/AddIncomeSheet';
import { LogActionSheet } from '@/components/ui/LogActionSheet';
import { AddBillSheet } from '@/components/ui/AddBillSheet';
import { EditBillSheet } from '@/components/ui/EditBillSheet';
import { BillsCard } from '@/components/chat/BillsCard';
import { FinanceSummaryCard } from '@/components/chat/FinanceSummaryCard';
import { SavingsGoalsCard } from '@/components/chat/SavingsGoalsCard';
import { LogConfirmationCard } from '@/components/chat/LogConfirmationCard';
import { BillConfirmationCard } from '@/components/chat/BillConfirmationCard';
import { BudgetBreakdownCard } from '@/components/chat/BudgetBreakdownCard';
import { CategoryExpensesSheet } from '@/components/ui/CategoryExpensesSheet';
import { AddSavingsGoalSheet } from '@/components/ui/AddSavingsGoalSheet';
import { EditSavingsGoalSheet } from '@/components/ui/EditSavingsGoalSheet';
import { useBills, RecurringBill } from '@/hooks/useBills';
import { getCategoryExpenses, createSavingsGoal, addSavingsContribution, updateSavingsGoalDetails, deleteSavingsGoal } from '@/lib/supabase';
import { MealAnalysisBubble } from '@/components/chat/MealAnalysisBubble';
import { MealAnalysisCard } from '@/components/chat/MealAnalysisCard';
import { DailyProgressCard } from '@/components/chat/DailyProgressCard';
import { FinanceProgressCard } from '@/components/chat/FinanceProgressCard';
import { QuickActionsBar, QuickAction } from '@/components/chat/QuickActionsBar';
import { QuickReplies, QuickReply, getContextualReplies } from '@/components/chat/QuickReplies';
import { WeeklySummaryCard } from '@/components/chat/WeeklySummaryCard';
import { Message, Agent, WorkoutType, MealAnalysis } from '@/types';
import { sendMessage as sendToClaudeAPI, generateGreeting, extractExpense, extractIncome, shouldShowBills, shouldShowSummary, shouldShowGoals, detectSummaryPeriod } from '@/lib/claude';
import { parseError, ErrorType } from '@/lib/errors';

// Meal analysis message data structure
interface MealAnalysisMessage {
  type: 'meal_analysis';
  photoUrl: string;
  analysis: MealAnalysis;
  notes?: string;
}

// Bills message data structure
interface BillsMessage {
  type: 'bills_card';
  message: string;
}

// Summary message data structure
interface SummaryMessage {
  type: 'summary_card';
  message: string;
  period: 'week' | 'month';
}

// Goals message data structure
interface GoalsMessage {
  type: 'goals_card';
  message: string;
}

// Budget breakdown message data structure
interface BudgetMessage {
  type: 'budget_card';
  message: string;
}

// Log confirmation message data structure
interface LogConfirmationMessage {
  type: 'log_confirmation';
  logType: 'expense' | 'income' | 'bill';
  amount: number;
  category: string;
  description?: string;
  timestamp: string;
  receiptUrl?: string;
}

// Bill confirmation message data structure (for newly added bills)
interface BillConfirmationMessage {
  type: 'bill_confirmation';
  name: string;
  icon?: string;
  amount: number;
  category?: string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  dueDay: number;
  reminderDaysBefore?: number;
  autoLog?: boolean;
  isSubscription?: boolean;
  timestamp: string;
}

// Helper to parse meal analysis from message content
const parseMealAnalysis = (content: string): MealAnalysisMessage | null => {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.type === 'meal_analysis' && parsed.photoUrl && parsed.analysis) {
      return parsed as MealAnalysisMessage;
    }
    return null;
  } catch {
    return null;
  }
};

// Helper to parse bills card from message content
const parseBillsMessage = (content: string): BillsMessage | null => {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.type === 'bills_card') {
      return parsed as BillsMessage;
    }
    return null;
  } catch {
    return null;
  }
};

const parseSummaryMessage = (content: string): SummaryMessage | null => {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.type === 'summary_card') {
      // Default to 'week' if period not specified (for backwards compatibility)
      return {
        ...parsed,
        period: parsed.period || 'week',
      } as SummaryMessage;
    }
    return null;
  } catch {
    return null;
  }
};

const parseGoalsMessage = (content: string): GoalsMessage | null => {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.type === 'goals_card') {
      return parsed as GoalsMessage;
    }
    return null;
  } catch {
    return null;
  }
};

const parseBudgetMessage = (content: string): BudgetMessage | null => {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.type === 'budget_card') {
      return parsed as BudgetMessage;
    }
    return null;
  } catch {
    return null;
  }
};

const parseLogConfirmationMessage = (content: string): LogConfirmationMessage | null => {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.type === 'log_confirmation') {
      return parsed as LogConfirmationMessage;
    }
    return null;
  } catch {
    return null;
  }
};

const parseBillConfirmationMessage = (content: string): BillConfirmationMessage | null => {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.type === 'bill_confirmation') {
      return parsed as BillConfirmationMessage;
    }
    return null;
  } catch {
    return null;
  }
};

// Agent slime using ProfileSlime with circular accent background
const AgentSlime = ({
  agent,
  size = 40,
}: {
  agent?: Agent | null;
  size?: number;
}) => {
  const slimeColor = (agent?.persona_json?.slime_color || 'mint') as SlimeColor;
  const slimeType = (agent?.type || 'base') as SlimeType;

  return <ProfileSlime color={slimeColor} type={slimeType} size={size} animated={false} />;
};

// Chat message bubble with optional error state
const MessageBubble = ({
  message,
  agent,
  isError,
  onRetry,
  billsData,
  onAddBill,
  onPayBill,
  onViewBill,
  weeklySummaryData,
  monthlySummaryData,
  goalsData,
  onAddGoal,
  onViewGoal,
  budgetData,
  onCategoryPress,
  onSavingsGoalPress,
  currencySymbol,
  todaySpent,
  categoryBudgets,
  savingsGoalsForAllocation,
  onAllocateToSavings,
}: {
  message: Message;
  agent?: Agent | null;
  isError?: boolean;
  onRetry?: () => void;
  billsData?: {
    bills: any[];
    monthlyTotal: number;
    subscriptionsTotal: number;
  };
  onAddBill?: () => void;
  onPayBill?: (billId: string) => void;
  onViewBill?: (bill: any) => void;
  weeklySummaryData?: {
    period: 'week';
    periodLabel: string;
    totalSpent: number;
    totalIncome: number;
    transactionCount: number;
    byCategory: { category: string; amount: number }[];
    dailyAverage: number;
    budgetUsed?: number;
  };
  monthlySummaryData?: {
    period: 'month';
    periodLabel: string;
    totalSpent: number;
    totalIncome: number;
    transactionCount: number;
    byCategory: { category: string; amount: number }[];
    dailyAverage: number;
    budgetUsed?: number;
  };
  goalsData?: {
    id: string;
    name: string;
    icon: string;
    target_amount: number;
    current_amount: number;
    monthly_contribution?: number;
  }[];
  onAddGoal?: () => void;
  onViewGoal?: (goal: any) => void;
  budgetData?: {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    dailySafeSpend: number;
    daysLeft: number;
    needsBudget: number;
    needsSpent: number;
    wantsBudget: number;
    wantsSpent: number;
    savingsBudget: number;
    savingsAllocated: number;
    categoryExpenses: { category: string; amount: number; budgetType: 'needs' | 'wants' | 'savings' }[];
    savingsGoals: { id: string; name: string; icon: string; allocated: number; target: number }[];
    billsPaid: { name: string; amount: number }[];
  };
  onCategoryPress?: (category: string) => void;
  onSavingsGoalPress?: (goalId: string) => void;
  currencySymbol?: string;
  todaySpent?: number;
  categoryBudgets?: Record<string, { spent: number; budget: number; remaining: number }>;
  savingsGoalsForAllocation?: { id: string; name: string; icon: string }[];
  onAllocateToSavings?: (goalId: string, amount: number) => void;
}) => {
  const { colors: themeColors, isDarkMode } = useTheme();
  const isUser = message.role === 'user';

  // Check if this is a meal analysis message
  const mealAnalysis = !isUser ? parseMealAnalysis(message.content) : null;

  // Check if this is a bills card message
  const billsMessage = !isUser ? parseBillsMessage(message.content) : null;

  // Check if this is a summary card message
  const summaryMessage = !isUser ? parseSummaryMessage(message.content) : null;

  // Check if this is a goals card message
  const goalsMessage = !isUser ? parseGoalsMessage(message.content) : null;

  // Check if this is a budget breakdown card message
  const budgetMessage = !isUser ? parseBudgetMessage(message.content) : null;

  // Check if this is a log confirmation message
  const logConfirmation = !isUser ? parseLogConfirmationMessage(message.content) : null;

  // Check if this is a bill confirmation message
  const billConfirmation = !isUser ? parseBillConfirmationMessage(message.content) : null;

  // Render meal analysis card for assistant messages
  if (mealAnalysis) {
    return (
      <View style={[styles.messageContainer, styles.agentMessageContainer]}>
        <View style={styles.avatarSmall}>
          <AgentSlime agent={agent} size={32} />
        </View>
        <View style={styles.mealAnalysisWrapper}>
          <MealAnalysisCard
            photoUrl={mealAnalysis.photoUrl}
            analysis={mealAnalysis.analysis}
            notes={mealAnalysis.notes}
          />
          <Text style={[styles.timestamp, styles.cardTimestamp, { color: themeColors.textMuted }]}>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  }

  // Render bills card for assistant messages
  if (billsMessage && billsData) {
    return (
      <View style={[styles.messageContainer, styles.agentMessageContainer]}>
        <View style={styles.avatarSmall}>
          <AgentSlime agent={agent} size={32} />
        </View>
        <View style={styles.billsCardWrapper}>
          <BillsCard
            bills={billsData.bills}
            monthlyTotal={billsData.monthlyTotal}
            subscriptionsTotal={billsData.subscriptionsTotal}
            currencySymbol={currencySymbol}
            onAddBill={onAddBill}
            onPayBill={onPayBill}
            onViewBill={onViewBill}
          />
          <Text style={[styles.timestamp, styles.cardTimestamp, { color: themeColors.textMuted }]}>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  }

  // Render summary card for assistant messages
  // Select the correct data based on the message's period
  const summaryData = summaryMessage?.period === 'month' ? monthlySummaryData : weeklySummaryData;
  if (summaryMessage && summaryData) {
    return (
      <View style={[styles.messageContainer, styles.agentMessageContainer]}>
        <View style={styles.avatarSmall}>
          <AgentSlime agent={agent} size={32} />
        </View>
        <View style={styles.billsCardWrapper}>
          <FinanceSummaryCard
            data={summaryData}
            currencySymbol={currencySymbol}
          />
          <Text style={[styles.timestamp, styles.cardTimestamp, { color: themeColors.textMuted }]}>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  }

  // Render goals card for assistant messages
  if (goalsMessage && goalsData) {
    return (
      <View style={[styles.messageContainer, styles.agentMessageContainer]}>
        <View style={styles.avatarSmall}>
          <AgentSlime agent={agent} size={32} />
        </View>
        <View style={styles.billsCardWrapper}>
          <SavingsGoalsCard
            goals={goalsData}
            currencySymbol={currencySymbol}
            onAddGoal={onAddGoal}
            onViewGoal={onViewGoal}
          />
          <Text style={[styles.timestamp, styles.cardTimestamp, { color: themeColors.textMuted }]}>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  }

  // Render budget breakdown card for assistant messages
  if (budgetMessage && budgetData) {
    return (
      <View style={[styles.messageContainer, styles.agentMessageContainer]}>
        <View style={styles.avatarSmall}>
          <AgentSlime agent={agent} size={32} />
        </View>
        <View style={styles.billsCardWrapper}>
          <BudgetBreakdownCard
            data={budgetData}
            currencySymbol={currencySymbol}
            onCategoryPress={onCategoryPress}
            onSavingsGoalPress={onSavingsGoalPress}
          />
          <Text style={[styles.timestamp, styles.cardTimestamp, { color: themeColors.textMuted }]}>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  }

  // Render log confirmation card for assistant messages
  if (logConfirmation) {
    // Get category budget info if available
    const categoryBudget = categoryBudgets?.[logConfirmation.category];

    return (
      <View style={[styles.messageContainer, styles.agentMessageContainer]}>
        <View style={styles.avatarSmall}>
          <AgentSlime agent={agent} size={32} />
        </View>
        <View style={styles.billsCardWrapper}>
          <LogConfirmationCard
            data={{
              type: logConfirmation.logType,
              amount: logConfirmation.amount,
              category: logConfirmation.category,
              description: logConfirmation.description,
              timestamp: logConfirmation.timestamp,
              receiptUrl: logConfirmation.receiptUrl,
              budgetImpact: logConfirmation.logType !== 'income' && todaySpent !== undefined ? {
                todaySpent: todaySpent,
                dailyRemaining: 0,
                categoryRemaining: categoryBudget?.remaining ?? 0,
                categoryBudget: categoryBudget?.budget ?? 0,
                percentUsed: categoryBudget ? (categoryBudget.spent / categoryBudget.budget) * 100 : 0,
              } : undefined,
            }}
            currencySymbol={currencySymbol}
            savingsGoals={savingsGoalsForAllocation}
            onAllocateToSavings={onAllocateToSavings}
          />
          <Text style={[styles.timestamp, styles.cardTimestamp, { color: themeColors.textMuted }]}>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  }

  // Render bill confirmation card for assistant messages
  if (billConfirmation) {
    return (
      <View style={[styles.messageContainer, styles.agentMessageContainer]}>
        <View style={styles.avatarSmall}>
          <AgentSlime agent={agent} size={32} />
        </View>
        <View style={styles.billsCardWrapper}>
          <BillConfirmationCard
            data={{
              name: billConfirmation.name,
              icon: billConfirmation.icon,
              amount: billConfirmation.amount,
              category: billConfirmation.category,
              frequency: billConfirmation.frequency,
              dueDay: billConfirmation.dueDay,
              reminderDaysBefore: billConfirmation.reminderDaysBefore,
              autoLog: billConfirmation.autoLog,
              isSubscription: billConfirmation.isSubscription,
              timestamp: billConfirmation.timestamp,
            }}
            currencySymbol={currencySymbol}
          />
          <Text style={[styles.timestamp, styles.cardTimestamp, { color: themeColors.textMuted }]}>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.agentMessageContainer,
      ]}
    >
      {!isUser && (
        <View style={styles.avatarSmall}>
          <AgentSlime agent={agent} size={32} />
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser
          ? [styles.userBubble, { backgroundColor: themeColors.primary }]
          : [styles.agentBubble, { backgroundColor: themeColors.surface }],
        isError && styles.errorBubble,
      ]}>
        <Text style={[styles.bubbleText, { color: isUser ? '#101914' : themeColors.text }, isError && styles.errorText]}>
          {message.content}
        </Text>
        <View style={styles.bubbleFooter}>
          <Text style={[styles.timestamp, { color: isUser ? '#101914' : themeColors.textMuted, opacity: isUser ? 0.6 : 0.7 }, isError && styles.errorTimestamp]}>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
          {isError && onRetry && (
            <Pressable onPress={onRetry} style={[styles.retryButton, { backgroundColor: themeColors.primary }]}>
              <Text style={[styles.retryText, { color: '#101914' }]}>Retry</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

// Animated typing indicator
const TypingIndicator = ({ agent }: { agent?: Agent | null }) => {
  const { colors: themeColors } = useTheme();
  const dot1Anim = useRef(new RNAnimated.Value(0)).current;
  const dot2Anim = useRef(new RNAnimated.Value(0)).current;
  const dot3Anim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const animateDot = (anim: RNAnimated.Value, delay: number) => {
      return RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          RNAnimated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = RNAnimated.parallel([
      animateDot(dot1Anim, 0),
      animateDot(dot2Anim, 150),
      animateDot(dot3Anim, 300),
    ]);

    animation.start();

    return () => animation.stop();
  }, []);

  const getDotStyle = (anim: RNAnimated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [{
      translateY: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -4],
      }),
    }],
  });

  return (
    <View style={[styles.messageContainer, styles.agentMessageContainer]}>
      <View style={styles.avatarSmall}>
        <AgentSlime agent={agent} size={32} />
      </View>
      <View style={[styles.bubble, styles.agentBubble, styles.typingBubble, { backgroundColor: themeColors.surface }]}>
        <View style={styles.typingDots}>
          <RNAnimated.View style={[styles.dot, { backgroundColor: themeColors.textMuted }, getDotStyle(dot1Anim)]} />
          <RNAnimated.View style={[styles.dot, { backgroundColor: themeColors.textMuted }, getDotStyle(dot2Anim)]} />
          <RNAnimated.View style={[styles.dot, { backgroundColor: themeColors.textMuted }, getDotStyle(dot3Anim)]} />
        </View>
      </View>
    </View>
  );
};

// Analyzing indicator for meal photo processing
const AnalyzingIndicator = ({ agent }: { agent?: Agent | null }) => {
  const { colors: themeColors } = useTheme();
  const spinAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const animation = RNAnimated.loop(
      RNAnimated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [spinAnim]);

  const spinStyle = {
    transform: [{
      rotate: spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    }],
  };

  return (
    <View style={[styles.messageContainer, styles.agentMessageContainer]}>
      <View style={styles.avatarSmall}>
        <AgentSlime agent={agent} size={32} />
      </View>
      <View style={[styles.bubble, styles.agentBubble, styles.analyzingBubble, { backgroundColor: themeColors.surface }]}>
        <RNAnimated.View style={spinStyle}>
          <Ionicons name="sparkles" size={18} color={themeColors.primary} />
        </RNAnimated.View>
        <Text style={[styles.analyzingText, { color: themeColors.text }]}>
          Analyzing your meal...
        </Text>
      </View>
    </View>
  );
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors, isDarkMode } = useTheme();
  const { agent, loading: agentLoading, error: agentError } = useAgent(id);
  const { memories, saveMemories, loading: memoriesLoading } = useAgentMemory(id);
  const {
    messages,
    loading: messagesLoading,
    loadingMore,
    sending,
    error: chatError,
    hasMore,
    sendUserMessage,
    saveAssistantMessage,
    loadMore,
    refetch,
  } = useChat(id);
  const { showError, showToast } = useToast();

  // Meal logging hooks
  const mealLogging = useMealLogging(agent);
  const mealPhoto = useMealPhoto(agent?.id);

  // Water logging hook
  const waterLogging = useWaterLogging(agent);

  // Workout logging hook
  const workoutLogging = useWorkoutLogging(agent);

  // Weekly summary hook
  const weeklySummary = useWeeklySummary(agent);

  // Finance hook
  const finance = useFinance(agent);

  // Bills hook
  const bills = useBills(agent);

  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessageId, setErrorMessageId] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showWaterSheet, setShowWaterSheet] = useState(false);
  const [confirmedMealId, setConfirmedMealId] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [showExpenseSheet, setShowExpenseSheet] = useState(false);
  const [showIncomeSheet, setShowIncomeSheet] = useState(false);
  const [showLogActionSheet, setShowLogActionSheet] = useState(false);
  const [showBillSheet, setShowBillSheet] = useState(false);
  const [showEditBillSheet, setShowEditBillSheet] = useState(false);
  const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryExpenses, setCategoryExpenses] = useState<any[]>([]);
  const [showAddSavingsGoalSheet, setShowAddSavingsGoalSheet] = useState(false);
  const [showEditSavingsGoalSheet, setShowEditSavingsGoalSheet] = useState(false);
  const [selectedSavingsGoal, setSelectedSavingsGoal] = useState<any>(null);

  // Scroll position tracking
  const [refreshing, setRefreshing] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState<number | null>(null);
  const [savedScrollPosition, setSavedScrollPosition] = useState<number | null>(null);
  const [stateLoaded, setStateLoaded] = useState(false);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);
  const scrollViewHeightRef = useRef(0);
  const hasRestoredScroll = useRef(false);
  const lastScrollY = useRef(0);

  // Header animation
  const HEADER_HEIGHT = 70 + insets.top;
  const headerVisible = useSharedValue(1);

  // Quick actions toggle animation
  const toggleRotation = useSharedValue(0);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          headerVisible.value,
          [0, 1],
          [-HEADER_HEIGHT, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
    opacity: headerVisible.value,
  }));

  const messagesTopPadding = useAnimatedStyle(() => ({
    paddingTop: interpolate(
      headerVisible.value,
      [0, 1],
      [insets.top + spacing.md, HEADER_HEIGHT],
      Extrapolation.CLAMP
    ),
  }));

  const toggleButtonStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(
          toggleRotation.value,
          [0, 1],
          [0, 45],
          Extrapolation.CLAMP
        )}deg`,
      },
    ],
  }));

  // Refresh nutrition on mount and when agent changes
  useEffect(() => {
    if (agent) {
      mealLogging.refreshTodayNutrition();
    }
  }, [agent?.id]);

  // Show toast for chat errors
  useEffect(() => {
    if (chatError && !messagesLoading) {
      showError(chatError, refetch);
    }
  }, [chatError, messagesLoading]);

  // Show toast for meal logging errors
  useEffect(() => {
    if (mealLogging.error) {
      showError(mealLogging.error);
    }
  }, [mealLogging.error]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Storage keys for this chat
  const scrollPositionKey = `chat_scroll_${id}`;
  const lastSeenKey = `chat_lastseen_${id}`;

  // Reset state when chat id changes
  useEffect(() => {
    hasRestoredScroll.current = false;
    setStateLoaded(false);
    setSavedScrollPosition(null);
    setLastSeenMessageCount(null);
    setShowNewMessages(false);
  }, [id]);

  // Load saved state from AsyncStorage
  useEffect(() => {
    const loadState = async () => {
      try {
        const [savedPosition, savedLastSeen] = await Promise.all([
          AsyncStorage.getItem(scrollPositionKey),
          AsyncStorage.getItem(lastSeenKey),
        ]);

        if (savedPosition) {
          setSavedScrollPosition(parseFloat(savedPosition));
        }
        if (savedLastSeen) {
          setLastSeenMessageCount(parseInt(savedLastSeen, 10));
        }
      } catch (e) {
        console.log('Failed to load chat state:', e);
      }
      setStateLoaded(true);
    };

    loadState();
  }, [scrollPositionKey, lastSeenKey]);

  // Restore scroll position after messages load AND saved state is loaded
  useEffect(() => {
    if (!messagesLoading && messages.length > 0 && stateLoaded && !hasRestoredScroll.current) {
      hasRestoredScroll.current = true;

      // Check for new messages since last visit
      const hasNewMessages = lastSeenMessageCount !== null && messages.length > lastSeenMessageCount;

      if (hasNewMessages && savedScrollPosition !== null) {
        // New messages exist - restore to previous position and show button
        setShowNewMessages(true);
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: savedScrollPosition,
            animated: false,
          });
        }, 150);
      } else if (savedScrollPosition !== null && lastSeenMessageCount !== null) {
        // No new messages - restore to saved position
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: savedScrollPosition,
            animated: false,
          });
        }, 150);
      } else {
        // First visit or no saved state - scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 150);
      }
    }
  }, [messagesLoading, messages.length, stateLoaded, lastSeenMessageCount, savedScrollPosition]);

  // Save state when leaving the chat
  useEffect(() => {
    return () => {
      // Save scroll position and message count on unmount
      AsyncStorage.setItem(scrollPositionKey, scrollPositionRef.current.toString());
      AsyncStorage.setItem(lastSeenKey, messages.length.toString());
    };
  }, [messages.length, scrollPositionKey, lastSeenKey]);

  // Handle scroll events
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const currentY = contentOffset.y;
    scrollPositionRef.current = currentY;
    contentHeightRef.current = contentSize.height;
    scrollViewHeightRef.current = layoutMeasurement.height;

    // Check if at bottom (within 50px threshold)
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - currentY;
    const atBottom = distanceFromBottom < 50;

    setIsAtBottom(atBottom);

    // Hide new messages button if user scrolled to bottom
    if (atBottom && showNewMessages) {
      setShowNewMessages(false);
    }

    // Header visibility based on scroll direction
    const scrollDiff = currentY - lastScrollY.current;
    const scrollThreshold = 10; // Minimum scroll to trigger hide/show

    if (currentY <= 0) {
      // At top - always show header
      headerVisible.value = withTiming(1, { duration: 200 });
    } else if (scrollDiff > scrollThreshold) {
      // Scrolling down - hide header
      headerVisible.value = withTiming(0, { duration: 200 });
    } else if (scrollDiff < -scrollThreshold) {
      // Scrolling up - show header
      headerVisible.value = withTiming(1, { duration: 200 });
    }

    lastScrollY.current = currentY;
  }, [showNewMessages, headerVisible]);

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
    setShowNewMessages(false);
  }, []);

  // Add welcome message if no messages exist
  useEffect(() => {
    if (!messagesLoading && messages.length === 0 && agent) {
      const welcomeMessage = generateGreeting(agent);
      saveAssistantMessage(welcomeMessage);
    }
  }, [messagesLoading, messages.length, agent]);

  const triggerHaptic = async (type: 'light' | 'medium' | 'success' | 'error') => {
    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch (e) {
      // Haptics not available (e.g., on web)
    }
  };

  // Toggle quick actions bar
  const toggleQuickActions = () => {
    triggerHaptic('light');
    const newState = !showQuickActions;
    setShowQuickActions(newState);
    toggleRotation.value = withTiming(newState ? 1 : 0, { duration: 200 });
  };

  // Handle camera button press (now from quick actions)
  const handleCameraPress = () => {
    triggerHaptic('light');
    setShowQuickActions(false);
    toggleRotation.value = withTiming(0, { duration: 200 });
    setShowPhotoOptions(true);
  };

  // Handle water logging - quick tap for 250ml
  const handleLogWater = async () => {
    triggerHaptic('light');
    setShowQuickActions(false);
    toggleRotation.value = withTiming(0, { duration: 200 });

    const log = await waterLogging.logWater();
    if (log) {
      await triggerHaptic('success');
      const glasses = Math.round(waterLogging.todayWaterMl / 250) + 1;
      const goalGlasses = Math.round(waterLogging.waterGoalMl / 250);
      showToast({
        type: 'success',
        message: `Water logged! ${glasses}/${goalGlasses} glasses today`,
        duration: 2000,
      });
      // Refresh nutrition data to update progress card
      mealLogging.refreshTodayNutrition();
    } else if (waterLogging.error) {
      await triggerHaptic('error');
      showError(waterLogging.error);
    }
  };

  // Handle water logging - long press for custom amount sheet
  const handleLogWaterLongPress = () => {
    triggerHaptic('medium');
    setShowQuickActions(false);
    toggleRotation.value = withTiming(0, { duration: 200 });
    setShowWaterSheet(true);
  };

  // Handle custom water amount selection
  const handleWaterAmountSelect = async (amountMl: number) => {
    const log = await waterLogging.logWater(amountMl);
    if (log) {
      await triggerHaptic('success');
      const glasses = Math.round((waterLogging.todayWaterMl + amountMl) / 250);
      const goalGlasses = Math.round(waterLogging.waterGoalMl / 250);
      showToast({
        type: 'success',
        message: `${amountMl}ml logged! ${glasses}/${goalGlasses} glasses today`,
        duration: 2000,
      });
      mealLogging.refreshTodayNutrition();
    } else if (waterLogging.error) {
      await triggerHaptic('error');
      showError(waterLogging.error);
    }
  };

  // Check if this is a finance agent
  const isFinanceAgent = agent?.type === 'finance' || agent?.type === 'budget_helper';

  // Get currency symbol from agent
  const getCurrencySymbol = () => {
    const persona = agent?.persona_json as Record<string, any>;
    return persona?.currency_symbol || '$';
  };

  // Handle opening expense sheet
  const handleLogExpensePress = () => {
    triggerHaptic('light');
    setShowQuickActions(false);
    toggleRotation.value = withTiming(0, { duration: 200 });
    setShowExpenseSheet(true);
  };

  // Handle opening income sheet
  const handleLogIncomePress = () => {
    triggerHaptic('light');
    setShowQuickActions(false);
    toggleRotation.value = withTiming(0, { duration: 200 });
    setShowIncomeSheet(true);
  };

  // Handle opening log action sheet (grouped Log button)
  const handleLogPress = () => {
    triggerHaptic('light');
    setShowQuickActions(false);
    toggleRotation.value = withTiming(0, { duration: 200 });
    setShowLogActionSheet(true);
  };

  // Handle opening add bill sheet
  const handleAddBillPress = () => {
    triggerHaptic('light');
    setShowBillSheet(true);
  };

  // Handle viewing bills - send a chat message to trigger BillsCard
  const handleViewBillsPress = () => {
    triggerHaptic('light');
    setShowQuickActions(false);
    toggleRotation.value = withTiming(0, { duration: 200 });
    handleSend("Show me my bills");
  };

  // Handle adding a bill from the sheet
  const handleAddBill = async (bill: {
    name: string;
    icon?: string;
    amount: number;
    category?: string;
    frequency: 'weekly' | 'monthly' | 'yearly';
    dueDay: number;
    reminderDaysBefore?: number;
    autoLog?: boolean;
    isSubscription?: boolean;
  }) => {
    const result = await bills.addBill(bill);
    if (result) {
      await triggerHaptic('success');
      showToast({
        type: 'success',
        message: `Added "${bill.name}" to your bills`,
        duration: 2000,
      });

      // Send a bill confirmation message as structured JSON
      const billConfirmation: BillConfirmationMessage = {
        type: 'bill_confirmation',
        name: bill.name,
        icon: bill.icon,
        amount: bill.amount,
        category: bill.category,
        frequency: bill.frequency,
        dueDay: bill.dueDay,
        reminderDaysBefore: bill.reminderDaysBefore,
        autoLog: bill.autoLog,
        isSubscription: bill.isSubscription,
        timestamp: new Date().toISOString(),
      };
      await saveAssistantMessage(JSON.stringify(billConfirmation));
    } else {
      await triggerHaptic('error');
      showError('Failed to add bill');
    }
  };

  // Handle paying a bill
  const handlePayBill = async (billId: string) => {
    const success = await bills.payBill(billId);
    if (success) {
      await triggerHaptic('success');
      showToast({
        type: 'success',
        message: 'Bill marked as paid',
        duration: 2000,
      });
    } else {
      await triggerHaptic('error');
      showError('Failed to mark bill as paid');
    }
  };

  // Handle viewing/editing a bill
  const handleViewBill = (bill: RecurringBill) => {
    triggerHaptic('light');
    setSelectedBill(bill);
    setShowEditBillSheet(true);
  };

  // Handle category press from budget breakdown card
  const handleCategoryPress = async (category: string) => {
    if (!agent?.id) return;
    triggerHaptic('light');

    // Fetch expenses for this category
    const { data, error } = await getCategoryExpenses(agent.id, category);
    if (!error && data) {
      setCategoryExpenses(data);
      setSelectedCategory(category);
      setShowCategorySheet(true);
    }
  };

  // Handle adding a new savings goal
  const handleAddSavingsGoal = async (goalData: {
    name: string;
    icon: string;
    target_amount: number;
    target_date?: string;
  }) => {
    if (!agent?.id) return;

    const { error } = await createSavingsGoal({
      agent_id: agent.id,
      name: goalData.name,
      icon: goalData.icon,
      target_amount: goalData.target_amount,
      target_date: goalData.target_date,
    });

    if (!error) {
      await triggerHaptic('success');
      setShowAddSavingsGoalSheet(false);
      finance.refresh();
      showToast({
        type: 'success',
        message: `Started saving for ${goalData.name}!`,
        duration: 2000,
      });
    } else {
      await triggerHaptic('error');
      showToast({
        type: 'error',
        message: 'Failed to create savings goal',
        duration: 3000,
      });
    }
  };

  // Handle viewing/editing a savings goal
  const handleViewSavingsGoal = (goal: any) => {
    triggerHaptic('light');
    setSelectedSavingsGoal(goal);
    setShowEditSavingsGoalSheet(true);
  };

  // Handle adding funds to a savings goal
  const handleAddFundsToGoal = async (goalId: string, amount: number) => {
    const { error } = await addSavingsContribution(goalId, amount);

    if (!error) {
      await triggerHaptic('success');
      finance.refresh();
      // Update selected goal with new amount
      if (selectedSavingsGoal && selectedSavingsGoal.id === goalId) {
        setSelectedSavingsGoal({
          ...selectedSavingsGoal,
          current_amount: selectedSavingsGoal.current_amount + amount,
        });
      }
      showToast({
        type: 'success',
        message: `Added $${amount.toFixed(2)} to savings!`,
        duration: 2000,
      });
    } else {
      await triggerHaptic('error');
      showToast({
        type: 'error',
        message: 'Failed to add funds',
        duration: 3000,
      });
    }
  };

  // Handle editing savings goal details
  const handleEditSavingsGoal = async (
    goalId: string,
    updates: { name?: string; icon?: string; target_amount?: number; target_date?: string | null }
  ) => {
    const { error } = await updateSavingsGoalDetails(goalId, updates);

    if (!error) {
      await triggerHaptic('success');
      finance.refresh();
      // Update selected goal
      if (selectedSavingsGoal && selectedSavingsGoal.id === goalId) {
        setSelectedSavingsGoal({
          ...selectedSavingsGoal,
          ...updates,
        });
      }
      showToast({
        type: 'success',
        message: 'Goal updated!',
        duration: 2000,
      });
    } else {
      await triggerHaptic('error');
      showToast({
        type: 'error',
        message: 'Failed to update goal',
        duration: 3000,
      });
    }
  };

  // Handle deleting a savings goal
  const handleDeleteSavingsGoal = async (goalId: string) => {
    const { error } = await deleteSavingsGoal(goalId);

    if (!error) {
      await triggerHaptic('success');
      setShowEditSavingsGoalSheet(false);
      setSelectedSavingsGoal(null);
      finance.refresh();
      showToast({
        type: 'success',
        message: 'Goal deleted',
        duration: 2000,
      });
    } else {
      await triggerHaptic('error');
      showToast({
        type: 'error',
        message: 'Failed to delete goal',
        duration: 3000,
      });
    }
  };

  // Handle saving bill edits
  const handleSaveBill = async (billId: string, updates: any) => {
    const result = await bills.updateBill(billId, updates);
    if (result) {
      await triggerHaptic('success');
      setShowEditBillSheet(false);
      setSelectedBill(null);
      showToast({
        type: 'success',
        message: 'Bill updated',
        duration: 2000,
      });
    } else {
      await triggerHaptic('error');
      showError('Failed to update bill');
    }
  };

  // Handle deleting a bill
  const handleDeleteBill = async (billId: string) => {
    const success = await bills.removeBill(billId);
    if (success) {
      await triggerHaptic('success');
      setShowEditBillSheet(false);
      setSelectedBill(null);
      showToast({
        type: 'success',
        message: 'Bill deleted',
        duration: 2000,
      });
    } else {
      await triggerHaptic('error');
      showError('Failed to delete bill');
    }
  };

  // Handle expense logging from sheet
  const handleLogExpense = async (expense: { amount: number; category: string; categoryName: string; description?: string }) => {
    const result = await finance.logExpense({
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
    });

    if (result) {
      await triggerHaptic('success');
      showToast({
        type: 'success',
        message: `Logged ${getCurrencySymbol()}${expense.amount.toFixed(2)} for ${expense.categoryName}`,
        duration: 2000,
      });

      // Send structured log confirmation message
      const logConfirmation: LogConfirmationMessage = {
        type: 'log_confirmation',
        logType: 'expense',
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        timestamp: new Date().toISOString(),
      };
      await saveAssistantMessage(JSON.stringify(logConfirmation));
    } else {
      await triggerHaptic('error');
      showError('Failed to log expense');
    }
  };

  // Handle income logging from sheet
  const handleLogIncome = async (income: { amount: number; category: string; categoryName: string; description?: string }) => {
    const result = await finance.logIncome({
      amount: income.amount,
      category: income.category,
      description: income.description,
    });

    if (result) {
      await triggerHaptic('success');
      showToast({
        type: 'success',
        message: `Added ${getCurrencySymbol()}${income.amount.toFixed(2)} income`,
        duration: 2000,
      });

      // Send structured log confirmation message
      const logConfirmation: LogConfirmationMessage = {
        type: 'log_confirmation',
        logType: 'income',
        amount: income.amount,
        category: income.category,
        description: income.description,
        timestamp: new Date().toISOString(),
      };
      await saveAssistantMessage(JSON.stringify(logConfirmation));
    } else {
      await triggerHaptic('error');
      showError('Failed to log income');
    }
  };

  // Quick actions for fitness coach
  const fitnessQuickActions: QuickAction[] = [
    {
      id: 'log-meal',
      label: 'Log Meal',
      icon: 'camera-outline',
      onPress: handleCameraPress,
    },
    {
      id: 'log-water',
      label: 'Log Water',
      icon: 'water-outline',
      onPress: handleLogWater,
      onLongPress: handleLogWaterLongPress,
    },
    {
      id: 'log-workout',
      label: 'Log Workout',
      icon: 'barbell-outline',
      onPress: () => {
        triggerHaptic('light');
        setShowQuickActions(false);
        toggleRotation.value = withTiming(0, { duration: 200 });
        handleSend("I want to log a workout");
      },
    },
    {
      id: 'check-progress',
      label: 'My Progress',
      icon: 'stats-chart-outline',
      onPress: () => {
        triggerHaptic('light');
        setShowQuickActions(false);
        toggleRotation.value = withTiming(0, { duration: 200 });
        handleSend("How am I doing with my goals?");
      },
    },
    {
      id: 'weekly-summary',
      label: 'Summary',
      icon: 'bar-chart-outline',
      onPress: async () => {
        triggerHaptic('light');
        setShowQuickActions(false);
        toggleRotation.value = withTiming(0, { duration: 200 });
        const summary = await weeklySummary.getCurrentWeekSummary();
        if (summary) {
          setShowWeeklySummary(true);
        } else if (weeklySummary.error) {
          showError(weeklySummary.error);
        }
      },
    },
    {
      id: 'get-tips',
      label: 'Quick Tips',
      icon: 'bulb-outline',
      onPress: () => {
        triggerHaptic('light');
        setShowQuickActions(false);
        toggleRotation.value = withTiming(0, { duration: 200 });
        handleSend("Give me a quick fitness tip!");
      },
    },
    {
      id: 'motivation',
      label: 'Motivate Me',
      icon: 'flame-outline',
      onPress: () => {
        triggerHaptic('light');
        setShowQuickActions(false);
        toggleRotation.value = withTiming(0, { duration: 200 });
        handleSend("I need some motivation today!");
      },
    },
  ];

  // Quick actions for finance buddy
  const financeQuickActions: QuickAction[] = [
    {
      id: 'log',
      label: 'Log',
      icon: 'add-circle-outline',
      onPress: handleLogPress,
    },
    {
      id: 'weekly-summary',
      label: 'Summary',
      icon: 'stats-chart-outline',
      onPress: () => {
        triggerHaptic('light');
        setShowQuickActions(false);
        toggleRotation.value = withTiming(0, { duration: 200 });
        handleSend("Show me my weekly summary");
      },
    },
    {
      id: 'savings-goals',
      label: 'Goals',
      icon: 'flag-outline',
      onPress: () => {
        triggerHaptic('light');
        setShowQuickActions(false);
        toggleRotation.value = withTiming(0, { duration: 200 });
        handleSend("How are my savings goals doing?");
      },
    },
    {
      id: 'budget',
      label: 'Budget',
      icon: 'pie-chart-outline',
      onPress: () => {
        triggerHaptic('light');
        setShowQuickActions(false);
        toggleRotation.value = withTiming(0, { duration: 200 });
        handleSend("Show me my budget breakdown");
      },
    },
    {
      id: 'bills',
      label: 'Bills',
      icon: 'calendar-outline',
      onPress: handleViewBillsPress,
    },
  ];

  // Select quick actions based on agent type
  const quickActions = isFinanceAgent ? financeQuickActions : fitnessQuickActions;

  // Get last agent message for contextual quick replies
  const lastAgentMessage = messages
    .filter((m) => m.role === 'assistant')
    .slice(-1)[0]?.content;

  // Get contextual quick replies based on last agent message
  const quickReplies = getContextualReplies(lastAgentMessage);

  // Handle quick reply selection
  const handleQuickReply = (reply: QuickReply) => {
    triggerHaptic('light');
    handleSend(reply.text);
  };

  // Handle taking a photo with camera
  const handleTakePhoto = async () => {
    const photoUrl = await mealPhoto.takePhoto();

    // Close modal after picker returns
    setShowPhotoOptions(false);

    if (photoUrl) {
      await processMealPhoto(photoUrl);
    } else if (mealPhoto.error) {
      showError(mealPhoto.error);
      mealPhoto.clearError();
    }
  };

  // Handle selecting from library
  const handlePickFromLibrary = async () => {
    const photoUrl = await mealPhoto.pickFromLibrary();

    // Close modal after picker returns
    setShowPhotoOptions(false);

    if (photoUrl) {
      await processMealPhoto(photoUrl);
    } else if (mealPhoto.error) {
      showError(mealPhoto.error);
      mealPhoto.clearError();
    }
  };

  // Process the captured/selected photo (URL is already uploaded)
  const processMealPhoto = async (photoUrl: string) => {
    if (!agent) return;

    // Analyze the meal (notes will be added in the confirmation modal)
    // The analysis is shown in MealAnalysisBubble modal, saved to chat only when confirmed
    const pending = await mealLogging.analyzeMeal(photoUrl);
    if (pending) {
      await triggerHaptic('success');
    } else {
      showError('Failed to analyze meal. Please try again.');
      await triggerHaptic('error');
    }
  };

  // Handle confirming a meal (re-analyzes with notes if provided)
  const handleConfirmMeal = async (notes?: string) => {
    // Capture photoUrl before confirmMeal clears pendingMeal
    const photoUrl = mealLogging.pendingMeal?.photoUrl;

    await triggerHaptic('medium');
    const result = await mealLogging.confirmMeal(notes);

    if (result.success && result.finalAnalysis && photoUrl) {
      // Set confirmed ID for UI feedback
      setConfirmedMealId(photoUrl);

      await triggerHaptic('success');
      showToast({
        type: 'success',
        message: 'Meal logged successfully!',
        duration: 2000,
      });

      // Save the final meal analysis card with notes to chat
      const mealAnalysisMessage: MealAnalysisMessage = {
        type: 'meal_analysis',
        photoUrl,
        analysis: result.finalAnalysis,
        notes: result.notes,
      };
      await saveAssistantMessage(JSON.stringify(mealAnalysisMessage));

      // Add a short confirmation message
      const persona = agent?.persona_json as Record<string, any>;
      const style = persona?.style || 'balanced';
      let confirmMsg = '';

      if (style === 'tough_love') {
        confirmMsg = "Logged! Keep fueling right and stay on track! 💪";
      } else if (style === 'gentle') {
        confirmMsg = "Great job logging your meal! 🌟";
      } else {
        confirmMsg = "Got it! Your meal has been logged. 💪";
      }

      const { error: saveError } = await saveAssistantMessage(confirmMsg);
      if (saveError) {
        console.error('Failed to save confirmation message:', saveError);
      }

      // Clear confirmed ID after animation
      setTimeout(() => setConfirmedMealId(null), 2000);
    } else {
      await triggerHaptic('error');
    }
  };

  // Handle canceling a meal
  const handleCancelMeal = async () => {
    await triggerHaptic('light');
    mealLogging.cancelMeal();

    await saveAssistantMessage("No problem! Let me know when you're ready to log a meal. 📸");
  };

  const handleSend = async (retryMessage?: string) => {
    const messageText = retryMessage || inputText.trim();
    if (!messageText || sending || !agent) return;

    // Clear input and trigger haptic
    if (!retryMessage) {
      setInputText('');
    }
    await triggerHaptic('light');

    // Clear any previous error state
    setErrorMessageId(null);
    setLastFailedMessage(null);

    // Save user message to Supabase
    const { data: userMessage, error: sendError } = await sendUserMessage(messageText);
    if (sendError || !userMessage) {
      await triggerHaptic('error');
      if (sendError) {
        showError(sendError, () => handleSend(messageText));
      }
      return;
    }

    // Scroll to bottom to show user's message
    scrollToBottom();

    // Show typing indicator
    setIsTyping(true);

    try {
      // Call Claude API with agent context and memories
      const { response, newMemories, workout, expense, income, showBills, showSummary, showGoals, showBudget, summaryPeriod } = await sendToClaudeAPI(
        agent,
        messages,
        memories,
        messageText
      );

      // Save any new memories extracted from Claude's response
      if (newMemories.length > 0) {
        const savedCount = await saveMemories(newMemories);
        console.log(`Saved ${savedCount} new memories`);
      }

      // If Claude detected a workout to log, save it
      if (workout) {
        const workoutLog = await workoutLogging.logWorkout(
          workout.type as WorkoutType,
          workout.duration,
          messageText
        );
        if (workoutLog) {
          console.log('Workout logged from Claude response:', workoutLog);
          // Refresh nutrition data to update progress card
          mealLogging.refreshTodayNutrition();
        }
      }

      // If Claude detected an expense to log, save it to database
      if (expense && isFinanceAgent) {
        const result = await finance.logExpense({
          amount: expense.amount,
          category: expense.category,
          description: expense.description,
        });
        if (result) {
          console.log('Expense logged from Claude response:', result);
        }
      }

      // If Claude detected income to log, save it to database
      if (income && isFinanceAgent) {
        const result = await finance.logIncome({
          amount: income.amount,
          category: income.category,
          description: income.description,
        });
        if (result) {
          console.log('Income logged from Claude response:', result);
        }
      }

      // Handle special card message types for finance agent
      if (isFinanceAgent) {
        if (showBills) {
          // Refresh bills data first
          await bills.refresh();
          // Save as bills_card type with the text message
          const billsMsg: BillsMessage = {
            type: 'bills_card',
            message: response,
          };
          await saveAssistantMessage(JSON.stringify(billsMsg));
        } else if (showSummary) {
          // Save as summary_card type with period
          const summaryMsg: SummaryMessage = {
            type: 'summary_card',
            message: response,
            period: summaryPeriod,
          };
          await saveAssistantMessage(JSON.stringify(summaryMsg));
        } else if (showGoals) {
          // Save as goals_card type
          const goalsMsg: GoalsMessage = {
            type: 'goals_card',
            message: response,
          };
          await saveAssistantMessage(JSON.stringify(goalsMsg));
        } else if (showBudget) {
          // Save as budget_card type
          const budgetMsg: BudgetMessage = {
            type: 'budget_card',
            message: response,
          };
          await saveAssistantMessage(JSON.stringify(budgetMsg));
        } else {
          // Save regular assistant response to Supabase
          await saveAssistantMessage(response);
        }
      } else {
        // Save regular assistant response to Supabase
        await saveAssistantMessage(response);
      }

      // Scroll to show the response
      setTimeout(scrollToBottom, 100);

      // Success haptic
      await triggerHaptic('success');
    } catch (error) {
      console.error('Error getting response:', error);

      // Error haptic
      await triggerHaptic('error');

      // Parse and handle the error
      const appError = parseError(error);

      // Check for rate limit
      if (appError.type === ErrorType.RATE_LIMIT) {
        showToast({
          type: 'warning',
          message: appError.message,
          duration: 5000,
        });
      } else {
        // Save error message and track it for retry
        const errorResponse = appError.retryable
          ? "Oops! I couldn't connect. Tap retry to try again."
          : appError.message;

        const { data: errorMsg } = await saveAssistantMessage(errorResponse);
        if (errorMsg && appError.retryable) {
          setErrorMessageId(errorMsg.id);
          setLastFailedMessage(messageText);
        }
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = async () => {
    if (!lastFailedMessage || !agent) return;

    await triggerHaptic('medium');

    // Clear the error message from display (it's still in DB but we'll replace it)
    setErrorMessageId(null);

    // Retry with the last failed message
    setIsTyping(true);

    try {
      const { response, newMemories, workout, expense, income, showBills, showSummary, showGoals, showBudget, summaryPeriod } = await sendToClaudeAPI(
        agent,
        messages.filter(m => m.id !== errorMessageId), // Exclude error message
        memories,
        lastFailedMessage
      );

      if (newMemories.length > 0) {
        await saveMemories(newMemories);
      }

      // If Claude detected a workout to log, save it
      if (workout) {
        await workoutLogging.logWorkout(
          workout.type as WorkoutType,
          workout.duration,
          lastFailedMessage
        );
        mealLogging.refreshTodayNutrition();
      }

      // If Claude detected an expense to log, save it to database
      if (expense && isFinanceAgent) {
        await finance.logExpense({
          amount: expense.amount,
          category: expense.category,
          description: expense.description,
        });
      }

      // If Claude detected income to log, save it to database
      if (income && isFinanceAgent) {
        await finance.logIncome({
          amount: income.amount,
          category: income.category,
          description: income.description,
        });
      }

      // Handle special card message types for finance agent
      if (isFinanceAgent) {
        if (showBills) {
          await bills.refresh();
          const billsMsg: BillsMessage = {
            type: 'bills_card',
            message: response,
          };
          await saveAssistantMessage(JSON.stringify(billsMsg));
        } else if (showSummary) {
          const summaryMsg: SummaryMessage = {
            type: 'summary_card',
            message: response,
            period: summaryPeriod,
          };
          await saveAssistantMessage(JSON.stringify(summaryMsg));
        } else if (showGoals) {
          const goalsMsg: GoalsMessage = {
            type: 'goals_card',
            message: response,
          };
          await saveAssistantMessage(JSON.stringify(goalsMsg));
        } else if (showBudget) {
          const budgetMsg: BudgetMessage = {
            type: 'budget_card',
            message: response,
          };
          await saveAssistantMessage(JSON.stringify(budgetMsg));
        } else {
          await saveAssistantMessage(response);
        }
      } else {
        await saveAssistantMessage(response);
      }
      setLastFailedMessage(null);
      await triggerHaptic('success');

      // Show success toast
      showToast({
        type: 'success',
        message: 'Message sent successfully!',
        duration: 2000,
      });
    } catch (error) {
      console.error('Retry failed:', error);
      await triggerHaptic('error');

      const appError = parseError(error);
      showError(appError, handleRetry);
    } finally {
      setIsTyping(false);
    }
  };

  const loading = agentLoading || messagesLoading || memoriesLoading;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <Slime color="mint" type="base" size="small" animated />
        <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Custom Header - Animated */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + spacing.md, backgroundColor: `${themeColors.surface}F2` }, headerAnimatedStyle]}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            router.back();
          }}
          style={[styles.backButton, { backgroundColor: themeColors.background }]}
        >
          <Text style={[styles.backButtonText, { color: themeColors.text }]}>‹</Text>
        </Pressable>
        <Pressable
          style={styles.headerCenter}
          onPress={() => {
            triggerHaptic('light');
            router.push(`/settings/${id}`);
          }}
        >
          <AgentSlime agent={agent} size={40} />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: themeColors.text }]}>{agent?.name || 'Slime'}</Text>
            <Text style={[styles.headerStatus, { color: themeColors.textMuted }, isTyping && styles.headerStatusTyping]}>
              {isTyping ? 'Typing...' : 'Online'}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            router.push(`/settings/${id}`);
          }}
          style={[styles.settingsButton, { backgroundColor: themeColors.background }]}
        >
          <Text style={[styles.settingsButtonText, { color: themeColors.textMuted }]}>⚙</Text>
        </Pressable>
      </Animated.View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingTop: HEADER_HEIGHT + spacing.md },
          messages.length === 0 && !isTyping && styles.messagesContentEmpty,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={HEADER_HEIGHT}
            colors={[themeColors.primary]}
            tintColor={themeColors.primary}
          />
        }
      >
        {messagesLoading ? (
          <ChatSkeleton />
        ) : messages.length === 0 && !isTyping ? (
          <NoMessagesEmptyState />
        ) : (
          <>
            {/* Load More Button */}
            {hasMore && (
              <Pressable
                style={[
                  styles.loadMoreButton,
                  { backgroundColor: themeColors.surface },
                  loadingMore && styles.loadMoreButtonDisabled,
                ]}
                onPress={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={themeColors.primary} />
                ) : (
                  <>
                    <Ionicons name="chevron-up" size={16} color={themeColors.textMuted} />
                    <Text style={[styles.loadMoreText, { color: themeColors.textMuted }]}>
                      Load older messages
                    </Text>
                  </>
                )}
              </Pressable>
            )}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                agent={agent}
                isError={msg.id === errorMessageId}
                onRetry={msg.id === errorMessageId ? handleRetry : undefined}
                billsData={isFinanceAgent ? {
                  bills: bills.bills,
                  monthlyTotal: bills.billsTotal?.monthlyTotal || 0,
                  subscriptionsTotal: bills.billsTotal?.subscriptionsTotal || 0,
                } : undefined}
                onAddBill={handleAddBillPress}
                onPayBill={handlePayBill}
                onViewBill={handleViewBill}
                weeklySummaryData={isFinanceAgent && finance.weeklyBudget ? {
                  period: 'week' as const,
                  periodLabel: 'This Week',
                  totalSpent: finance.weeklyBudget.totalSpent,
                  totalIncome: finance.weeklyBudget.totalIncome,
                  transactionCount: finance.weeklyBudget.expenseCount + finance.weeklyBudget.incomeCount,
                  byCategory: Object.entries(finance.weeklyBudget.byCategory || {}).map(([category, amount]) => ({
                    category,
                    amount: amount as number,
                  })),
                  dailyAverage: finance.weeklyBudget.dailyAverage,
                  budgetUsed: (() => {
                    // For weekly, calculate percentage of weekly budget (monthly / ~4.3)
                    const tracking = finance.budgetTracking;
                    const totalSpent = finance.weeklyBudget.totalSpent || 0;

                    if (tracking && tracking.monthlyIncome > 0) {
                      const weeklyBudget = (tracking.needsBudget + tracking.wantsBudget) / 4.33;
                      if (weeklyBudget > 0) {
                        return (totalSpent / weeklyBudget) * 100;
                      }
                    }

                    if (finance.weeklyBudget.totalIncome > 0) {
                      return (totalSpent / finance.weeklyBudget.totalIncome) * 100;
                    }

                    return undefined;
                  })(),
                } : undefined}
                monthlySummaryData={isFinanceAgent && finance.monthlyBudget ? {
                  period: 'month' as const,
                  periodLabel: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                  totalSpent: finance.monthlyBudget.totalSpent,
                  totalIncome: finance.monthlyBudget.totalIncome,
                  transactionCount: finance.monthlyBudget.expenseCount + finance.monthlyBudget.incomeCount,
                  byCategory: Object.entries(finance.monthlyBudget.byCategory || {}).map(([category, amount]) => ({
                    category,
                    amount: amount as number,
                  })),
                  dailyAverage: finance.budgetTracking?.todaySpent || 0,
                  budgetUsed: (() => {
                    const tracking = finance.budgetTracking;
                    const totalSpent = finance.monthlyBudget.totalSpent || 0;

                    if (tracking && tracking.monthlyIncome > 0) {
                      const spendableBudget = tracking.needsBudget + tracking.wantsBudget;
                      if (spendableBudget > 0) {
                        return (totalSpent / spendableBudget) * 100;
                      }
                    }

                    if (finance.monthlyBudget.totalIncome > 0) {
                      return (totalSpent / finance.monthlyBudget.totalIncome) * 100;
                    }

                    return undefined;
                  })(),
                } : undefined}
                goalsData={isFinanceAgent ? finance.savingsGoals : undefined}
                onAddGoal={() => setShowAddSavingsGoalSheet(true)}
                onViewGoal={handleViewSavingsGoal}
                budgetData={isFinanceAgent && finance.budgetTracking ? {
                  totalBudget: finance.budgetTracking.needsBudget + finance.budgetTracking.wantsBudget,
                  totalSpent: finance.budgetTracking.needsSpent + finance.budgetTracking.wantsSpent,
                  totalRemaining: finance.budgetTracking.needsRemaining + finance.budgetTracking.wantsRemaining,
                  dailySafeSpend: finance.budgetTracking.dailySafeSpend,
                  daysLeft: finance.budgetTracking.daysLeftInMonth,
                  needsBudget: finance.budgetTracking.needsBudget,
                  needsSpent: finance.budgetTracking.needsSpent,
                  wantsBudget: finance.budgetTracking.wantsBudget,
                  wantsSpent: finance.budgetTracking.wantsSpent,
                  savingsBudget: finance.budgetTracking.savingsBudget,
                  savingsAllocated: finance.budgetTracking.savingsAllocated,
                  categoryExpenses: Object.entries(finance.monthlyBudget?.byCategory || {}).map(([category, amount]) => ({
                    category,
                    amount: amount as number,
                    budgetType: (['rent', 'bills', 'groceries', 'transport', 'health'].includes(category) ? 'needs' : 'wants') as 'needs' | 'wants' | 'savings',
                  })),
                  savingsGoals: finance.savingsGoals.map(g => ({
                    id: g.id,
                    name: g.name,
                    icon: g.icon,
                    allocated: g.current_amount,
                    target: g.target_amount,
                  })),
                  billsPaid: [],
                } : undefined}
                onCategoryPress={handleCategoryPress}
                onSavingsGoalPress={(goalId) => {
                  const goal = finance.savingsGoals.find(g => g.id === goalId);
                  if (goal) handleViewSavingsGoal(goal);
                }}
                currencySymbol={getCurrencySymbol()}
                todaySpent={isFinanceAgent ? finance.budgetTracking?.todaySpent : undefined}
                categoryBudgets={isFinanceAgent && finance.monthlyBudget?.byCategory ?
                  Object.entries(finance.monthlyBudget.byCategory).reduce((acc, [category, spent]) => {
                    // Simple budget estimate: 10% of needs budget for needs categories, 10% of wants for wants
                    const isNeeds = ['rent', 'bills', 'groceries', 'transport', 'health'].includes(category);
                    const budget = isNeeds
                      ? (finance.budgetTracking?.needsBudget || 0) * 0.15
                      : (finance.budgetTracking?.wantsBudget || 0) * 0.2;
                    acc[category] = {
                      spent: spent as number,
                      budget: budget,
                      remaining: budget - (spent as number),
                    };
                    return acc;
                  }, {} as Record<string, { spent: number; budget: number; remaining: number }>)
                : undefined}
                savingsGoalsForAllocation={isFinanceAgent ? finance.savingsGoals.map(g => ({
                  id: g.id,
                  name: g.name,
                  icon: g.icon,
                })) : undefined}
                onAllocateToSavings={handleAddFundsToGoal}
              />
            ))}
            {isTyping && <TypingIndicator agent={agent} />}
            {mealLogging.analyzing && <AnalyzingIndicator agent={agent} />}
          </>
        )}
      </ScrollView>

      {/* Pending Meal Analysis Modal */}
      {mealLogging.pendingMeal && (
        <MealAnalysisBubble
          visible={true}
          photoUrl={mealLogging.pendingMeal.photoUrl}
          analysis={mealLogging.pendingMeal.analysis}
          onConfirm={handleConfirmMeal}
          onCancel={handleCancelMeal}
          isConfirming={mealLogging.saving}
          isConfirmed={confirmedMealId === mealLogging.pendingMeal.photoUrl}
        />
      )}

      {/* Daily Progress after confirming meal, logging water, or logging workout - Only for fitness agents */}
      {!isFinanceAgent && mealLogging.todayNutrition && (
        mealLogging.todayNutrition.meal_count > 0 ||
        (mealLogging.todayNutrition.total_water_ml || 0) > 0 ||
        (mealLogging.todayNutrition.workouts_count || 0) > 0 ||
        workoutLogging.todayWorkouts.length > 0
      ) && !mealLogging.pendingMeal && (
        <View style={[styles.dailyProgressContainer, { backgroundColor: themeColors.background }]}>
          <DailyProgressCard
            nutrition={mealLogging.todayNutrition}
            goals={(agent?.persona_json as Record<string, any>)?.nutritionGoals}
            waterGoalMl={waterLogging.waterGoalMl}
            showWaterAsGlasses={waterLogging.showAsGlasses}
            todayWorkout={workoutLogging.todayWorkouts[workoutLogging.todayWorkouts.length - 1] || null}
          />
        </View>
      )}

      {/* Finance Progress - Only for finance agents */}
      {isFinanceAgent && (finance.todayFinance || finance.monthlyBudget || finance.budgetTracking) && (
        <View style={[styles.dailyProgressContainer, { backgroundColor: themeColors.background }]}>
          <FinanceProgressCard
            todayFinance={finance.todayFinance}
            monthlyBudget={finance.monthlyBudget}
            budgetTracking={finance.budgetTracking}
            savingsGoals={finance.savingsGoals}
            currencySymbol={getCurrencySymbol()}
            monthlyBudgetTarget={(agent?.persona_json as Record<string, any>)?.monthlyBudget}
          />
        </View>
      )}

      {/* Weekly Summary Card */}
      {showWeeklySummary && weeklySummary.summary && (
        <WeeklySummaryCard
          summary={weeklySummary.summary}
          isCurrentWeek={weeklySummary.getWeekDates().isCurrentWeek}
          onDismiss={() => setShowWeeklySummary(false)}
        />
      )}

      {/* Floating "New messages" button */}
      {showNewMessages && (
        <Pressable
          style={({ pressed }) => [
            styles.newMessagesButton,
            { backgroundColor: themeColors.text },
            pressed && styles.newMessagesButtonPressed,
          ]}
          onPress={scrollToBottom}
        >
          <Text style={[styles.newMessagesText, { color: themeColors.background }]}>New messages</Text>
          <Ionicons name="arrow-down" size={14} color={themeColors.background} />
        </Pressable>
      )}

      {/* Quick Replies - contextual suggestions */}
      {quickReplies.length > 0 && !isTyping && !mealLogging.pendingMeal && (
        <QuickReplies replies={quickReplies} onSelect={handleQuickReply} />
      )}

      {/* Quick Actions Bar - toggleable */}
      <QuickActionsBar actions={quickActions} visible={showQuickActions} />

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: themeColors.surface }]}>
        {/* Quick actions toggle button */}
        <Pressable
          style={({ pressed }) => [
            styles.toggleButton,
            { backgroundColor: themeColors.background },
            pressed && styles.toggleButtonPressed,
            showQuickActions && { backgroundColor: themeColors.primary },
          ]}
          onPress={toggleQuickActions}
        >
          <Animated.View style={toggleButtonStyle}>
            <Ionicons
              name="add"
              size={24}
              color={showQuickActions ? '#101914' : themeColors.text}
            />
          </Animated.View>
        </Pressable>

        <TextInput
          style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={themeColors.textMuted}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
          multiline
          maxLength={1000}
          editable={!isTyping}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: themeColors.primary },
            (!inputText.trim() || sending || isTyping) && { backgroundColor: themeColors.background },
            pressed && inputText.trim() && !sending && !isTyping && styles.sendButtonPressed,
          ]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || sending || isTyping}
        >
          {sending ? (
            <ActivityIndicator size="small" color={themeColors.text} />
          ) : (
            <Text style={[styles.sendButtonText, { color: themeColors.text }]}>↑</Text>
          )}
        </Pressable>
      </View>

      {/* Photo Options Sheet */}
      <PhotoOptionsSheet
        visible={showPhotoOptions}
        onClose={() => setShowPhotoOptions(false)}
        onCamera={handleTakePhoto}
        onLibrary={handlePickFromLibrary}
      />

      {/* Water Amount Sheet */}
      <WaterAmountSheet
        visible={showWaterSheet}
        onClose={() => setShowWaterSheet(false)}
        onSelect={handleWaterAmountSelect}
        currentTotalMl={waterLogging.todayWaterMl}
        goalMl={waterLogging.waterGoalMl}
      />

      {/* Log Expense Sheet */}
      <LogExpenseSheet
        visible={showExpenseSheet}
        onClose={() => setShowExpenseSheet(false)}
        onLog={handleLogExpense}
        currencySymbol={getCurrencySymbol()}
      />

      {/* Add Income Sheet */}
      <AddIncomeSheet
        visible={showIncomeSheet}
        onClose={() => setShowIncomeSheet(false)}
        onLog={handleLogIncome}
        currencySymbol={getCurrencySymbol()}
      />

      {/* Log Action Sheet (grouped Log button menu) */}
      <LogActionSheet
        visible={showLogActionSheet}
        onClose={() => setShowLogActionSheet(false)}
        onLogExpense={() => setShowExpenseSheet(true)}
        onLogIncome={() => setShowIncomeSheet(true)}
        onAddBill={() => setShowBillSheet(true)}
        onScanReceipt={() => {
          // Coming soon - for now show toast
          showToast({
            type: 'info',
            message: 'Receipt scanning coming soon!',
            duration: 2000,
          });
        }}
      />

      {/* Add Bill Sheet */}
      <AddBillSheet
        visible={showBillSheet}
        onClose={() => setShowBillSheet(false)}
        onAdd={handleAddBill}
        currencySymbol={getCurrencySymbol()}
      />

      {/* Edit Bill Sheet */}
      <EditBillSheet
        visible={showEditBillSheet}
        onClose={() => {
          setShowEditBillSheet(false);
          setSelectedBill(null);
        }}
        onSave={handleSaveBill}
        onDelete={handleDeleteBill}
        bill={selectedBill}
        currencySymbol={getCurrencySymbol()}
      />

      {/* Category Expenses Sheet */}
      <CategoryExpensesSheet
        visible={showCategorySheet}
        onClose={() => {
          setShowCategorySheet(false);
          setSelectedCategory(null);
          setCategoryExpenses([]);
        }}
        category={selectedCategory || ''}
        expenses={categoryExpenses}
        currencySymbol={getCurrencySymbol()}
      />

      {/* Add Savings Goal Sheet */}
      <AddSavingsGoalSheet
        visible={showAddSavingsGoalSheet}
        onClose={() => setShowAddSavingsGoalSheet(false)}
        onAdd={handleAddSavingsGoal}
        currencySymbol={getCurrencySymbol()}
      />

      {/* Edit Savings Goal Sheet */}
      <EditSavingsGoalSheet
        visible={showEditSavingsGoalSheet}
        onClose={() => {
          setShowEditSavingsGoalSheet(false);
          setSelectedSavingsGoal(null);
        }}
        goal={selectedSavingsGoal}
        onAddFunds={handleAddFundsToGoal}
        onEdit={handleEditSavingsGoal}
        onDelete={handleDeleteSavingsGoal}
        currencySymbol={getCurrencySymbol()}
      />

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
  // Load More Button
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  loadMoreButtonDisabled: {
    opacity: 0.6,
  },
  loadMoreText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  // Header - with soft shadow and blur effect
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: `${colors.surface}F2`, // 95% opacity for blur effect
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: spacing.md,
  },
  headerInfo: {
    marginLeft: spacing.md,
  },
  headerName: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerStatus: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginTop: 2,
  },
  headerStatusTyping: {
    color: colors.primary,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
    color: colors.textMuted,
  },
  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  messagesContentEmpty: {
    flex: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  agentMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarSmall: {
    marginRight: spacing.sm,
  },
  // Meal analysis card wrapper
  mealAnalysisWrapper: {
    maxWidth: '85%',
  },
  // Bills card wrapper
  billsCardWrapper: {
    maxWidth: '90%',
    flex: 1,
  },
  cardTimestamp: {
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  // Message bubbles - rounded-2xl with soft shadows
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 20,
  },
  agentBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
    marginLeft: 'auto',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  errorBubble: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFD4D4',
    borderWidth: 1,
    shadowOpacity: 0,
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 22,
  },
  errorText: {
    color: '#C0392B',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    opacity: 0.7,
  },
  errorTimestamp: {
    color: '#E74C3C',
  },
  retryButton: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  // Typing indicator
  typingBubble: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    marginHorizontal: 3,
  },
  // Analyzing indicator
  analyzingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  analyzingText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  // Input area - white card with subtle shadow
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.md,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    maxHeight: 120,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: colors.background,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.96 }],
  },
  sendButtonText: {
    fontSize: 22,
    color: colors.text,
    fontFamily: fonts.bold,
  },
  // Toggle button for quick actions
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  toggleButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  // Daily progress container
  dailyProgressContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  // New messages button - floating pill
  newMessagesButton: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  newMessagesButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  newMessagesText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.surface,
  },
  });
