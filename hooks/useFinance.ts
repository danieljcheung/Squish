import { useState, useCallback, useEffect, useMemo } from 'react';
import { Agent } from '@/types';
import {
  createExpense,
  createIncome,
  getTodayExpenses,
  getTodayFinance,
  getMonthlyBudgetSummary,
  getWeeklyBudgetSummary,
  getSavingsGoals,
  createSavingsGoal,
  addSavingsContribution,
  deleteSavingsGoal,
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  getMonthExpenses,
  getMonthIncome,
  ExpenseInsert,
  IncomeInsert,
  SavingsGoalInsert,
  WishlistItemInsert,
} from '@/lib/supabase';

// Category to budget type mapping
export type BudgetType = 'needs' | 'wants' | 'savings';

export const CATEGORY_BUDGET_TYPE: Record<string, BudgetType> = {
  // NEEDS (50%)
  rent: 'needs',
  bills: 'needs',
  groceries: 'needs',
  transport: 'needs',
  health: 'needs',
  // WANTS (30%)
  food: 'wants', // Food & Dining (eating out)
  entertainment: 'wants',
  shopping: 'wants',
  subscriptions: 'wants',
  travel: 'wants',
  // OTHER - will prompt user
  other: 'wants', // Default to wants
};

// Get budget type for a category
export function getCategoryBudgetType(category: string): BudgetType {
  return CATEGORY_BUDGET_TYPE[category.toLowerCase()] || 'wants';
}

export interface DailyFinance {
  id: string;
  agent_id: string;
  date: string;
  total_spent: number;
  total_income: number;
  expense_count: number;
  income_count: number;
  updated_at: string;
}

export interface Expense {
  id: string;
  agent_id: string;
  amount: number;
  currency: string;
  category: string;
  description?: string;
  expense_date: string;
  created_at: string;
}

export interface Income {
  id: string;
  agent_id: string;
  amount: number;
  currency: string;
  category: string;
  description?: string;
  income_date: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  agent_id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  auto_allocate_percentage: number;
  created_at: string;
  completed_at?: string;
}

export interface WishlistItem {
  id: string;
  agent_id: string;
  name: string;
  estimated_cost: number;
  notes?: string;
  created_at: string;
}

export interface MonthlyBudget {
  totalSpent: number;
  totalIncome: number;
  remaining: number;
  expenseCount: number;
  incomeCount: number;
  byCategory: Record<string, number>;
}

export interface WeeklyBudget {
  totalSpent: number;
  totalIncome: number;
  remaining: number;
  expenseCount: number;
  incomeCount: number;
  byCategory: Record<string, number>;
  dailyAverage: number;
}

// Extended budget tracking
export interface BudgetTracking {
  // Budget allocations from persona
  monthlyIncome: number;
  budgetSplit: { needs: number; wants: number; savings: number };

  // Calculated budget amounts
  needsBudget: number;
  wantsBudget: number;
  savingsBudget: number;

  // Spending by budget type
  needsSpent: number;
  wantsSpent: number;
  savingsAllocated: number;

  // Remaining
  needsRemaining: number;
  wantsRemaining: number;
  savingsRemaining: number;

  // Percentages used
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;

  // Daily safe spend
  daysLeftInMonth: number;
  dailySafeSpend: number;
  todaySpent: number;
  todayRemaining: number;

  // Alert thresholds
  needsAlertLevel: 'ok' | 'warning' | 'danger' | 'over';
  wantsAlertLevel: 'ok' | 'warning' | 'danger' | 'over';

  // Helper
  currencySymbol: string;
}

// Calculate alert level based on percentage
function getAlertLevel(percent: number): 'ok' | 'warning' | 'danger' | 'over' {
  if (percent >= 100) return 'over';
  if (percent >= 80) return 'danger';
  if (percent >= 50) return 'warning';
  return 'ok';
}

// Get days remaining in current month
function getDaysLeftInMonth(): number {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return lastDay.getDate() - today.getDate() + 1; // Include today
}

interface UseFinanceReturn {
  // State
  todayFinance: DailyFinance | null;
  todayExpenses: Expense[];
  monthlyBudget: MonthlyBudget | null;
  weeklyBudget: WeeklyBudget | null;
  budgetTracking: BudgetTracking | null;
  savingsGoals: SavingsGoal[];
  wishlist: WishlistItem[];
  loading: boolean;
  error: string | null;

  // Actions
  logExpense: (expense: {
    amount: number;
    category: string;
    description?: string;
  }) => Promise<Expense | null>;
  logIncome: (income: {
    amount: number;
    category: string;
    description?: string;
  }) => Promise<Income | null>;
  addGoal: (goal: {
    name: string;
    icon?: string;
    targetAmount: number;
    targetDate?: string;
  }) => Promise<SavingsGoal | null>;
  contributeToGoal: (goalId: string, amount: number) => Promise<boolean>;
  removeGoal: (goalId: string) => Promise<boolean>;
  addToWishlist: (item: {
    name: string;
    estimatedCost: number;
    notes?: string;
  }) => Promise<WishlistItem | null>;
  removeFromWishlist: (itemId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useFinance(agent: Agent | null): UseFinanceReturn {
  const [todayFinance, setTodayFinance] = useState<DailyFinance | null>(null);
  const [todayExpenses, setTodayExpenses] = useState<Expense[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<MonthlyBudget | null>(null);
  const [weeklyBudget, setWeeklyBudget] = useState<WeeklyBudget | null>(null);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get currency from agent persona
  const getCurrency = useCallback(() => {
    const persona = agent?.persona_json as Record<string, unknown> | undefined;
    return (persona?.currency as string) || 'CAD';
  }, [agent]);

  // Refresh all finance data
  const refresh = useCallback(async () => {
    if (!agent?.id) return;

    setLoading(true);
    setError(null);

    try {
      const [todayResult, expensesResult, budgetResult, weeklyResult, goalsResult, wishlistResult] =
        await Promise.all([
          getTodayFinance(agent.id),
          getTodayExpenses(agent.id),
          getMonthlyBudgetSummary(agent.id),
          getWeeklyBudgetSummary(agent.id),
          getSavingsGoals(agent.id),
          getWishlist(agent.id),
        ]);

      if (todayResult.data) {
        setTodayFinance(todayResult.data as DailyFinance);
      }

      if (expensesResult.data) {
        setTodayExpenses(expensesResult.data as Expense[]);
      }

      if (budgetResult.data) {
        setMonthlyBudget(budgetResult.data);
      }

      if (weeklyResult.data) {
        setWeeklyBudget(weeklyResult.data as WeeklyBudget);
      }

      if (goalsResult.data) {
        setSavingsGoals(goalsResult.data as SavingsGoal[]);
      }

      if (wishlistResult.data) {
        setWishlist(wishlistResult.data as WishlistItem[]);
      }
    } catch (err) {
      console.error('Failed to fetch finance data:', err);
      setError('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  // Load finance data on agent change
  useEffect(() => {
    if (agent?.id) {
      refresh();
    }
  }, [agent?.id, refresh]);

  // Log an expense
  const logExpense = useCallback(
    async (expense: { amount: number; category: string; description?: string }): Promise<Expense | null> => {
      if (!agent?.id) {
        setError('No agent selected');
        return null;
      }

      try {
        const expenseData: ExpenseInsert = {
          agent_id: agent.id,
          amount: expense.amount,
          currency: getCurrency(),
          category: expense.category,
          description: expense.description,
        };

        const { data, error: insertError } = await createExpense(expenseData);

        if (insertError) {
          console.error('Failed to log expense:', insertError);
          setError('Failed to log expense');
          return null;
        }

        // Refresh data
        await refresh();

        return data as Expense;
      } catch (err) {
        console.error('Failed to log expense:', err);
        setError('Failed to log expense');
        return null;
      }
    },
    [agent?.id, getCurrency, refresh]
  );

  // Log income
  const logIncome = useCallback(
    async (income: { amount: number; category: string; description?: string }): Promise<Income | null> => {
      if (!agent?.id) {
        setError('No agent selected');
        return null;
      }

      try {
        const incomeData: IncomeInsert = {
          agent_id: agent.id,
          amount: income.amount,
          currency: getCurrency(),
          category: income.category,
          description: income.description,
        };

        const { data, error: insertError } = await createIncome(incomeData);

        if (insertError) {
          console.error('Failed to log income:', insertError);
          setError('Failed to log income');
          return null;
        }

        // Refresh data
        await refresh();

        return data as Income;
      } catch (err) {
        console.error('Failed to log income:', err);
        setError('Failed to log income');
        return null;
      }
    },
    [agent?.id, getCurrency, refresh]
  );

  // Add a savings goal
  const addGoal = useCallback(
    async (goal: {
      name: string;
      icon?: string;
      targetAmount: number;
      targetDate?: string;
    }): Promise<SavingsGoal | null> => {
      if (!agent?.id) {
        setError('No agent selected');
        return null;
      }

      try {
        const goalData: SavingsGoalInsert = {
          agent_id: agent.id,
          name: goal.name,
          icon: goal.icon,
          target_amount: goal.targetAmount,
          target_date: goal.targetDate,
        };

        const { data, error: insertError } = await createSavingsGoal(goalData);

        if (insertError) {
          console.error('Failed to create goal:', insertError);
          setError(insertError.message || 'Failed to create goal');
          return null;
        }

        // Refresh data
        await refresh();

        return data as SavingsGoal;
      } catch (err) {
        console.error('Failed to create goal:', err);
        setError('Failed to create goal');
        return null;
      }
    },
    [agent?.id, refresh]
  );

  // Contribute to a savings goal
  const contributeToGoal = useCallback(
    async (goalId: string, amount: number): Promise<boolean> => {
      try {
        const { error: updateError } = await addSavingsContribution(goalId, amount);

        if (updateError) {
          console.error('Failed to contribute to goal:', updateError);
          setError('Failed to contribute to goal');
          return false;
        }

        // Refresh data
        await refresh();

        return true;
      } catch (err) {
        console.error('Failed to contribute to goal:', err);
        setError('Failed to contribute to goal');
        return false;
      }
    },
    [refresh]
  );

  // Remove a savings goal
  const removeGoal = useCallback(
    async (goalId: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await deleteSavingsGoal(goalId);

        if (deleteError) {
          console.error('Failed to delete goal:', deleteError);
          setError('Failed to delete goal');
          return false;
        }

        // Refresh data
        await refresh();

        return true;
      } catch (err) {
        console.error('Failed to delete goal:', err);
        setError('Failed to delete goal');
        return false;
      }
    },
    [refresh]
  );

  // Add to wishlist
  const addToWishlist = useCallback(
    async (item: {
      name: string;
      estimatedCost: number;
      notes?: string;
    }): Promise<WishlistItem | null> => {
      if (!agent?.id) {
        setError('No agent selected');
        return null;
      }

      try {
        const itemData: WishlistItemInsert = {
          agent_id: agent.id,
          name: item.name,
          estimated_cost: item.estimatedCost,
          notes: item.notes,
        };

        const { data, error: insertError } = await addWishlistItem(itemData);

        if (insertError) {
          console.error('Failed to add to wishlist:', insertError);
          setError('Failed to add to wishlist');
          return null;
        }

        // Refresh data
        await refresh();

        return data as WishlistItem;
      } catch (err) {
        console.error('Failed to add to wishlist:', err);
        setError('Failed to add to wishlist');
        return null;
      }
    },
    [agent?.id, refresh]
  );

  // Remove from wishlist
  const removeFromWishlist = useCallback(
    async (itemId: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await removeWishlistItem(itemId);

        if (deleteError) {
          console.error('Failed to remove from wishlist:', deleteError);
          setError('Failed to remove from wishlist');
          return false;
        }

        // Refresh data
        await refresh();

        return true;
      } catch (err) {
        console.error('Failed to remove from wishlist:', err);
        setError('Failed to remove from wishlist');
        return false;
      }
    },
    [refresh]
  );

  // Calculate comprehensive budget tracking
  const budgetTracking = useMemo((): BudgetTracking | null => {
    if (!agent) return null;

    const persona = agent.persona_json as Record<string, any>;
    const monthlyIncome = persona?.monthly_income || 0;
    const budgetSplit = persona?.budget_split || { needs: 50, wants: 30, savings: 20 };
    const currencySymbol = persona?.currency_symbol || '$';

    // Calculate budget amounts
    const needsBudget = (monthlyIncome * budgetSplit.needs) / 100;
    const wantsBudget = (monthlyIncome * budgetSplit.wants) / 100;
    const savingsBudget = (monthlyIncome * budgetSplit.savings) / 100;

    // Calculate spending by budget type from monthly expenses
    let needsSpent = 0;
    let wantsSpent = 0;

    if (monthlyBudget?.byCategory) {
      for (const [category, amount] of Object.entries(monthlyBudget.byCategory)) {
        const budgetType = getCategoryBudgetType(category);
        if (budgetType === 'needs') {
          needsSpent += amount;
        } else if (budgetType === 'wants') {
          wantsSpent += amount;
        }
      }
    }

    // Calculate savings allocated (from savings goals contributions)
    const savingsAllocated = savingsGoals.reduce(
      (sum, goal) => sum + (goal.current_amount || 0),
      0
    );

    // Calculate remaining
    const needsRemaining = needsBudget - needsSpent;
    const wantsRemaining = wantsBudget - wantsSpent;
    const savingsRemaining = savingsBudget - savingsAllocated;

    // Calculate percentages
    const needsPercent = needsBudget > 0 ? (needsSpent / needsBudget) * 100 : 0;
    const wantsPercent = wantsBudget > 0 ? (wantsSpent / wantsBudget) * 100 : 0;
    const savingsPercent = savingsBudget > 0 ? (savingsAllocated / savingsBudget) * 100 : 0;

    // Daily safe spend calculation
    const daysLeftInMonth = getDaysLeftInMonth();
    const totalRemaining = needsRemaining + wantsRemaining;
    const dailySafeSpend = daysLeftInMonth > 0 ? totalRemaining / daysLeftInMonth : 0;

    const todaySpent = todayFinance?.total_spent || 0;
    const todayRemaining = Math.max(0, dailySafeSpend - todaySpent);

    return {
      monthlyIncome,
      budgetSplit,
      needsBudget,
      wantsBudget,
      savingsBudget,
      needsSpent,
      wantsSpent,
      savingsAllocated,
      needsRemaining,
      wantsRemaining,
      savingsRemaining,
      needsPercent,
      wantsPercent,
      savingsPercent,
      daysLeftInMonth,
      dailySafeSpend,
      todaySpent,
      todayRemaining,
      needsAlertLevel: getAlertLevel(needsPercent),
      wantsAlertLevel: getAlertLevel(wantsPercent),
      currencySymbol,
    };
  }, [agent, monthlyBudget, savingsGoals, todayFinance]);

  return {
    todayFinance,
    todayExpenses,
    monthlyBudget,
    weeklyBudget,
    budgetTracking,
    savingsGoals,
    wishlist,
    loading,
    error,
    logExpense,
    logIncome,
    addGoal,
    contributeToGoal,
    removeGoal,
    addToWishlist,
    removeFromWishlist,
    refresh,
  };
}
