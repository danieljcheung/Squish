import { useState, useCallback, useEffect } from 'react';
import { Agent } from '@/types';
import {
  createRecurringBill,
  getRecurringBills,
  getUpcomingBills,
  getBillsDueToday,
  updateRecurringBill,
  markBillPaid,
  deleteRecurringBill,
  toggleBillActive,
  getMonthlyBillsTotal,
  createExpense,
  RecurringBillInsert,
  RecurringBillUpdate,
  BillFrequency,
} from '@/lib/supabase';

export interface RecurringBill {
  id: string;
  agent_id: string;
  name: string;
  icon: string;
  amount: number;
  currency: string;
  category: string;
  frequency: BillFrequency;
  due_day: number;
  reminder_days_before: number;
  auto_log: boolean;
  is_subscription: boolean;
  last_paid_date: string | null;
  next_due_date: string;
  is_active: boolean;
  created_at: string;
}

export interface BillsTotal {
  monthlyTotal: number;
  subscriptionsTotal: number;
  billsCount: number;
  subscriptionsCount: number;
}

// Bill icons by category
export const BILL_ICONS: Record<string, string> = {
  rent: '🏠',
  bills: '💡',
  subscriptions: '📱',
  transport: '🚗',
  health: '💊',
  entertainment: '🎬',
  food: '🍔',
  other: '📄',
};

// Get days until due date
export function getDaysUntilDue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Format due date for display
export function formatDueDate(dueDate: string): string {
  const days = getDaysUntilDue(dueDate);
  const date = new Date(dueDate);
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (days < 0) return `Overdue (${monthDay})`;
  if (days === 0) return `Due today`;
  if (days === 1) return `Due tomorrow`;
  if (days <= 7) return `Due in ${days} days`;
  return `Due ${monthDay}`;
}

interface UseBillsReturn {
  // State
  bills: RecurringBill[];
  upcomingBills: RecurringBill[];
  billsDueToday: RecurringBill[];
  billsTotal: BillsTotal | null;
  loading: boolean;
  error: string | null;

  // Actions
  addBill: (bill: {
    name: string;
    icon?: string;
    amount: number;
    category?: string;
    frequency: BillFrequency;
    dueDay: number;
    reminderDaysBefore?: number;
    autoLog?: boolean;
    isSubscription?: boolean;
  }) => Promise<RecurringBill | null>;
  updateBill: (billId: string, updates: RecurringBillUpdate) => Promise<RecurringBill | null>;
  payBill: (billId: string, logExpense?: boolean) => Promise<boolean>;
  removeBill: (billId: string) => Promise<boolean>;
  pauseBill: (billId: string) => Promise<boolean>;
  unpauseBill: (billId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useBills(agent: Agent | null): UseBillsReturn {
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<RecurringBill[]>([]);
  const [billsDueToday, setBillsDueToday] = useState<RecurringBill[]>([]);
  const [billsTotal, setBillsTotal] = useState<BillsTotal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get currency from agent persona
  const getCurrency = useCallback(() => {
    const persona = agent?.persona_json as Record<string, unknown> | undefined;
    return (persona?.currency as string) || 'CAD';
  }, [agent]);

  // Refresh all bills data
  const refresh = useCallback(async () => {
    if (!agent?.id) return;

    setLoading(true);
    setError(null);

    try {
      const [allBillsResult, upcomingResult, todayResult, totalResult] = await Promise.all([
        getRecurringBills(agent.id),
        getUpcomingBills(agent.id, 14), // Next 2 weeks
        getBillsDueToday(agent.id),
        getMonthlyBillsTotal(agent.id),
      ]);

      if (allBillsResult.data) {
        setBills(allBillsResult.data as RecurringBill[]);
      }

      if (upcomingResult.data) {
        setUpcomingBills(upcomingResult.data as RecurringBill[]);
      }

      if (todayResult.data) {
        setBillsDueToday(todayResult.data as RecurringBill[]);
      }

      if (totalResult.data) {
        setBillsTotal(totalResult.data);
      }
    } catch (err) {
      console.error('Failed to fetch bills:', err);
      setError('Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  // Load bills on agent change
  useEffect(() => {
    if (agent?.id) {
      refresh();
    }
  }, [agent?.id, refresh]);

  // Add a bill
  const addBill = useCallback(
    async (bill: {
      name: string;
      icon?: string;
      amount: number;
      category?: string;
      frequency: BillFrequency;
      dueDay: number;
      reminderDaysBefore?: number;
      autoLog?: boolean;
      isSubscription?: boolean;
    }): Promise<RecurringBill | null> => {
      if (!agent?.id) {
        setError('No agent selected');
        return null;
      }

      try {
        const billData: RecurringBillInsert = {
          agent_id: agent.id,
          name: bill.name,
          icon: bill.icon || BILL_ICONS[bill.category || 'other'] || '📄',
          amount: bill.amount,
          currency: getCurrency(),
          category: bill.category,
          frequency: bill.frequency,
          due_day: bill.dueDay,
          reminder_days_before: bill.reminderDaysBefore ?? 1,
          auto_log: bill.autoLog ?? true,
          is_subscription: bill.isSubscription ?? false,
        };

        const { data, error: insertError } = await createRecurringBill(billData);

        if (insertError) {
          console.error('Failed to create bill:', insertError);
          setError('Failed to add bill');
          return null;
        }

        await refresh();
        return data as RecurringBill;
      } catch (err) {
        console.error('Failed to add bill:', err);
        setError('Failed to add bill');
        return null;
      }
    },
    [agent?.id, getCurrency, refresh]
  );

  // Update a bill
  const updateBill = useCallback(
    async (billId: string, updates: RecurringBillUpdate): Promise<RecurringBill | null> => {
      try {
        const { data, error: updateError } = await updateRecurringBill(billId, updates);

        if (updateError) {
          console.error('Failed to update bill:', updateError);
          setError('Failed to update bill');
          return null;
        }

        await refresh();
        return data as RecurringBill;
      } catch (err) {
        console.error('Failed to update bill:', err);
        setError('Failed to update bill');
        return null;
      }
    },
    [refresh]
  );

  // Pay a bill (optionally log expense)
  const payBill = useCallback(
    async (billId: string, logExpense: boolean = true): Promise<boolean> => {
      try {
        // Get the bill first
        const bill = bills.find(b => b.id === billId);
        if (!bill) {
          setError('Bill not found');
          return false;
        }

        // Log expense if requested
        if (logExpense && agent?.id) {
          await createExpense({
            agent_id: agent.id,
            amount: bill.amount,
            currency: bill.currency,
            category: bill.category || 'bills',
            description: bill.name,
          });
        }

        // Mark bill as paid
        const { error: payError } = await markBillPaid(billId);

        if (payError) {
          console.error('Failed to mark bill paid:', payError);
          setError('Failed to mark bill as paid');
          return false;
        }

        await refresh();
        return true;
      } catch (err) {
        console.error('Failed to pay bill:', err);
        setError('Failed to pay bill');
        return false;
      }
    },
    [agent?.id, bills, refresh]
  );

  // Remove (soft delete) a bill
  const removeBill = useCallback(
    async (billId: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await deleteRecurringBill(billId);

        if (deleteError) {
          console.error('Failed to delete bill:', deleteError);
          setError('Failed to remove bill');
          return false;
        }

        await refresh();
        return true;
      } catch (err) {
        console.error('Failed to remove bill:', err);
        setError('Failed to remove bill');
        return false;
      }
    },
    [refresh]
  );

  // Pause a bill
  const pauseBill = useCallback(
    async (billId: string): Promise<boolean> => {
      try {
        const { error: pauseError } = await toggleBillActive(billId, false);

        if (pauseError) {
          console.error('Failed to pause bill:', pauseError);
          setError('Failed to pause bill');
          return false;
        }

        await refresh();
        return true;
      } catch (err) {
        console.error('Failed to pause bill:', err);
        setError('Failed to pause bill');
        return false;
      }
    },
    [refresh]
  );

  // Unpause a bill
  const unpauseBill = useCallback(
    async (billId: string): Promise<boolean> => {
      try {
        const { error: unpauseError } = await toggleBillActive(billId, true);

        if (unpauseError) {
          console.error('Failed to unpause bill:', unpauseError);
          setError('Failed to unpause bill');
          return false;
        }

        await refresh();
        return true;
      } catch (err) {
        console.error('Failed to unpause bill:', err);
        setError('Failed to unpause bill');
        return false;
      }
    },
    [refresh]
  );

  return {
    bills,
    upcomingBills,
    billsDueToday,
    billsTotal,
    loading,
    error,
    addBill,
    updateBill,
    payBill,
    removeBill,
    pauseBill,
    unpauseBill,
    refresh,
  };
}
