import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

import 'tables/users_table.dart';
import 'tables/wallets_table.dart';
import 'tables/transactions_table.dart';
import 'tables/cards_table.dart';
import 'tables/sync_queue_table.dart';
import 'tables/contacts_table.dart';

part 'app_database.g.dart';

/// Main application database using Drift (SQLite)
/// This is the single source of truth for offline-first architecture
@DriftDatabase(
  tables: [
    Users,
    Wallets,
    Transactions,
    Cards,
    SyncQueue,
    Contacts,
    RecentRecipients,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  // For testing
  AppDatabase.forTesting(super.e);

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
      },
      onUpgrade: (Migrator m, int from, int to) async {
        // Handle migrations here as schema evolves
        if (from < 2) {
          // Example: await m.addColumn(wallets, wallets.someNewColumn);
        }
      },
      beforeOpen: (details) async {
        // Enable foreign keys
        await customStatement('PRAGMA foreign_keys = ON');
      },
    );
  }

  // ==================== User Operations ====================

  Future<User?> getUser(String id) {
    return (select(users)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<int> upsertUser(UsersCompanion user) {
    return into(users).insertOnConflictUpdate(user);
  }

  Future<int> deleteUser(String id) {
    return (delete(users)..where((t) => t.id.equals(id))).go();
  }

  // ==================== Wallet Operations ====================

  Stream<List<Wallet>> watchWallets(String userId) {
    return (select(wallets)
          ..where((t) => t.userId.equals(userId))
          ..orderBy([(t) => OrderingTerm.desc(t.isPrimary)]))
        .watch();
  }

  Future<List<Wallet>> getWallets(String userId) {
    return (select(wallets)
          ..where((t) => t.userId.equals(userId))
          ..orderBy([(t) => OrderingTerm.desc(t.isPrimary)]))
        .get();
  }

  Future<Wallet?> getWallet(String id) {
    return (select(wallets)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<Wallet?> getPrimaryWallet(String userId) {
    return (select(wallets)
          ..where((t) => t.userId.equals(userId) & t.isPrimary.equals(true)))
        .getSingleOrNull();
  }

  Future<int> upsertWallet(WalletsCompanion wallet) {
    return into(wallets).insertOnConflictUpdate(wallet);
  }

  Future<void> updateWalletBalance(String id, double balance) {
    return (update(wallets)..where((t) => t.id.equals(id)))
        .write(WalletsCompanion(balance: Value(balance)));
  }

  // ==================== Transaction Operations ====================

  Stream<List<Transaction>> watchTransactions(String walletId, {int limit = 50}) {
    return (select(transactions)
          ..where((t) =>
              t.senderWalletId.equals(walletId) |
              t.receiverWalletId.equals(walletId))
          ..orderBy([(t) => OrderingTerm.desc(t.createdAt)])
          ..limit(limit))
        .watch();
  }

  Future<List<Transaction>> getTransactions(String walletId, {int limit = 50, int offset = 0}) {
    return (select(transactions)
          ..where((t) =>
              t.senderWalletId.equals(walletId) |
              t.receiverWalletId.equals(walletId))
          ..orderBy([(t) => OrderingTerm.desc(t.createdAt)])
          ..limit(limit, offset: offset))
        .get();
  }

  Future<Transaction?> getTransaction(String id) {
    return (select(transactions)..where((t) => t.id.equals(id)))
        .getSingleOrNull();
  }

  Future<List<Transaction>> getPendingTransactions() {
    return (select(transactions)
          ..where((t) => t.syncStatus.equals(SyncStatus.pending))
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
        .get();
  }

  Future<int> insertTransaction(TransactionsCompanion tx) {
    return into(transactions).insert(tx);
  }

  Future<int> updateTransaction(String id, TransactionsCompanion tx) {
    return (update(transactions)..where((t) => t.id.equals(id))).write(tx);
  }

  Future<void> updateTransactionSyncStatus(
    String id, {
    required String status,
    String? serverId,
    String? error,
  }) {
    return (update(transactions)..where((t) => t.id.equals(id))).write(
      TransactionsCompanion(
        syncStatus: Value(status),
        serverId: serverId != null ? Value(serverId) : const Value.absent(),
        syncError: error != null ? Value(error) : const Value.absent(),
        syncAttempts: const Value.absent(),
        lastSyncAttempt: Value(DateTime.now()),
        syncedAt: status == SyncStatus.synced ? Value(DateTime.now()) : const Value.absent(),
      ),
    );
  }

  // ==================== Sync Queue Operations ====================

  Future<List<SyncQueueData>> getPendingSyncItems({int limit = 10}) {
    return (select(syncQueue)
          ..where((t) =>
              t.status.equals('pending') &
              (t.nextRetryAt.isNull() | t.nextRetryAt.isSmallerOrEqualValue(DateTime.now())))
          ..orderBy([
            (t) => OrderingTerm.asc(t.priority),
            (t) => OrderingTerm.asc(t.createdAt),
          ])
          ..limit(limit))
        .get();
  }

  Future<int> addToSyncQueue(SyncQueueCompanion item) {
    return into(syncQueue).insert(item);
  }

  Future<void> updateSyncQueueItem(
    int id, {
    required String status,
    String? errorMessage,
    DateTime? nextRetryAt,
  }) {
    return (update(syncQueue)..where((t) => t.id.equals(id))).write(
      SyncQueueCompanion(
        status: Value(status),
        attempts: const Value.absent(), // Will be incremented separately
        errorMessage: errorMessage != null ? Value(errorMessage) : const Value.absent(),
        lastAttemptAt: Value(DateTime.now()),
        nextRetryAt: nextRetryAt != null ? Value(nextRetryAt) : const Value.absent(),
        syncedAt: status == 'synced' ? Value(DateTime.now()) : const Value.absent(),
      ),
    );
  }

  Future<void> incrementSyncAttempts(int id) {
    return customStatement(
      'UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?',
      [id],
    );
  }

  Future<int> deleteSyncQueueItem(int id) {
    return (delete(syncQueue)..where((t) => t.id.equals(id))).go();
  }

  Future<int> clearCompletedSyncItems() {
    return (delete(syncQueue)
          ..where((t) => t.status.equals('synced') & t.syncedAt.isSmallerThanValue(
              DateTime.now().subtract(const Duration(days: 7)))))
        .go();
  }

  // ==================== Contact Operations ====================

  Stream<List<Contact>> watchContacts(String userId) {
    return (select(contacts)
          ..where((t) => t.userId.equals(userId))
          ..orderBy([
            (t) => OrderingTerm.desc(t.isFavorite),
            (t) => OrderingTerm.desc(t.transactionCount),
            (t) => OrderingTerm.asc(t.name),
          ]))
        .watch();
  }

  Future<Contact?> getContactByPhone(String userId, String phone) {
    return (select(contacts)
          ..where((t) => t.userId.equals(userId) & t.phone.equals(phone)))
        .getSingleOrNull();
  }

  Future<int> upsertContact(ContactsCompanion contact) {
    return into(contacts).insertOnConflictUpdate(contact);
  }

  Future<void> updateContactTransactionStats(
    String id, {
    required bool isSent,
    required double amount,
  }) {
    final now = DateTime.now();
    return customStatement(
      '''
      UPDATE contacts
      SET transaction_count = transaction_count + 1,
          ${isSent ? 'total_sent = total_sent + ?' : 'total_received = total_received + ?'},
          last_transaction_at = ?,
          updated_at = ?
      WHERE id = ?
      ''',
      [amount, now.millisecondsSinceEpoch, now.millisecondsSinceEpoch, id],
    );
  }

  // ==================== Recent Recipients ====================

  Future<List<RecentRecipient>> getRecentRecipients(String userId, {int limit = 10}) {
    return (select(recentRecipients)
          ..where((t) => t.userId.equals(userId))
          ..orderBy([(t) => OrderingTerm.desc(t.usedAt)])
          ..limit(limit))
        .get();
  }

  Future<void> addRecentRecipient(RecentRecipientsCompanion recipient) {
    return transaction(() async {
      // Remove old entry if exists
      await (delete(recentRecipients)
            ..where((t) =>
                t.userId.equals(recipient.userId.value) &
                t.contactPhone.equals(recipient.contactPhone.value)))
          .go();
      // Add new entry
      await into(recentRecipients).insert(recipient);
      // Keep only last 20
      await customStatement('''
        DELETE FROM recent_recipients
        WHERE user_id = ? AND id NOT IN (
          SELECT id FROM recent_recipients
          WHERE user_id = ?
          ORDER BY used_at DESC
          LIMIT 20
        )
      ''', [recipient.userId.value, recipient.userId.value]);
    });
  }

  // ==================== Card Operations ====================

  Stream<List<Card>> watchCards(String userId) {
    return (select(cards)
          ..where((t) => t.userId.equals(userId))
          ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
        .watch();
  }

  Future<Card?> getCard(String id) {
    return (select(cards)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<List<Card>> getCards(String userId) {
    return (select(cards)
          ..where((t) => t.userId.equals(userId))
          ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
        .get();
  }

  Future<int> upsertCard(CardsCompanion card) {
    return into(cards).insertOnConflictUpdate(card);
  }

  // ==================== Utility Operations ====================

  Future<void> clearAllData() async {
    await delete(recentRecipients).go();
    await delete(contacts).go();
    await delete(syncQueue).go();
    await delete(transactions).go();
    await delete(cards).go();
    await delete(wallets).go();
    await delete(users).go();
  }

  Future<void> clearUserData(String userId) async {
    await (delete(recentRecipients)..where((t) => t.userId.equals(userId))).go();
    await (delete(contacts)..where((t) => t.userId.equals(userId))).go();
    await (delete(cards)..where((t) => t.userId.equals(userId))).go();
    await (delete(wallets)..where((t) => t.userId.equals(userId))).go();
    await (delete(users)..where((t) => t.id.equals(userId))).go();
  }
}

/// Opens the database connection
LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'peeap_db.sqlite'));

    if (kDebugMode) {
      print('Database path: ${file.path}');
    }

    return NativeDatabase.createInBackground(file);
  });
}
