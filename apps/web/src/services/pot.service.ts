/**
 * Pot Service - Production Grade
 *
 * Direct Supabase integration for pot (locked wallet) operations
 * Includes proper error handling, type safety, and transaction support
 */

import { supabase } from '@/lib/supabase';
import type {
  Pot,
  PotTransaction,
  PotNotification,
  PotSummary,
  PotSettings,
  WithdrawalEligibility,
  CreatePotRequest,
  ContributePotRequest,
  WithdrawPotRequest,
  UpdatePotRequest,
  PaginatedResponse,
  PotLockType,
  PotStatus,
  PotLockStatus,
  AutoDepositFrequency,
  PotTransactionType,
  PotTransactionStatus,
} from '@/types';

// Map database row to Pot type
const mapPot = (row: any): Pot => ({
  id: row.id,
  userId: row.user_id,
  walletId: row.wallet_id,
  name: row.name,
  description: row.description || undefined,
  goalAmount: row.goal_amount ? parseFloat(row.goal_amount) : undefined,
  targetAmount: row.target_amount ? parseFloat(row.target_amount) : undefined,
  currentBalance: parseFloat(row.current_balance || row.balance) || 0,
  maturityDate: row.maturity_date || undefined,
  lockType: row.lock_type as PotLockType,
  lockPeriodDays: row.lock_period_days || undefined,
  lockEndDate: row.lock_end_date || undefined,

  // Auto-deposit settings
  autoDepositEnabled: row.auto_deposit_enabled || false,
  autoDepositAmount: row.auto_deposit_amount ? parseFloat(row.auto_deposit_amount) : undefined,
  autoDepositFrequency: row.auto_deposit_frequency as AutoDepositFrequency | undefined,
  autoDepositDay: row.auto_deposit_day || undefined,
  sourceWalletId: row.source_wallet_id || undefined,
  nextAutoDepositDate: row.next_auto_deposit_date || undefined,
  lastAutoDepositDate: row.last_auto_deposit_date || undefined,

  // Status
  status: row.status as PotStatus,
  lockStatus: row.lock_status as PotLockStatus,
  withdrawalEnabled: row.withdrawal_enabled || false,
  unlockedAt: row.unlocked_at || undefined,
  unlockReason: row.unlock_reason || undefined,

  // Admin override
  adminLocked: row.admin_locked || false,
  adminLockedBy: row.admin_locked_by || undefined,
  adminLockedAt: row.admin_locked_at || undefined,
  adminLockReason: row.admin_lock_reason || undefined,

  // Metadata
  icon: row.icon || 'piggy-bank',
  color: row.color || '#4F46E5',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Map database row to PotTransaction type
const mapPotTransaction = (row: any): PotTransaction => ({
  id: row.id,
  potId: row.pot_id,
  transactionId: row.transaction_id || undefined,
  transactionType: row.transaction_type as PotTransactionType,
  amount: parseFloat(row.amount) || 0,
  balanceAfter: row.balance_after ? parseFloat(row.balance_after) : undefined,
  status: row.status as PotTransactionStatus,
  description: row.description || undefined,
  sourceWalletId: row.source_wallet_id || undefined,
  destinationWalletId: row.destination_wallet_id || undefined,
  reference: row.reference || undefined,
  failureReason: row.failure_reason || undefined,
  retryCount: row.retry_count || 0,
  scheduledAt: row.scheduled_at || undefined,
  processedAt: row.processed_at || undefined,
  createdAt: row.created_at,
});

// Map database row to PotNotification type
const mapPotNotification = (row: any): PotNotification => ({
  id: row.id,
  potId: row.pot_id,
  userId: row.user_id,
  notificationType: row.notification_type,
  title: row.title,
  message: row.message,
  metadata: row.metadata || undefined,
  isRead: row.is_read || false,
  sentAt: row.sent_at,
  readAt: row.read_at || undefined,
});

// Map summary JSON to PotSummary type
const mapPotSummary = (data: any): PotSummary => ({
  id: data.id,
  name: data.name,
  description: data.description || undefined,
  currentBalance: parseFloat(data.current_balance) || 0,
  goalAmount: data.goal_amount ? parseFloat(data.goal_amount) : undefined,
  progressPercent: data.progress_percent ? parseFloat(data.progress_percent) : undefined,
  lockType: data.lock_type as PotLockType,
  lockStatus: data.lock_status as PotLockStatus,
  lockEndDate: data.lock_end_date || undefined,
  maturityDate: data.maturity_date || undefined,
  daysUntilUnlock: data.days_until_unlock || 0,
  autoDeposit: {
    enabled: data.auto_deposit?.enabled || false,
    amount: data.auto_deposit?.amount ? parseFloat(data.auto_deposit.amount) : undefined,
    frequency: data.auto_deposit?.frequency as AutoDepositFrequency | undefined,
    nextDate: data.auto_deposit?.next_date || undefined,
  },
  stats: {
    totalContributions: parseFloat(data.stats?.total_contributions) || 0,
    totalWithdrawals: parseFloat(data.stats?.total_withdrawals) || 0,
    contributionCount: data.stats?.contribution_count || 0,
  },
  status: data.status as PotStatus,
  adminLocked: data.admin_locked || false,
  icon: data.icon || 'piggy-bank',
  color: data.color || '#4F46E5',
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

export const potService = {
  /**
   * Get all pots for a user
   */
  async getPots(userId: string): Promise<Pot[]> {
    // First get pots
    const { data: pots, error } = await supabase
      .from('pots')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'CLOSED')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pots:', error);
      throw new Error(error.message);
    }

    if (!pots || pots.length === 0) {
      return [];
    }

    // Get wallet balances for all pots
    const walletIds = pots.map(p => p.wallet_id).filter(Boolean);
    const { data: wallets } = await supabase
      .from('wallets')
      .select('id, balance')
      .in('id', walletIds);

    const walletBalanceMap = new Map(
      (wallets || []).map(w => [w.id, parseFloat(w.balance) || 0])
    );

    return pots.map(pot => ({
      ...mapPot(pot),
      currentBalance: walletBalanceMap.get(pot.wallet_id) || 0,
    }));
  },

  /**
   * Get a single pot by ID
   */
  async getPot(potId: string): Promise<Pot> {
    const { data: pot, error } = await supabase
      .from('pots')
      .select('*')
      .eq('id', potId)
      .single();

    if (error) {
      console.error('Error fetching pot:', error);
      throw new Error(error.message);
    }

    // Get wallet balance
    let balance = 0;
    if (pot.wallet_id) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', pot.wallet_id)
        .single();
      balance = parseFloat(wallet?.balance) || 0;
    }

    return {
      ...mapPot(pot),
      currentBalance: balance,
    };
  },

  /**
   * Get pot summary with stats
   */
  async getPotSummary(potId: string): Promise<PotSummary> {
    const { data, error } = await supabase.rpc('get_pot_summary', {
      p_pot_id: potId,
    });

    if (error) {
      console.error('Error fetching pot summary:', error);
      // Fallback to manual fetch
      const pot = await this.getPot(potId);
      const transactions = await this.getPotTransactions(potId, { limit: 1000 });

      const stats = {
        totalContributions: 0,
        totalWithdrawals: 0,
        contributionCount: 0,
      };

      transactions.data.forEach(tx => {
        if (tx.transactionType === 'contribution' || tx.transactionType === 'auto_deposit') {
          stats.totalContributions += tx.amount;
          stats.contributionCount++;
        } else if (tx.transactionType === 'withdrawal') {
          stats.totalWithdrawals += tx.amount;
        }
      });

      return {
        id: pot.id,
        name: pot.name,
        description: pot.description,
        currentBalance: pot.currentBalance,
        goalAmount: pot.goalAmount,
        progressPercent: pot.goalAmount ? (pot.currentBalance / pot.goalAmount) * 100 : undefined,
        lockType: pot.lockType,
        lockStatus: pot.lockStatus,
        lockEndDate: pot.lockEndDate,
        maturityDate: pot.maturityDate,
        daysUntilUnlock: pot.lockEndDate
          ? Math.max(0, Math.ceil((new Date(pot.lockEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0,
        autoDeposit: {
          enabled: pot.autoDepositEnabled,
          amount: pot.autoDepositAmount,
          frequency: pot.autoDepositFrequency,
          nextDate: pot.nextAutoDepositDate,
        },
        stats,
        status: pot.status,
        adminLocked: pot.adminLocked,
        icon: pot.icon,
        color: pot.color,
        createdAt: pot.createdAt,
        updatedAt: pot.updatedAt,
      };
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return mapPotSummary(data);
  },

  /**
   * Create a new pot
   */
  async createPot(userId: string, request: CreatePotRequest): Promise<Pot> {
    // Try RPC function first
    const { data: potId, error: rpcError } = await supabase.rpc('create_pot', {
      p_user_id: userId,
      p_name: request.name,
      p_description: request.description || null,
      p_goal_amount: request.goalAmount || null,
      p_lock_type: request.lockType || 'time_based',
      p_lock_period_days: request.lockPeriodDays || 30,
      p_maturity_date: request.maturityDate || null,
      p_auto_deposit_enabled: request.autoDepositEnabled || false,
      p_auto_deposit_amount: request.autoDepositAmount || null,
      p_auto_deposit_frequency: request.autoDepositFrequency || null,
      p_source_wallet_id: request.sourceWalletId || null,
      p_icon: request.icon || 'piggy-bank',
      p_color: request.color || '#4F46E5',
    });

    if (!rpcError && potId) {
      return this.getPot(potId);
    }

    // Fallback: Manual creation
    console.warn('RPC create_pot failed, using fallback:', rpcError);

    // Generate unique external_id for pot wallet
    const externalId = `pot_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Create pot wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .insert({
        external_id: externalId,
        user_id: userId,
        wallet_type: 'pot',
        currency: 'SLE',
        balance: 0,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (walletError) {
      throw new Error('Failed to create pot wallet: ' + walletError.message);
    }

    // Calculate lock end date
    let lockEndDate = request.maturityDate;
    if (!lockEndDate && request.lockPeriodDays) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + request.lockPeriodDays);
      lockEndDate = endDate.toISOString();
    }

    // Calculate next auto-deposit date
    let nextAutoDepositDate;
    if (request.autoDepositEnabled && request.autoDepositFrequency) {
      const nextDate = new Date();
      switch (request.autoDepositFrequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'bi_weekly':
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
      }
      nextAutoDepositDate = nextDate.toISOString();
    }

    // Create pot
    const { data: pot, error: potError } = await supabase
      .from('pots')
      .insert({
        user_id: userId,
        wallet_id: wallet.id,
        name: request.name,
        description: request.description,
        goal_amount: request.goalAmount,
        target_amount: request.goalAmount,
        lock_type: request.lockType || 'time_based',
        lock_period_days: request.lockPeriodDays,
        lock_end_date: lockEndDate,
        maturity_date: lockEndDate,
        auto_deposit_enabled: request.autoDepositEnabled || false,
        auto_deposit_amount: request.autoDepositAmount,
        auto_deposit_frequency: request.autoDepositFrequency,
        source_wallet_id: request.sourceWalletId,
        next_auto_deposit_date: nextAutoDepositDate,
        icon: request.icon || 'piggy-bank',
        color: request.color || '#4F46E5',
        status: 'ACTIVE',
        lock_status: 'LOCKED',
      })
      .select()
      .single();

    if (potError) {
      // Cleanup wallet
      await supabase.from('wallets').delete().eq('id', wallet.id);
      throw new Error('Failed to create pot: ' + potError.message);
    }

    return {
      ...mapPot(pot),
      currentBalance: 0,
    };
  },

  /**
   * Update a pot
   */
  async updatePot(potId: string, request: UpdatePotRequest): Promise<Pot> {
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (request.name !== undefined) updates.name = request.name;
    if (request.description !== undefined) updates.description = request.description;
    if (request.goalAmount !== undefined) {
      updates.goal_amount = request.goalAmount;
      updates.target_amount = request.goalAmount;
    }
    if (request.icon !== undefined) updates.icon = request.icon;
    if (request.color !== undefined) updates.color = request.color;
    if (request.autoDepositEnabled !== undefined) updates.auto_deposit_enabled = request.autoDepositEnabled;
    if (request.autoDepositAmount !== undefined) updates.auto_deposit_amount = request.autoDepositAmount;
    if (request.autoDepositFrequency !== undefined) updates.auto_deposit_frequency = request.autoDepositFrequency;
    if (request.sourceWalletId !== undefined) updates.source_wallet_id = request.sourceWalletId;

    // Recalculate next auto-deposit if settings changed
    if (request.autoDepositEnabled && request.autoDepositFrequency) {
      const nextDate = new Date();
      switch (request.autoDepositFrequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'bi_weekly':
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
      }
      updates.next_auto_deposit_date = nextDate.toISOString();
    }

    const { data, error } = await supabase
      .from('pots')
      .update(updates)
      .eq('id', potId)
      .select()
      .single();

    if (error) {
      console.error('Error updating pot:', error);
      throw new Error(error.message);
    }

    return this.getPot(potId);
  },

  /**
   * Contribute to a pot
   */
  async contributeToPot(request: ContributePotRequest): Promise<PotTransaction> {
    // Try RPC function first
    const { data: txId, error: rpcError } = await supabase.rpc('contribute_to_pot', {
      p_pot_id: request.potId,
      p_source_wallet_id: request.sourceWalletId,
      p_amount: request.amount,
      p_description: request.description || 'Contribution',
    });

    if (!rpcError && txId) {
      const { data: tx } = await supabase
        .from('pot_transactions')
        .select('*')
        .eq('id', txId)
        .single();
      return mapPotTransaction(tx);
    }

    // Fallback: Manual contribution
    console.warn('RPC contribute_to_pot failed, using fallback:', rpcError);

    // Get pot
    const pot = await this.getPot(request.potId);

    if (pot.status !== 'ACTIVE' && pot.status !== 'LOCKED') {
      throw new Error('Pot is not accepting contributions');
    }

    if (pot.adminLocked) {
      throw new Error('Pot is locked by administrator');
    }

    // Get source wallet
    const { data: sourceWallet, error: sourceError } = await supabase
      .from('wallets')
      .select('balance, status')
      .eq('id', request.sourceWalletId)
      .single();

    if (sourceError || !sourceWallet) {
      throw new Error('Source wallet not found');
    }

    if (sourceWallet.status !== 'ACTIVE') {
      throw new Error('Source wallet is not active');
    }

    const sourceBalance = parseFloat(sourceWallet.balance) || 0;
    if (sourceBalance < request.amount) {
      throw new Error('Insufficient balance in source wallet');
    }

    // Debit source wallet
    const { error: debitError } = await supabase
      .from('wallets')
      .update({
        balance: sourceBalance - request.amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.sourceWalletId);

    if (debitError) {
      throw new Error('Failed to debit source wallet');
    }

    // Get pot wallet balance
    const { data: potWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', pot.walletId)
      .single();

    const potBalance = parseFloat(potWallet?.balance) || 0;
    const newBalance = potBalance + request.amount;

    // Credit pot wallet
    const { error: creditError } = await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pot.walletId);

    if (creditError) {
      // Rollback
      await supabase
        .from('wallets')
        .update({ balance: sourceBalance })
        .eq('id', request.sourceWalletId);
      throw new Error('Failed to credit pot wallet');
    }

    // Create pot transaction record
    const reference = `CTB-${Date.now()}`;
    const { data: potTx, error: txError } = await supabase
      .from('pot_transactions')
      .insert({
        pot_id: request.potId,
        transaction_type: 'contribution',
        amount: request.amount,
        balance_after: newBalance,
        status: 'COMPLETED',
        description: request.description || 'Contribution',
        source_wallet_id: request.sourceWalletId,
        reference,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating pot transaction:', txError);
    }

    // Update pot
    await supabase
      .from('pots')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', request.potId);

    return potTx ? mapPotTransaction(potTx) : {
      id: reference,
      potId: request.potId,
      transactionType: 'contribution',
      amount: request.amount,
      balanceAfter: newBalance,
      status: 'COMPLETED',
      description: request.description,
      sourceWalletId: request.sourceWalletId,
      reference,
      retryCount: 0,
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * Check withdrawal eligibility
   */
  async checkWithdrawalEligibility(potId: string): Promise<WithdrawalEligibility> {
    const { data, error } = await supabase.rpc('check_pot_withdrawal_eligibility', {
      p_pot_id: potId,
    });

    if (error) {
      console.error('Error checking withdrawal eligibility:', error);
      // Fallback: Manual check
      const pot = await this.getPot(potId);

      if (pot.adminLocked) {
        return {
          canWithdraw: false,
          lockStatus: 'admin_locked',
          reason: 'Pot is locked by administrator',
          currentBalance: pot.currentBalance,
          maxWithdrawalAmount: pot.currentBalance,
        };
      }

      if (pot.status === 'CLOSED') {
        return {
          canWithdraw: false,
          lockStatus: 'closed',
          reason: 'Pot has been closed',
          currentBalance: pot.currentBalance,
          maxWithdrawalAmount: 0,
        };
      }

      // Check time-based lock
      if (pot.lockType === 'time_based' || pot.lockType === 'hybrid') {
        if (pot.lockEndDate && new Date(pot.lockEndDate) > new Date()) {
          const daysUntilUnlock = Math.ceil(
            (new Date(pot.lockEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          return {
            canWithdraw: false,
            canWithdrawWithPenalty: true,
            lockStatus: 'locked',
            lockEndDate: pot.lockEndDate,
            daysUntilUnlock,
            penaltyPercent: 5.0,
            currentBalance: pot.currentBalance,
            maxWithdrawalAmount: pot.currentBalance,
            withdrawalAfterPenalty: pot.currentBalance * 0.95,
            reason: `Pot is locked until ${new Date(pot.lockEndDate).toLocaleDateString()}`,
          };
        }
      }

      // Check goal-based lock
      if (pot.lockType === 'goal_based' || pot.lockType === 'hybrid') {
        if (pot.goalAmount && pot.currentBalance < pot.goalAmount) {
          return {
            canWithdraw: false,
            lockStatus: 'goal_not_reached',
            goalAmount: pot.goalAmount,
            currentBalance: pot.currentBalance,
            maxWithdrawalAmount: pot.currentBalance,
            remainingToGoal: pot.goalAmount - pot.currentBalance,
            progressPercent: (pot.currentBalance / pot.goalAmount) * 100,
            reason: 'Goal not yet reached',
          };
        }
      }

      return {
        canWithdraw: true,
        lockStatus: 'unlocked',
        currentBalance: pot.currentBalance,
        maxWithdrawalAmount: pot.currentBalance,
        reason: 'Withdrawal available',
      };
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return {
      canWithdraw: data.can_withdraw,
      canWithdrawWithPenalty: data.can_withdraw_with_penalty,
      lockStatus: data.lock_status,
      lockEndDate: data.lock_end_date,
      daysUntilUnlock: data.days_until_unlock,
      penaltyPercent: data.penalty_percent ? parseFloat(data.penalty_percent) : undefined,
      currentBalance: parseFloat(data.current_balance) || 0,
      maxWithdrawalAmount: parseFloat(data.max_withdrawal_amount) || 0,
      withdrawalAfterPenalty: data.withdrawal_after_penalty
        ? parseFloat(data.withdrawal_after_penalty)
        : undefined,
      goalAmount: data.goal_amount ? parseFloat(data.goal_amount) : undefined,
      remainingToGoal: data.remaining_to_goal ? parseFloat(data.remaining_to_goal) : undefined,
      progressPercent: data.progress_percent ? parseFloat(data.progress_percent) : undefined,
      reason: data.reason,
    };
  },

  /**
   * Withdraw from a pot
   */
  async withdrawFromPot(request: WithdrawPotRequest): Promise<PotTransaction> {
    // Try RPC function first
    const { data: txId, error: rpcError } = await supabase.rpc('withdraw_from_pot', {
      p_pot_id: request.potId,
      p_destination_wallet_id: request.destinationWalletId,
      p_amount: request.amount,
      p_force_with_penalty: request.forceWithPenalty || false,
      p_description: request.description || 'Withdrawal',
    });

    if (!rpcError && txId) {
      const { data: tx } = await supabase
        .from('pot_transactions')
        .select('*')
        .eq('id', txId)
        .single();
      return mapPotTransaction(tx);
    }

    // Fallback: Manual withdrawal
    console.warn('RPC withdraw_from_pot failed, using fallback:', rpcError);

    // Check eligibility
    const eligibility = await this.checkWithdrawalEligibility(request.potId);

    if (!eligibility.canWithdraw && !request.forceWithPenalty) {
      throw new Error(eligibility.reason || 'Withdrawal not allowed');
    }

    if (!eligibility.canWithdraw && request.forceWithPenalty && !eligibility.canWithdrawWithPenalty) {
      throw new Error('Early withdrawal not available for this pot');
    }

    const pot = await this.getPot(request.potId);

    if (request.amount > pot.currentBalance) {
      throw new Error('Insufficient pot balance');
    }

    // Calculate actual amount after penalty
    let actualAmount = request.amount;
    let penaltyAmount = 0;

    if (!eligibility.canWithdraw && request.forceWithPenalty && eligibility.penaltyPercent) {
      penaltyAmount = request.amount * (eligibility.penaltyPercent / 100);
      actualAmount = request.amount - penaltyAmount;
    }

    // Debit pot wallet
    const newPotBalance = pot.currentBalance - request.amount;
    const { error: debitError } = await supabase
      .from('wallets')
      .update({
        balance: newPotBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pot.walletId);

    if (debitError) {
      throw new Error('Failed to debit pot wallet');
    }

    // Get destination wallet balance
    const { data: destWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', request.destinationWalletId)
      .single();

    const destBalance = parseFloat(destWallet?.balance) || 0;

    // Credit destination wallet
    const { error: creditError } = await supabase
      .from('wallets')
      .update({
        balance: destBalance + actualAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.destinationWalletId);

    if (creditError) {
      // Rollback
      await supabase
        .from('wallets')
        .update({ balance: pot.currentBalance })
        .eq('id', pot.walletId);
      throw new Error('Failed to credit destination wallet');
    }

    // Create pot transaction record
    const reference = `WTD-${Date.now()}`;
    const { data: potTx, error: txError } = await supabase
      .from('pot_transactions')
      .insert({
        pot_id: request.potId,
        transaction_type: 'withdrawal',
        amount: request.amount,
        balance_after: newPotBalance,
        status: 'COMPLETED',
        description: request.description || 'Withdrawal',
        destination_wallet_id: request.destinationWalletId,
        reference,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating pot transaction:', txError);
    }

    // Record penalty if applicable
    if (penaltyAmount > 0) {
      await supabase.from('pot_transactions').insert({
        pot_id: request.potId,
        transaction_type: 'penalty',
        amount: penaltyAmount,
        balance_after: newPotBalance,
        status: 'COMPLETED',
        description: `Early withdrawal penalty (${eligibility.penaltyPercent}%)`,
        reference: `PEN-${Date.now()}`,
        processed_at: new Date().toISOString(),
      });
    }

    // Update pot
    await supabase
      .from('pots')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', request.potId);

    return potTx ? mapPotTransaction(potTx) : {
      id: reference,
      potId: request.potId,
      transactionType: 'withdrawal',
      amount: request.amount,
      balanceAfter: newPotBalance,
      status: 'COMPLETED',
      description: request.description,
      destinationWalletId: request.destinationWalletId,
      reference,
      retryCount: 0,
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * Close a pot
   */
  async closePot(potId: string, destinationWalletId: string): Promise<boolean> {
    // Try RPC function first
    const { data, error: rpcError } = await supabase.rpc('close_pot', {
      p_pot_id: potId,
      p_destination_wallet_id: destinationWalletId,
    });

    if (!rpcError && data) {
      return true;
    }

    // Fallback: Manual close
    console.warn('RPC close_pot failed, using fallback:', rpcError);

    const pot = await this.getPot(potId);

    if (pot.status === 'CLOSED') {
      throw new Error('Pot is already closed');
    }

    if (pot.adminLocked) {
      throw new Error('Pot is locked by administrator');
    }

    // Withdraw remaining balance if any
    if (pot.currentBalance > 0) {
      await this.withdrawFromPot({
        potId,
        destinationWalletId,
        amount: pot.currentBalance,
        forceWithPenalty: true,
        description: 'Pot closure withdrawal',
      });
    }

    // Close pot
    await supabase
      .from('pots')
      .update({
        status: 'CLOSED',
        lock_status: 'UNLOCKED',
        auto_deposit_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', potId);

    // Close pot wallet
    await supabase
      .from('wallets')
      .update({
        status: 'CLOSED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pot.walletId);

    return true;
  },

  /**
   * Get pot transactions
   */
  async getPotTransactions(
    potId: string,
    params?: { page?: number; limit?: number; type?: PotTransactionType }
  ): Promise<PaginatedResponse<PotTransaction>> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('pot_transactions')
      .select('*', { count: 'exact' })
      .eq('pot_id', potId);

    if (params?.type) {
      query = query.eq('transaction_type', params.type);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching pot transactions:', error);
      throw new Error(error.message);
    }

    const total = count || 0;

    return {
      data: (data || []).map(mapPotTransaction),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Get pot notifications
   */
  async getPotNotifications(
    userId: string,
    params?: { unreadOnly?: boolean; potId?: string; limit?: number }
  ): Promise<PotNotification[]> {
    let query = supabase
      .from('pot_notifications')
      .select('*')
      .eq('user_id', userId);

    if (params?.unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (params?.potId) {
      query = query.eq('pot_id', params.potId);
    }

    const { data, error } = await query
      .order('sent_at', { ascending: false })
      .limit(params?.limit || 50);

    if (error) {
      console.error('Error fetching pot notifications:', error);
      throw new Error(error.message);
    }

    return (data || []).map(mapPotNotification);
  },

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('pot_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification read:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Get pot settings
   */
  async getPotSettings(): Promise<PotSettings> {
    const { data, error } = await supabase
      .from('pot_settings')
      .select('setting_key, setting_value')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching pot settings:', error);
      // Return defaults
      return {
        maxPotsPerUser: 10,
        minContributionAmount: 1.0,
        maxContributionAmount: 1000000.0,
        minLockPeriodDays: 7,
        maxLockPeriodDays: 3650,
        earlyWithdrawalPenaltyPercent: 5.0,
        autoDepositRetryHours: 24,
      };
    }

    const settings: PotSettings = {
      maxPotsPerUser: 10,
      minContributionAmount: 1.0,
      maxContributionAmount: 1000000.0,
      minLockPeriodDays: 7,
      maxLockPeriodDays: 3650,
      earlyWithdrawalPenaltyPercent: 5.0,
      autoDepositRetryHours: 24,
    };

    (data || []).forEach(row => {
      const value = row.setting_value?.value;
      switch (row.setting_key) {
        case 'max_pots_per_user':
          settings.maxPotsPerUser = value || 10;
          break;
        case 'min_contribution_amount':
          settings.minContributionAmount = value || 1.0;
          break;
        case 'max_contribution_amount':
          settings.maxContributionAmount = value || 1000000.0;
          break;
        case 'min_lock_period_days':
          settings.minLockPeriodDays = value || 7;
          break;
        case 'max_lock_period_days':
          settings.maxLockPeriodDays = value || 3650;
          break;
        case 'early_withdrawal_penalty_percent':
          settings.earlyWithdrawalPenaltyPercent = value || 5.0;
          break;
        case 'auto_deposit_retry_hours':
          settings.autoDepositRetryHours = value || 24;
          break;
      }
    });

    return settings;
  },

  // ==========================================
  // Admin functions
  // ==========================================

  /**
   * Get all pots (admin)
   */
  async getAllPots(params?: {
    page?: number;
    limit?: number;
    status?: PotStatus;
    userId?: string;
  }): Promise<PaginatedResponse<Pot>> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabase.from('pots').select('*', { count: 'exact' });

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    if (params?.userId) {
      query = query.eq('user_id', params.userId);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching all pots:', error);
      throw new Error(error.message);
    }

    // Get wallet balances
    const walletIds = (data || []).map(p => p.wallet_id).filter(Boolean);
    const { data: wallets } = await supabase
      .from('wallets')
      .select('id, balance')
      .in('id', walletIds);

    const walletBalanceMap = new Map(
      (wallets || []).map(w => [w.id, parseFloat(w.balance) || 0])
    );

    const total = count || 0;

    return {
      data: (data || []).map(pot => ({
        ...mapPot(pot),
        currentBalance: walletBalanceMap.get(pot.wallet_id) || 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Admin lock/unlock pot
   */
  async adminTogglePotLock(
    potId: string,
    adminId: string,
    lock: boolean,
    reason?: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_toggle_pot_lock', {
      p_pot_id: potId,
      p_admin_id: adminId,
      p_lock: lock,
      p_reason: reason || null,
    });

    if (error) {
      // Fallback
      const { error: updateError } = await supabase
        .from('pots')
        .update({
          admin_locked: lock,
          admin_locked_by: lock ? adminId : null,
          admin_locked_at: lock ? new Date().toISOString() : null,
          admin_lock_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', potId);

      if (updateError) {
        throw new Error(updateError.message);
      }
      return true;
    }

    return !!data;
  },

  /**
   * Admin force unlock pot
   */
  async adminForceUnlock(potId: string, adminId: string): Promise<boolean> {
    const { error } = await supabase
      .from('pots')
      .update({
        lock_status: 'UNLOCKED',
        withdrawal_enabled: true,
        unlocked_at: new Date().toISOString(),
        unlock_reason: 'Admin force unlock',
        admin_locked: false,
        admin_locked_by: null,
        admin_locked_at: null,
        admin_lock_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', potId);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  },

  /**
   * Update pot settings (admin)
   */
  async updatePotSetting(key: string, value: any): Promise<void> {
    const { error } = await supabase
      .from('pot_settings')
      .update({
        setting_value: { value },
        updated_at: new Date().toISOString(),
      })
      .eq('setting_key', key);

    if (error) {
      throw new Error(error.message);
    }
  },
};
