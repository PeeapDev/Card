import 'package:drift/drift.dart';

/// Contacts table - stores payment contacts locally
/// Enables WhatsApp-style contact-based payments offline
class Contacts extends Table {
  TextColumn get id => text()();
  TextColumn get userId => text()(); // Owner of this contact entry
  TextColumn get contactUserId => text().nullable()(); // Peeap user ID if registered
  TextColumn get name => text()();
  TextColumn get phone => text()();
  TextColumn get email => text().nullable()();
  TextColumn get avatarUrl => text().nullable()();
  BoolColumn get isPeeapUser => boolean().withDefault(const Constant(false))();
  BoolColumn get isFavorite => boolean().withDefault(const Constant(false))();
  IntColumn get transactionCount => integer().withDefault(const Constant(0))();
  RealColumn get totalSent => real().withDefault(const Constant(0.0))();
  RealColumn get totalReceived => real().withDefault(const Constant(0.0))();
  DateTimeColumn get lastTransactionAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Recent recipients for quick access
class RecentRecipients extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get userId => text()();
  TextColumn get contactId => text()();
  TextColumn get contactPhone => text()();
  TextColumn get contactName => text()();
  RealColumn get lastAmount => real().nullable()();
  TextColumn get lastCurrency => text().nullable()();
  DateTimeColumn get usedAt => dateTime()();
}
