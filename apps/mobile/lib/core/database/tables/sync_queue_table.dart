import 'package:drift/drift.dart';

/// Sync operation types
class SyncOperation {
  static const String create = 'create';
  static const String update = 'update';
  static const String delete = 'delete';
}

/// Sync queue table - manages pending sync operations
/// This is the queue for all data that needs to be synced to the server
class SyncQueue extends Table {
  IntColumn get id => integer().autoIncrement()();

  /// The table/entity this operation applies to (e.g., 'transactions', 'wallets')
  TextColumn get entityType => text()();

  /// The local ID of the entity
  TextColumn get entityId => text()();

  /// Operation type: create, update, delete
  TextColumn get operation => text()();

  /// JSON payload to send to server
  TextColumn get payload => text()();

  /// Sync status: pending, syncing, synced, failed
  TextColumn get status => text().withDefault(const Constant('pending'))();

  /// Priority (lower = higher priority)
  IntColumn get priority => integer().withDefault(const Constant(5))();

  /// Number of sync attempts
  IntColumn get attempts => integer().withDefault(const Constant(0))();

  /// Maximum retry attempts
  IntColumn get maxAttempts => integer().withDefault(const Constant(5))();

  /// Error message from last failed attempt
  TextColumn get errorMessage => text().nullable()();

  /// When this operation was queued
  DateTimeColumn get createdAt => dateTime()();

  /// Last sync attempt timestamp
  DateTimeColumn get lastAttemptAt => dateTime().nullable()();

  /// Next retry timestamp (for exponential backoff)
  DateTimeColumn get nextRetryAt => dateTime().nullable()();

  /// When successfully synced
  DateTimeColumn get syncedAt => dateTime().nullable()();
}
