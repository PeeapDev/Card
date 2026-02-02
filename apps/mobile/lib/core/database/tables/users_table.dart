import 'package:drift/drift.dart';

/// Users table - stores user profile data locally
class Users extends Table {
  TextColumn get id => text()();
  TextColumn get email => text()();
  TextColumn get phone => text().nullable()();
  TextColumn get firstName => text().nullable()();
  TextColumn get lastName => text().nullable()();
  TextColumn get avatarUrl => text().nullable()();
  BoolColumn get isVerified => boolean().withDefault(const Constant(false))();
  BoolColumn get isMerchant => boolean().withDefault(const Constant(false))();
  TextColumn get role => text().withDefault(const Constant('user'))();
  TextColumn get kycStatus => text().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
