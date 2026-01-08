import { useCallback, useMemo } from 'react';
import { Agent } from '@/types';
import { getMonthExpenses, getMonthIncome, getTodayExpenses } from '@/lib/supabase';
import { EXPENSE_CATEGORIES } from '@/components/ui/LogExpenseSheet';
import { getCategoryBudgetType, BudgetTracking } from './useFinance';

export interface DailySummary {
  date: string;
  totalSpent: number;
  expenseCount: number;
  topCategory: { id: string; name: string; icon: string; amount: number } | null;
  expenses: Array<{
    id: string;
    amount: number;
    category: string;
    categoryIcon: string;
    description?: string;
    time: string;
  }>;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalSpent: number;
  vsLastWeek: { amount: number; percentChange: number } | null;
  byCategory: Array<{ id: string; name: string; icon: string; amount: number }>;
  needsSpent: number;
  wantsSpent: number;
  needsPercent: number;
  wantsPercent: number;
  dailyAverage: number;
  topSpendingDay: { date: string; amount: number } | null;
  insight: string | null;
}

export interface MonthlySummary {
  month: string;
  monthName: string;
  totalSpent: number;
  totalIncome: number;
  netSavings: number;
  needsSpent: number;
  needsBudget: number;
  needsPercent: number;
  wantsSpent: number;
  wantsBudget: number;
  wantsPercent: number;
  savingsAllocated: number;
  savingsBudget: number;
  savingsPercent: number;
  byCategory: Array<{ id: string; name: string; icon: string; amount: number }>;
  topCategories: Array<{ id: string; name: string; icon: string; amount: number }>;
  daysUnderBudget: number;
  daysOverBudget: number;
  bestDay: { date: string; amount: number } | null;
  worstDay: { date: string; amount: number } | null;
  vsLastMonth: { spentDiff: number; percentChange: number } | null;
  insights: string[];
}

// Helper to format date for display
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper to get week boundaries
function getWeekBoundaries(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day); // Sunday
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Saturday
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// Helper to get month name
function getMonthName(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long' });
}

// Helper to find category details
function getCategoryDetails(categoryId: string): { name: string; icon: string } {
  const category = EXPENSE_CATEGORIES.find(c => c.id === categoryId);
  return {
    name: category?.name || categoryId,
    icon: category?.icon || '📦',
  };
}

export function useFinanceSummary(agent: Agent | null, budgetTracking: BudgetTracking | null) {
  const currencySymbol = budgetTracking?.currencySymbol || '$';

  // Generate daily summary
  const generateDailySummary = useCallback(async (date: Date = new Date()): Promise<DailySummary | null> => {
    if (!agent?.id) return null;

    const dateStr = date.toISOString().split('T')[0];
    const { data: expenses, error } = await getTodayExpenses(agent.id);

    if (error || !expenses) return null;

    // Filter for the specific date
    const dayExpenses = expenses.filter(e => e.expense_date === dateStr);

    // Calculate totals
    const totalSpent = dayExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const expenseCount = dayExpenses.length;

    // Get top category
    const byCategory: Record<string, number> = {};
    for (const expense of dayExpenses) {
      const cat = expense.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + parseFloat(expense.amount);
    }

    const topCategoryId = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    const topCategory = topCategoryId
      ? {
          id: topCategoryId,
          ...getCategoryDetails(topCategoryId),
          amount: byCategory[topCategoryId],
        }
      : null;

    // Format expenses
    const formattedExpenses = dayExpenses.map(e => ({
      id: e.id,
      amount: parseFloat(e.amount),
      category: e.category || 'other',
      categoryIcon: getCategoryDetails(e.category || 'other').icon,
      description: e.description,
      time: new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    return {
      date: dateStr,
      totalSpent,
      expenseCount,
      topCategory,
      expenses: formattedExpenses,
    };
  }, [agent?.id]);

  // Generate weekly summary
  const generateWeeklySummary = useCallback(async (weekOffset: number = 0): Promise<WeeklySummary | null> => {
    if (!agent?.id || !budgetTracking) return null;

    const today = new Date();
    today.setDate(today.getDate() - (weekOffset * 7));
    const { start, end } = getWeekBoundaries(today);

    const { data: expenses, error } = await getMonthExpenses(agent.id);
    if (error || !expenses) return null;

    // Filter for this week
    const weekExpenses = expenses.filter(e => {
      const expDate = new Date(e.expense_date);
      return expDate >= start && expDate <= end;
    });

    // Calculate totals
    const totalSpent = weekExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // By category
    const byCategory: Record<string, number> = {};
    let needsSpent = 0;
    let wantsSpent = 0;

    for (const expense of weekExpenses) {
      const cat = expense.category || 'other';
      const amount = parseFloat(expense.amount);
      byCategory[cat] = (byCategory[cat] || 0) + amount;

      const budgetType = getCategoryBudgetType(cat);
      if (budgetType === 'needs') needsSpent += amount;
      else if (budgetType === 'wants') wantsSpent += amount;
    }

    const categoryList = Object.entries(byCategory)
      .map(([id, amount]) => ({
        id,
        ...getCategoryDetails(id),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Daily breakdown for top spending day
    const byDay: Record<string, number> = {};
    for (const expense of weekExpenses) {
      const day = expense.expense_date;
      byDay[day] = (byDay[day] || 0) + parseFloat(expense.amount);
    }

    const topSpendingDayEntry = Object.entries(byDay)
      .sort((a, b) => b[1] - a[1])[0];
    const topSpendingDay = topSpendingDayEntry
      ? { date: topSpendingDayEntry[0], amount: topSpendingDayEntry[1] }
      : null;

    // Weekly budget percentages (weekly = monthly / 4 approximately)
    const weeklyNeedsBudget = budgetTracking.needsBudget / 4;
    const weeklyWantsBudget = budgetTracking.wantsBudget / 4;

    const needsPercent = weeklyNeedsBudget > 0 ? (needsSpent / weeklyNeedsBudget) * 100 : 0;
    const wantsPercent = weeklyWantsBudget > 0 ? (wantsSpent / weeklyWantsBudget) * 100 : 0;

    // Calculate vs last week (if weekOffset is 0)
    let vsLastWeek = null;
    if (weekOffset === 0) {
      const lastWeekStart = new Date(start);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(end);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

      const lastWeekExpenses = expenses.filter(e => {
        const expDate = new Date(e.expense_date);
        return expDate >= lastWeekStart && expDate <= lastWeekEnd;
      });

      const lastWeekTotal = lastWeekExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const diff = totalSpent - lastWeekTotal;
      const percentChange = lastWeekTotal > 0 ? (diff / lastWeekTotal) * 100 : 0;

      vsLastWeek = { amount: diff, percentChange };
    }

    // Generate insight
    let insight: string | null = null;
    if (wantsPercent > 100) {
      insight = 'Your wants spending exceeded the weekly target. Consider cutting back next week.';
    } else if (wantsPercent < 50 && needsPercent < 80) {
      insight = 'Great week! You stayed well under budget.';
    } else if (categoryList[0]?.amount > totalSpent * 0.5) {
      insight = `${categoryList[0].icon} ${categoryList[0].name} made up over half your spending this week.`;
    }

    return {
      weekStart: start.toISOString().split('T')[0],
      weekEnd: end.toISOString().split('T')[0],
      totalSpent,
      vsLastWeek,
      byCategory: categoryList,
      needsSpent,
      wantsSpent,
      needsPercent,
      wantsPercent,
      dailyAverage: totalSpent / 7,
      topSpendingDay,
      insight,
    };
  }, [agent?.id, budgetTracking]);

  // Generate monthly summary
  const generateMonthlySummary = useCallback(async (monthOffset: number = 0): Promise<MonthlySummary | null> => {
    if (!agent?.id || !budgetTracking) return null;

    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() - monthOffset);
    const monthStr = targetDate.toISOString().slice(0, 7); // YYYY-MM
    const monthName = getMonthName(targetDate);

    const [expensesResult, incomeResult] = await Promise.all([
      getMonthExpenses(agent.id),
      getMonthIncome(agent.id),
    ]);

    if (expensesResult.error || !expensesResult.data) return null;

    const expenses = expensesResult.data;
    const income = incomeResult.data || [];

    // Calculate totals
    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalIncome = income.reduce((sum, i) => sum + parseFloat(i.amount), 0);
    const netSavings = totalIncome - totalSpent;

    // By category and budget type
    const byCategory: Record<string, number> = {};
    let needsSpent = 0;
    let wantsSpent = 0;

    for (const expense of expenses) {
      const cat = expense.category || 'other';
      const amount = parseFloat(expense.amount);
      byCategory[cat] = (byCategory[cat] || 0) + amount;

      const budgetType = getCategoryBudgetType(cat);
      if (budgetType === 'needs') needsSpent += amount;
      else if (budgetType === 'wants') wantsSpent += amount;
    }

    const categoryList = Object.entries(byCategory)
      .map(([id, amount]) => ({
        id,
        ...getCategoryDetails(id),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Budget percentages
    const needsPercent = budgetTracking.needsBudget > 0
      ? (needsSpent / budgetTracking.needsBudget) * 100 : 0;
    const wantsPercent = budgetTracking.wantsBudget > 0
      ? (wantsSpent / budgetTracking.wantsBudget) * 100 : 0;
    const savingsPercent = budgetTracking.savingsBudget > 0
      ? (budgetTracking.savingsAllocated / budgetTracking.savingsBudget) * 100 : 0;

    // Daily breakdown
    const byDay: Record<string, number> = {};
    const dailySafeSpend = budgetTracking.dailySafeSpend || 0;
    let daysUnderBudget = 0;
    let daysOverBudget = 0;

    for (const expense of expenses) {
      const day = expense.expense_date;
      byDay[day] = (byDay[day] || 0) + parseFloat(expense.amount);
    }

    for (const [, amount] of Object.entries(byDay)) {
      if (amount <= dailySafeSpend) daysUnderBudget++;
      else daysOverBudget++;
    }

    const sortedDays = Object.entries(byDay).sort((a, b) => a[1] - b[1]);
    const bestDay = sortedDays[0] ? { date: sortedDays[0][0], amount: sortedDays[0][1] } : null;
    const worstDay = sortedDays[sortedDays.length - 1]
      ? { date: sortedDays[sortedDays.length - 1][0], amount: sortedDays[sortedDays.length - 1][1] }
      : null;

    // Generate insights
    const insights: string[] = [];

    if (needsPercent <= 100) {
      insights.push(`Stayed within needs budget (${needsPercent.toFixed(0)}%)`);
    } else {
      insights.push(`Needs spending over budget by ${currencySymbol}${Math.abs(budgetTracking.needsRemaining).toFixed(0)}`);
    }

    if (wantsPercent <= 100) {
      insights.push(`Wants spending on track (${wantsPercent.toFixed(0)}%)`);
    } else {
      insights.push(`Wants spending over budget by ${currencySymbol}${Math.abs(budgetTracking.wantsRemaining).toFixed(0)}`);
    }

    if (netSavings > 0) {
      insights.push(`Net savings of ${currencySymbol}${netSavings.toFixed(0)} this month`);
    }

    if (categoryList[0]) {
      insights.push(`Top spending: ${categoryList[0].icon} ${categoryList[0].name} (${currencySymbol}${categoryList[0].amount.toFixed(0)})`);
    }

    return {
      month: monthStr,
      monthName,
      totalSpent,
      totalIncome,
      netSavings,
      needsSpent,
      needsBudget: budgetTracking.needsBudget,
      needsPercent,
      wantsSpent,
      wantsBudget: budgetTracking.wantsBudget,
      wantsPercent,
      savingsAllocated: budgetTracking.savingsAllocated,
      savingsBudget: budgetTracking.savingsBudget,
      savingsPercent,
      byCategory: categoryList,
      topCategories: categoryList.slice(0, 5),
      daysUnderBudget,
      daysOverBudget,
      bestDay,
      worstDay,
      vsLastMonth: null, // TODO: Implement last month comparison
      insights,
    };
  }, [agent?.id, budgetTracking, currencySymbol]);

  // Format summary as chat message
  const formatDailySummaryMessage = useCallback((summary: DailySummary): string => {
    if (summary.expenseCount === 0) {
      return `**Today's Wrap-Up**\n\nNo expenses logged today!`;
    }

    let message = `**Today's Wrap-Up**\n\n`;
    message += `💸 Spent: ${currencySymbol}${summary.totalSpent.toFixed(0)} across ${summary.expenseCount} purchase${summary.expenseCount !== 1 ? 's' : ''}\n`;

    if (summary.topCategory) {
      message += `📊 Top category: ${summary.topCategory.icon} ${summary.topCategory.name} (${currencySymbol}${summary.topCategory.amount.toFixed(0)})\n`;
    }

    if (budgetTracking) {
      message += `\n**Budget Status**\n`;
      message += `Needs: ${currencySymbol}${budgetTracking.needsSpent.toFixed(0)} / ${currencySymbol}${budgetTracking.needsBudget.toFixed(0)} (${budgetTracking.needsPercent.toFixed(0)}%)\n`;
      message += `Wants: ${currencySymbol}${budgetTracking.wantsSpent.toFixed(0)} / ${currencySymbol}${budgetTracking.wantsBudget.toFixed(0)} (${budgetTracking.wantsPercent.toFixed(0)}%)\n`;

      if (budgetTracking.dailySafeSpend > 0) {
        message += `\n${currencySymbol}${budgetTracking.dailySafeSpend.toFixed(0)}/day keeps you on budget.`;
      }
    }

    return message;
  }, [currencySymbol, budgetTracking]);

  const formatWeeklySummaryMessage = useCallback((summary: WeeklySummary): string => {
    const weekRange = `${formatDate(new Date(summary.weekStart))} - ${formatDate(new Date(summary.weekEnd))}`;

    let message = `**Week in Review** (${weekRange})\n\n`;
    message += `💸 **Total Spent:** ${currencySymbol}${summary.totalSpent.toFixed(0)}\n`;

    if (summary.vsLastWeek) {
      const direction = summary.vsLastWeek.amount >= 0 ? '📈' : '📉';
      const sign = summary.vsLastWeek.amount >= 0 ? '+' : '';
      message += `${direction} **vs Last Week:** ${sign}${currencySymbol}${Math.abs(summary.vsLastWeek.amount).toFixed(0)} (${sign}${summary.vsLastWeek.percentChange.toFixed(0)}%)\n`;
    }

    message += `\n**By Category**\n`;
    for (const cat of summary.byCategory.slice(0, 5)) {
      message += `${cat.icon} ${cat.name}: ${currencySymbol}${cat.amount.toFixed(0)}\n`;
    }

    message += `\n**Budget Check**\n`;
    const needsStatus = summary.needsPercent <= 100 ? '✅' : '⚠️';
    const wantsStatus = summary.wantsPercent <= 100 ? '✅' : '⚠️';
    message += `${needsStatus} Needs: ${summary.needsPercent.toFixed(0)}% of weekly budget\n`;
    message += `${wantsStatus} Wants: ${summary.wantsPercent.toFixed(0)}% of weekly budget\n`;

    if (summary.insight) {
      message += `\n💡 ${summary.insight}`;
    }

    return message;
  }, [currencySymbol]);

  const formatMonthlySummaryMessage = useCallback((summary: MonthlySummary): string => {
    let message = `**${summary.monthName} Wrap-Up**\n\n`;

    message += `💸 **Total Spent:** ${currencySymbol}${summary.totalSpent.toFixed(0)}\n`;
    message += `💰 **Total Income:** ${currencySymbol}${summary.totalIncome.toFixed(0)}\n`;
    message += `📈 **Net:** ${summary.netSavings >= 0 ? '+' : ''}${currencySymbol}${summary.netSavings.toFixed(0)}\n`;

    message += `\n**Budget Performance**\n`;
    const needsIcon = summary.needsPercent <= 100 ? '✅' : '⚠️';
    const wantsIcon = summary.wantsPercent <= 100 ? '✅' : '⚠️';
    const savingsIcon = summary.savingsPercent >= 100 ? '✅' : '📊';

    message += `${needsIcon} Needs: ${currencySymbol}${summary.needsSpent.toFixed(0)} / ${currencySymbol}${summary.needsBudget.toFixed(0)} (${summary.needsPercent.toFixed(0)}%)\n`;
    message += `${wantsIcon} Wants: ${currencySymbol}${summary.wantsSpent.toFixed(0)} / ${currencySymbol}${summary.wantsBudget.toFixed(0)} (${summary.wantsPercent.toFixed(0)}%)\n`;
    message += `${savingsIcon} Savings: ${currencySymbol}${summary.savingsAllocated.toFixed(0)} / ${currencySymbol}${summary.savingsBudget.toFixed(0)} (${summary.savingsPercent.toFixed(0)}%)\n`;

    message += `\n**Top Categories**\n`;
    for (const cat of summary.topCategories) {
      message += `${cat.icon} ${cat.name}: ${currencySymbol}${cat.amount.toFixed(0)}\n`;
    }

    if (summary.bestDay && summary.worstDay) {
      message += `\n**Highlights**\n`;
      message += `🌟 Best day: ${formatDate(new Date(summary.bestDay.date))} (${currencySymbol}${summary.bestDay.amount.toFixed(0)})\n`;
      message += `📉 Biggest day: ${formatDate(new Date(summary.worstDay.date))} (${currencySymbol}${summary.worstDay.amount.toFixed(0)})\n`;
      message += `🔥 Stayed under daily budget ${summary.daysUnderBudget}/${summary.daysUnderBudget + summary.daysOverBudget} days\n`;
    }

    return message;
  }, [currencySymbol]);

  return {
    generateDailySummary,
    generateWeeklySummary,
    generateMonthlySummary,
    formatDailySummaryMessage,
    formatWeeklySummaryMessage,
    formatMonthlySummaryMessage,
  };
}

// Detect if user is asking for a summary
export function detectFinanceSummaryRequest(message: string): {
  type: 'daily' | 'weekly' | 'monthly' | null;
} {
  const lower = message.toLowerCase();

  // Daily patterns
  if (
    lower.includes('today') ||
    lower.includes('daily summary') ||
    lower.includes('how did i do today') ||
    lower.includes('what did i spend today')
  ) {
    return { type: 'daily' };
  }

  // Weekly patterns
  if (
    lower.includes('this week') ||
    lower.includes('weekly summary') ||
    lower.includes('week in review') ||
    lower.includes('how was my week')
  ) {
    return { type: 'weekly' };
  }

  // Monthly patterns
  if (
    lower.includes('this month') ||
    lower.includes('monthly summary') ||
    lower.includes('month wrap') ||
    lower.includes('how did i do this month') ||
    lower.includes('monthly report')
  ) {
    return { type: 'monthly' };
  }

  // Generic summary request - default to weekly
  if (lower.includes('summary') || lower.includes('show me') || lower.includes('how am i doing')) {
    return { type: 'weekly' };
  }

  return { type: null };
}
