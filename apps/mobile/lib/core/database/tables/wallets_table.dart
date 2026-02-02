import 'package:drift/drift.dart';

/// Wallets table - stores wallet data locally
/// Balance is display-only; server is authoritative
class Wallets extends Table {
  TextColumn get id => text()();
  TextColumn get userId => text()();
  TextColumn get name => text()();
  TextColumn get type => text()();
  RealColumn get balance => real().withDefault(const Constant(0.0))();
  RealColumn get pendingBalance => real().withDefault(const Constant(0.0))();
  TextColumn get currency => text().withDefault(const Constant('SLE'))();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  BoolColumn get isFrozen => boolean().withDefault(const Constant(false))();
  BoolColumn get isPrimary => boolean().withDefault(const Constant(false))();
  TextColumn get accountNumber => text().nullable()();
  TextColumn get color => text().nullable()();
  TextColumn get icon => text().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
