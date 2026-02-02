import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../shared/models/transaction_model.dart';

// Recent transactions (for home screen)
final recentTransactionsProvider =
    FutureProvider<List<TransactionModel>>((ref) async {
  final supabase = Supabase.instance.client;
  final userId = supabase.auth.currentUser?.id;

  if (userId == null) return [];

  final response = await supabase
      .from('transactions')
      .select()
      .or('sender_id.eq.$userId,receiver_id.eq.$userId')
      .order('created_at', ascending: false)
      .limit(10);

  return (response as List)
      .map((json) => TransactionModel.fromJson(json))
      .toList();
});

// All transactions with pagination
final transactionsProvider = StateNotifierProvider<TransactionsNotifier,
    AsyncValue<List<TransactionModel>>>((ref) {
  return TransactionsNotifier();
});

class TransactionsNotifier
    extends StateNotifier<AsyncValue<List<TransactionModel>>> {
  final _supabase = Supabase.instance.client;
  int _page = 0;
  final int _limit = 20;
  bool _hasMore = true;
  String? _filter;
  String? _walletId;

  TransactionsNotifier() : super(const AsyncValue.loading()) {
    loadTransactions();
  }

  Future<void> loadTransactions({bool refresh = false}) async {
    if (refresh) {
      _page = 0;
      _hasMore = true;
      state = const AsyncValue.loading();
    }

    if (!_hasMore && !refresh) return;

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        state = const AsyncValue.data([]);
        return;
      }

      var query = _supabase
          .from('transactions')
          .select()
          .or('sender_id.eq.$userId,receiver_id.eq.$userId');

      // Apply wallet filter
      if (_walletId != null) {
        query = query.or(
            'sender_wallet_id.eq.$_walletId,receiver_wallet_id.eq.$_walletId');
      }

      // Apply type filter
      if (_filter != null && _filter != 'all') {
        query = query.eq('type', _filter!);
      }

      final response = await query
          .order('created_at', ascending: false)
          .range(_page * _limit, (_page + 1) * _limit - 1);

      final newTransactions = (response as List)
          .map((json) => TransactionModel.fromJson(json))
          .toList();

      _hasMore = newTransactions.length == _limit;
      _page++;

      if (refresh || state is AsyncLoading) {
        state = AsyncValue.data(newTransactions);
      } else {
        state = AsyncValue.data([
          ...state.value ?? [],
          ...newTransactions,
        ]);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void setFilter(String? filter) {
    _filter = filter;
    loadTransactions(refresh: true);
  }

  void setWalletId(String? walletId) {
    _walletId = walletId;
    loadTransactions(refresh: true);
  }

  bool get hasMore => _hasMore;
}

// Single transaction provider
final transactionProvider =
    FutureProvider.family<TransactionModel?, String>((ref, transactionId) async {
  final supabase = Supabase.instance.client;

  final response = await supabase
      .from('transactions')
      .select()
      .eq('id', transactionId)
      .single();

  return TransactionModel.fromJson(response);
});

// Transaction stats provider
final transactionStatsProvider = FutureProvider<TransactionStats>((ref) async {
  final supabase = Supabase.instance.client;
  final userId = supabase.auth.currentUser?.id;

  if (userId == null) {
    return TransactionStats(income: 0, expense: 0, count: 0);
  }

  // Get this month's transactions
  final now = DateTime.now();
  final startOfMonth = DateTime(now.year, now.month, 1);

  final response = await supabase
      .from('transactions')
      .select()
      .or('sender_id.eq.$userId,receiver_id.eq.$userId')
      .gte('created_at', startOfMonth.toIso8601String())
      .eq('status', 'completed');

  final transactions = (response as List)
      .map((json) => TransactionModel.fromJson(json))
      .toList();

  double income = 0;
  double expense = 0;

  for (final tx in transactions) {
    if (tx.isCredit) {
      income += tx.amount;
    } else {
      expense += tx.amount;
    }
  }

  return TransactionStats(
    income: income,
    expense: expense,
    count: transactions.length,
  );
});

class TransactionStats {
  final double income;
  final double expense;
  final int count;

  TransactionStats({
    required this.income,
    required this.expense,
    required this.count,
  });

  double get net => income - expense;
}
