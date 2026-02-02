import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../database/app_database.dart';
import '../database/tables/sync_queue_table.dart';
import '../database/tables/transactions_table.dart';

/// Sync state for UI feedback
enum SyncState {
  idle,
  syncing,
  error,
  offline,
}

/// Sync status notifier
class SyncStatusNotifier extends StateNotifier<SyncState> {
  SyncStatusNotifier() : super(SyncState.idle);

  void setSyncing() => state = SyncState.syncing;
  void setIdle() => state = SyncState.idle;
  void setError() => state = SyncState.error;
  void setOffline() => state = SyncState.offline;
}

final syncStatusProvider = StateNotifierProvider<SyncStatusNotifier, SyncState>(
  (ref) => SyncStatusNotifier(),
);

/// Provider for the sync service
final syncServiceProvider = Provider<SyncService>((ref) {
  final db = ref.watch(appDatabaseProvider);
  final supabase = Supabase.instance.client;
  final statusNotifier = ref.read(syncStatusProvider.notifier);
  return SyncService(db, supabase, statusNotifier);
});

/// Provider for the database
final appDatabaseProvider = Provider<AppDatabase>((ref) {
  return AppDatabase();
});

/// Background sync service with retry logic and exponential backoff
class SyncService {
  final AppDatabase _db;
  final SupabaseClient _supabase;
  final SyncStatusNotifier _statusNotifier;

  Timer? _syncTimer;
  StreamSubscription? _connectivitySubscription;
  bool _isOnline = true;
  bool _isSyncing = false;

  // Sync configuration
  static const _syncIntervalSeconds = 30;
  static const _maxRetryAttempts = 5;
  static const _baseRetryDelaySeconds = 2;

  SyncService(this._db, this._supabase, this._statusNotifier);

  /// Initialize the sync service
  Future<void> initialize() async {
    // Monitor connectivity
    _connectivitySubscription = Connectivity()
        .onConnectivityChanged
        .listen(_handleConnectivityChange);

    // Check initial connectivity
    final connectivityResults = await Connectivity().checkConnectivity();
    _isOnline = !connectivityResults.contains(ConnectivityResult.none);

    if (_isOnline) {
      // Start periodic sync
      _startPeriodicSync();
      // Initial sync
      await syncAll();
    } else {
      _statusNotifier.setOffline();
    }
  }

  /// Handle connectivity changes
  void _handleConnectivityChange(List<ConnectivityResult> results) {
    final wasOffline = !_isOnline;
    _isOnline = !results.contains(ConnectivityResult.none) && results.isNotEmpty;

    if (_isOnline) {
      _statusNotifier.setIdle();
      if (wasOffline) {
        // Just came online - sync immediately
        debugPrint('Connection restored - syncing pending data');
        syncAll();
      }
      _startPeriodicSync();
    } else {
      _statusNotifier.setOffline();
      _stopPeriodicSync();
    }
  }

  /// Start periodic background sync
  void _startPeriodicSync() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(
      const Duration(seconds: _syncIntervalSeconds),
      (_) => syncAll(),
    );
  }

  /// Stop periodic sync
  void _stopPeriodicSync() {
    _syncTimer?.cancel();
    _syncTimer = null;
  }

  /// Sync all pending data
  Future<void> syncAll() async {
    if (!_isOnline || _isSyncing) return;

    _isSyncing = true;
    _statusNotifier.setSyncing();

    try {
      // Sync in order of priority
      await _syncPendingTransactions();
      await _syncQueuedItems();
      await _pullServerUpdates();

      _statusNotifier.setIdle();
    } catch (e) {
      debugPrint('Sync error: $e');
      _statusNotifier.setError();
    } finally {
      _isSyncing = false;
    }
  }

  /// Sync pending transactions to server
  Future<void> _syncPendingTransactions() async {
    final pendingTx = await _db.getPendingTransactions();

    for (final tx in pendingTx) {
      try {
        await _db.updateTransactionSyncStatus(
          tx.id,
          status: SyncStatus.syncing,
        );

        // Send to server
        final response = await _supabase
            .from('transactions')
            .insert({
              'type': tx.type,
              'amount': tx.amount,
              'currency': tx.currency,
              'status': tx.status,
              'description': tx.description,
              'reference': tx.reference,
              'sender_wallet_id': tx.senderWalletId,
              'receiver_wallet_id': tx.receiverWalletId,
              'sender_name': tx.senderName,
              'receiver_name': tx.receiverName,
              'fee': tx.fee,
              'metadata': tx.metadata != null ? jsonDecode(tx.metadata!) : null,
              'created_at': tx.createdAt.toIso8601String(),
            })
            .select()
            .single();

        // Update local with server ID and mark as synced
        await _db.updateTransactionSyncStatus(
          tx.id,
          status: SyncStatus.synced,
          serverId: response['id'] as String,
        );

        debugPrint('Transaction ${tx.id} synced successfully');
      } catch (e) {
        debugPrint('Failed to sync transaction ${tx.id}: $e');
        await _db.updateTransactionSyncStatus(
          tx.id,
          status: SyncStatus.failed,
          error: e.toString(),
        );
      }
    }
  }

  /// Process sync queue items with retry logic
  Future<void> _syncQueuedItems() async {
    final queueItems = await _db.getPendingSyncItems(limit: 10);

    for (final item in queueItems) {
      try {
        await _db.updateSyncQueueItem(item.id, status: 'syncing');
        await _db.incrementSyncAttempts(item.id);

        await _processSyncQueueItem(item);

        await _db.updateSyncQueueItem(item.id, status: 'synced');
        debugPrint('Sync queue item ${item.id} completed');
      } catch (e) {
        debugPrint('Sync queue item ${item.id} failed: $e');

        final attempts = item.attempts + 1;
        if (attempts >= _maxRetryAttempts) {
          // Mark as permanently failed
          await _db.updateSyncQueueItem(
            item.id,
            status: 'failed',
            errorMessage: e.toString(),
          );
        } else {
          // Calculate next retry with exponential backoff
          final delaySeconds = _calculateBackoff(attempts);
          final nextRetry = DateTime.now().add(Duration(seconds: delaySeconds));

          await _db.updateSyncQueueItem(
            item.id,
            status: 'pending',
            errorMessage: e.toString(),
            nextRetryAt: nextRetry,
          );
        }
      }
    }
  }

  /// Process a single sync queue item
  Future<void> _processSyncQueueItem(SyncQueueData item) async {
    final payload = jsonDecode(item.payload) as Map<String, dynamic>;

    switch (item.entityType) {
      case 'wallets':
        await _syncWalletOperation(item.operation, item.entityId, payload);
        break;
      case 'contacts':
        await _syncContactOperation(item.operation, item.entityId, payload);
        break;
      case 'cards':
        await _syncCardOperation(item.operation, item.entityId, payload);
        break;
      default:
        throw Exception('Unknown entity type: ${item.entityType}');
    }
  }

  Future<void> _syncWalletOperation(
    String operation,
    String entityId,
    Map<String, dynamic> payload,
  ) async {
    switch (operation) {
      case SyncOperation.create:
        await _supabase.from('wallets').insert(payload);
        break;
      case SyncOperation.update:
        await _supabase.from('wallets').update(payload).eq('id', entityId);
        break;
      case SyncOperation.delete:
        await _supabase.from('wallets').delete().eq('id', entityId);
        break;
    }
  }

  Future<void> _syncContactOperation(
    String operation,
    String entityId,
    Map<String, dynamic> payload,
  ) async {
    switch (operation) {
      case SyncOperation.create:
        await _supabase.from('contacts').insert(payload);
        break;
      case SyncOperation.update:
        await _supabase.from('contacts').update(payload).eq('id', entityId);
        break;
      case SyncOperation.delete:
        await _supabase.from('contacts').delete().eq('id', entityId);
        break;
    }
  }

  Future<void> _syncCardOperation(
    String operation,
    String entityId,
    Map<String, dynamic> payload,
  ) async {
    switch (operation) {
      case SyncOperation.create:
        await _supabase.from('cards').insert(payload);
        break;
      case SyncOperation.update:
        await _supabase.from('cards').update(payload).eq('id', entityId);
        break;
      case SyncOperation.delete:
        await _supabase.from('cards').delete().eq('id', entityId);
        break;
    }
  }

  /// Pull updates from server
  Future<void> _pullServerUpdates() async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return;

    try {
      // Pull latest wallets
      await _pullWallets(userId);

      // Pull latest transactions
      await _pullTransactions(userId);

      // Pull latest cards
      await _pullCards(userId);

      debugPrint('Server pull completed');
    } catch (e) {
      debugPrint('Failed to pull server updates: $e');
    }
  }

  Future<void> _pullWallets(String userId) async {
    final wallets = await _supabase
        .from('wallets')
        .select()
        .eq('user_id', userId)
        .order('created_at');

    for (final wallet in wallets) {
      await _db.upsertWallet(WalletsCompanion(
        id: Value(wallet['id'] as String),
        userId: Value(wallet['user_id'] as String),
        name: Value(wallet['name'] as String),
        type: Value(wallet['type'] as String),
        balance: Value((wallet['balance'] as num).toDouble()),
        currency: Value(wallet['currency'] as String? ?? 'SLE'),
        isActive: Value(wallet['is_active'] as bool? ?? true),
        isFrozen: Value(wallet['is_frozen'] as bool? ?? false),
        isPrimary: Value(wallet['is_primary'] as bool? ?? false),
        accountNumber: Value(wallet['account_number'] as String?),
        lastSyncedAt: Value(DateTime.now()),
      ));
    }
  }

  Future<void> _pullTransactions(String userId) async {
    // Get local wallets to filter transactions
    final localWallets = await _db.getWallets(userId);
    final walletIds = localWallets.map((w) => w.id).toList();

    if (walletIds.isEmpty) return;

    // Pull recent transactions (last 30 days)
    final since = DateTime.now().subtract(const Duration(days: 30));
    final transactions = await _supabase
        .from('transactions')
        .select()
        .or('sender_wallet_id.in.(${walletIds.join(",")}),receiver_wallet_id.in.(${walletIds.join(",")})')
        .gte('created_at', since.toIso8601String())
        .order('created_at', ascending: false)
        .limit(100);

    for (final tx in transactions) {
      final serverId = tx['id'] as String;

      // Check if we already have this transaction
      final existing = await _db.getTransaction(serverId);
      if (existing != null) continue;

      await _db.insertTransaction(TransactionsCompanion(
        id: Value(serverId),
        serverId: Value(serverId),
        type: Value(tx['type'] as String),
        amount: Value((tx['amount'] as num).toDouble()),
        currency: Value(tx['currency'] as String),
        status: Value(tx['status'] as String),
        description: Value(tx['description'] as String?),
        reference: Value(tx['reference'] as String?),
        senderWalletId: Value(tx['sender_wallet_id'] as String?),
        receiverWalletId: Value(tx['receiver_wallet_id'] as String?),
        senderName: Value(tx['sender_name'] as String?),
        receiverName: Value(tx['receiver_name'] as String?),
        fee: Value((tx['fee'] as num?)?.toDouble()),
        syncStatus: const Value(SyncStatus.synced),
        createdAt: Value(DateTime.parse(tx['created_at'] as String)),
        syncedAt: Value(DateTime.now()),
      ));
    }
  }

  Future<void> _pullCards(String userId) async {
    final cards = await _supabase
        .from('cards')
        .select()
        .eq('user_id', userId)
        .order('created_at');

    for (final card in cards) {
      await _db.upsertCard(CardsCompanion(
        id: Value(card['id'] as String),
        userId: Value(card['user_id'] as String),
        type: Value(card['type'] as String),
        status: Value(card['status'] as String),
        maskedPan: Value(card['masked_pan'] as String),
        cardholderName: Value(card['cardholder_name'] as String?),
        expiryMonth: Value(card['expiry_month'] as String?),
        expiryYear: Value(card['expiry_year'] as String?),
        brand: Value(card['brand'] as String?),
        walletId: Value(card['wallet_id'] as String?),
        isFrozen: Value(card['is_frozen'] as bool? ?? false),
        isVirtual: Value(card['is_virtual'] as bool? ?? false),
        lastSyncedAt: Value(DateTime.now()),
      ));
    }
  }

  /// Calculate exponential backoff delay
  int _calculateBackoff(int attempts) {
    // Exponential backoff with jitter
    final exponentialDelay = _baseRetryDelaySeconds * pow(2, attempts - 1);
    final jitter = Random().nextInt(_baseRetryDelaySeconds);
    return (exponentialDelay + jitter).toInt().clamp(1, 300); // Max 5 minutes
  }

  /// Add item to sync queue
  Future<void> queueSync({
    required String entityType,
    required String entityId,
    required String operation,
    required Map<String, dynamic> payload,
    int priority = 5,
  }) async {
    await _db.addToSyncQueue(SyncQueueCompanion(
      entityType: Value(entityType),
      entityId: Value(entityId),
      operation: Value(operation),
      payload: Value(jsonEncode(payload)),
      status: const Value('pending'),
      priority: Value(priority),
      createdAt: Value(DateTime.now()),
    ));

    // Trigger immediate sync if online
    if (_isOnline && !_isSyncing) {
      syncAll();
    }
  }

  /// Force sync now
  Future<void> forceSyncNow() async {
    if (!_isOnline) {
      throw Exception('Cannot sync while offline');
    }
    await syncAll();
  }

  /// Check if there are pending items to sync
  Future<int> getPendingCount() async {
    final items = await _db.getPendingSyncItems(limit: 1000);
    return items.length;
  }

  /// Clean up old synced items
  Future<void> cleanup() async {
    await _db.clearCompletedSyncItems();
  }

  /// Dispose resources
  void dispose() {
    _syncTimer?.cancel();
    _connectivitySubscription?.cancel();
  }
}
