import 'package:drift/drift.dart';

/// Cards table - stores card data locally
class Cards extends Table {
  TextColumn get id => text()();
  TextColumn get userId => text()();
  TextColumn get type => text()();
  TextColumn get status => text()();
  TextColumn get maskedPan => text()();
  TextColumn get cardholderName => text().nullable()();
  TextColumn get expiryMonth => text().nullable()();
  TextColumn get expiryYear => text().nullable()();
  TextColumn get brand => text().nullable()();
  TextColumn get walletId => text().nullable()();
  RealColumn get balance => real().nullable()();
  RealColumn get spendingLimit => real().nullable()();
  BoolColumn get isFrozen => boolean().withDefault(const Constant(false))();
  BoolColumn get isVirtual => boolean().withDefault(const Constant(false))();
  TextColumn get color => text().nullable()();
  TextColumn get designId => text().nullable()();
  TextColumn get settings => text().nullable()(); // JSON string
  DateTimeColumn get createdAt => dateTime().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
