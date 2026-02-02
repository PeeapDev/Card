import 'package:drift/drift.dart';

/// Transaction sync status
class SyncStatus {
  static const String pending = 'pending';
  static const String syncing = 'syncing';
  static const String synced = 'synced';
  static const String failed = 'failed';
}

/// Transactions table - stores all transactions locally
/// Server is authoritative; local is for offline access and pending syncs
class Transactions extends Table {
  // Use local UUID for offline-created transactions
  TextColumn get id => text()();
  // Server ID (null for pending transactions)
  TextColumn get serverId => text().nullable()();
  TextColumn get type => text()();
  RealColumn get amount => real()();
  TextColumn get currency => text()();
  TextColumn get status => text()();
  TextColumn get description => text().nullable()();
  TextColumn get reference => text().nullable()();
  TextColumn get senderWalletId => text().nullable()();
  TextColumn get receiverWalletId => text().nullable()();
  TextColumn get senderName => text().nullable()();
  TextColumn get receiverName => text().nullable()();
  TextColumn get senderPhone => text().nullable()();
  TextColumn get receiverPhone => text().nullable()();
  TextColumn get merchantName => text().nullable()();
  TextColumn get merchantLogo => text().nullable()();
  TextColumn get category => text().nullable()();
  RealColumn get fee => real().nullable()();
  TextColumn get metadata => text().nullable()(); // JSON string

  // Sync tracking
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();
  IntColumn get syncAttempts => integer().withDefault(const Constant(0))();
  TextColumn get syncError => text().nullable()();
  DateTimeColumn get lastSyncAttempt => dateTime().nullable()();

  // Timestamps
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get syncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
