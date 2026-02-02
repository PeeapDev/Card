// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $UsersTable extends Users with TableInfo<$UsersTable, User> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $UsersTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _emailMeta = const VerificationMeta('email');
  @override
  late final GeneratedColumn<String> email = GeneratedColumn<String>(
      'email', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _phoneMeta = const VerificationMeta('phone');
  @override
  late final GeneratedColumn<String> phone = GeneratedColumn<String>(
      'phone', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _firstNameMeta =
      const VerificationMeta('firstName');
  @override
  late final GeneratedColumn<String> firstName = GeneratedColumn<String>(
      'first_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _lastNameMeta =
      const VerificationMeta('lastName');
  @override
  late final GeneratedColumn<String> lastName = GeneratedColumn<String>(
      'last_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _avatarUrlMeta =
      const VerificationMeta('avatarUrl');
  @override
  late final GeneratedColumn<String> avatarUrl = GeneratedColumn<String>(
      'avatar_url', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _isVerifiedMeta =
      const VerificationMeta('isVerified');
  @override
  late final GeneratedColumn<bool> isVerified = GeneratedColumn<bool>(
      'is_verified', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_verified" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _isMerchantMeta =
      const VerificationMeta('isMerchant');
  @override
  late final GeneratedColumn<bool> isMerchant = GeneratedColumn<bool>(
      'is_merchant', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_merchant" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _roleMeta = const VerificationMeta('role');
  @override
  late final GeneratedColumn<String> role = GeneratedColumn<String>(
      'role', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('user'));
  static const VerificationMeta _kycStatusMeta =
      const VerificationMeta('kycStatus');
  @override
  late final GeneratedColumn<String> kycStatus = GeneratedColumn<String>(
      'kyc_status', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _lastSyncedAtMeta =
      const VerificationMeta('lastSyncedAt');
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
      'last_synced_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        email,
        phone,
        firstName,
        lastName,
        avatarUrl,
        isVerified,
        isMerchant,
        role,
        kycStatus,
        createdAt,
        updatedAt,
        lastSyncedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'users';
  @override
  VerificationContext validateIntegrity(Insertable<User> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('email')) {
      context.handle(
          _emailMeta, email.isAcceptableOrUnknown(data['email']!, _emailMeta));
    } else if (isInserting) {
      context.missing(_emailMeta);
    }
    if (data.containsKey('phone')) {
      context.handle(
          _phoneMeta, phone.isAcceptableOrUnknown(data['phone']!, _phoneMeta));
    }
    if (data.containsKey('first_name')) {
      context.handle(_firstNameMeta,
          firstName.isAcceptableOrUnknown(data['first_name']!, _firstNameMeta));
    }
    if (data.containsKey('last_name')) {
      context.handle(_lastNameMeta,
          lastName.isAcceptableOrUnknown(data['last_name']!, _lastNameMeta));
    }
    if (data.containsKey('avatar_url')) {
      context.handle(_avatarUrlMeta,
          avatarUrl.isAcceptableOrUnknown(data['avatar_url']!, _avatarUrlMeta));
    }
    if (data.containsKey('is_verified')) {
      context.handle(
          _isVerifiedMeta,
          isVerified.isAcceptableOrUnknown(
              data['is_verified']!, _isVerifiedMeta));
    }
    if (data.containsKey('is_merchant')) {
      context.handle(
          _isMerchantMeta,
          isMerchant.isAcceptableOrUnknown(
              data['is_merchant']!, _isMerchantMeta));
    }
    if (data.containsKey('role')) {
      context.handle(
          _roleMeta, role.isAcceptableOrUnknown(data['role']!, _roleMeta));
    }
    if (data.containsKey('kyc_status')) {
      context.handle(_kycStatusMeta,
          kycStatus.isAcceptableOrUnknown(data['kyc_status']!, _kycStatusMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
          _lastSyncedAtMeta,
          lastSyncedAt.isAcceptableOrUnknown(
              data['last_synced_at']!, _lastSyncedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  User map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return User(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      email: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}email'])!,
      phone: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}phone']),
      firstName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}first_name']),
      lastName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}last_name']),
      avatarUrl: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}avatar_url']),
      isVerified: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_verified'])!,
      isMerchant: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_merchant'])!,
      role: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}role'])!,
      kycStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kyc_status']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at']),
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at']),
      lastSyncedAt: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_synced_at']),
    );
  }

  @override
  $UsersTable createAlias(String alias) {
    return $UsersTable(attachedDatabase, alias);
  }
}

class User extends DataClass implements Insertable<User> {
  final String id;
  final String email;
  final String? phone;
  final String? firstName;
  final String? lastName;
  final String? avatarUrl;
  final bool isVerified;
  final bool isMerchant;
  final String role;
  final String? kycStatus;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? lastSyncedAt;
  const User(
      {required this.id,
      required this.email,
      this.phone,
      this.firstName,
      this.lastName,
      this.avatarUrl,
      required this.isVerified,
      required this.isMerchant,
      required this.role,
      this.kycStatus,
      this.createdAt,
      this.updatedAt,
      this.lastSyncedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['email'] = Variable<String>(email);
    if (!nullToAbsent || phone != null) {
      map['phone'] = Variable<String>(phone);
    }
    if (!nullToAbsent || firstName != null) {
      map['first_name'] = Variable<String>(firstName);
    }
    if (!nullToAbsent || lastName != null) {
      map['last_name'] = Variable<String>(lastName);
    }
    if (!nullToAbsent || avatarUrl != null) {
      map['avatar_url'] = Variable<String>(avatarUrl);
    }
    map['is_verified'] = Variable<bool>(isVerified);
    map['is_merchant'] = Variable<bool>(isMerchant);
    map['role'] = Variable<String>(role);
    if (!nullToAbsent || kycStatus != null) {
      map['kyc_status'] = Variable<String>(kycStatus);
    }
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<DateTime>(createdAt);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<DateTime>(updatedAt);
    }
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  UsersCompanion toCompanion(bool nullToAbsent) {
    return UsersCompanion(
      id: Value(id),
      email: Value(email),
      phone:
          phone == null && nullToAbsent ? const Value.absent() : Value(phone),
      firstName: firstName == null && nullToAbsent
          ? const Value.absent()
          : Value(firstName),
      lastName: lastName == null && nullToAbsent
          ? const Value.absent()
          : Value(lastName),
      avatarUrl: avatarUrl == null && nullToAbsent
          ? const Value.absent()
          : Value(avatarUrl),
      isVerified: Value(isVerified),
      isMerchant: Value(isMerchant),
      role: Value(role),
      kycStatus: kycStatus == null && nullToAbsent
          ? const Value.absent()
          : Value(kycStatus),
      createdAt: createdAt == null && nullToAbsent
          ? const Value.absent()
          : Value(createdAt),
      updatedAt: updatedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(updatedAt),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory User.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return User(
      id: serializer.fromJson<String>(json['id']),
      email: serializer.fromJson<String>(json['email']),
      phone: serializer.fromJson<String?>(json['phone']),
      firstName: serializer.fromJson<String?>(json['firstName']),
      lastName: serializer.fromJson<String?>(json['lastName']),
      avatarUrl: serializer.fromJson<String?>(json['avatarUrl']),
      isVerified: serializer.fromJson<bool>(json['isVerified']),
      isMerchant: serializer.fromJson<bool>(json['isMerchant']),
      role: serializer.fromJson<String>(json['role']),
      kycStatus: serializer.fromJson<String?>(json['kycStatus']),
      createdAt: serializer.fromJson<DateTime?>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime?>(json['updatedAt']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'email': serializer.toJson<String>(email),
      'phone': serializer.toJson<String?>(phone),
      'firstName': serializer.toJson<String?>(firstName),
      'lastName': serializer.toJson<String?>(lastName),
      'avatarUrl': serializer.toJson<String?>(avatarUrl),
      'isVerified': serializer.toJson<bool>(isVerified),
      'isMerchant': serializer.toJson<bool>(isMerchant),
      'role': serializer.toJson<String>(role),
      'kycStatus': serializer.toJson<String?>(kycStatus),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  User copyWith(
          {String? id,
          String? email,
          Value<String?> phone = const Value.absent(),
          Value<String?> firstName = const Value.absent(),
          Value<String?> lastName = const Value.absent(),
          Value<String?> avatarUrl = const Value.absent(),
          bool? isVerified,
          bool? isMerchant,
          String? role,
          Value<String?> kycStatus = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> lastSyncedAt = const Value.absent()}) =>
      User(
        id: id ?? this.id,
        email: email ?? this.email,
        phone: phone.present ? phone.value : this.phone,
        firstName: firstName.present ? firstName.value : this.firstName,
        lastName: lastName.present ? lastName.value : this.lastName,
        avatarUrl: avatarUrl.present ? avatarUrl.value : this.avatarUrl,
        isVerified: isVerified ?? this.isVerified,
        isMerchant: isMerchant ?? this.isMerchant,
        role: role ?? this.role,
        kycStatus: kycStatus.present ? kycStatus.value : this.kycStatus,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        lastSyncedAt:
            lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
      );
  User copyWithCompanion(UsersCompanion data) {
    return User(
      id: data.id.present ? data.id.value : this.id,
      email: data.email.present ? data.email.value : this.email,
      phone: data.phone.present ? data.phone.value : this.phone,
      firstName: data.firstName.present ? data.firstName.value : this.firstName,
      lastName: data.lastName.present ? data.lastName.value : this.lastName,
      avatarUrl: data.avatarUrl.present ? data.avatarUrl.value : this.avatarUrl,
      isVerified:
          data.isVerified.present ? data.isVerified.value : this.isVerified,
      isMerchant:
          data.isMerchant.present ? data.isMerchant.value : this.isMerchant,
      role: data.role.present ? data.role.value : this.role,
      kycStatus: data.kycStatus.present ? data.kycStatus.value : this.kycStatus,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('User(')
          ..write('id: $id, ')
          ..write('email: $email, ')
          ..write('phone: $phone, ')
          ..write('firstName: $firstName, ')
          ..write('lastName: $lastName, ')
          ..write('avatarUrl: $avatarUrl, ')
          ..write('isVerified: $isVerified, ')
          ..write('isMerchant: $isMerchant, ')
          ..write('role: $role, ')
          ..write('kycStatus: $kycStatus, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      email,
      phone,
      firstName,
      lastName,
      avatarUrl,
      isVerified,
      isMerchant,
      role,
      kycStatus,
      createdAt,
      updatedAt,
      lastSyncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is User &&
          other.id == this.id &&
          other.email == this.email &&
          other.phone == this.phone &&
          other.firstName == this.firstName &&
          other.lastName == this.lastName &&
          other.avatarUrl == this.avatarUrl &&
          other.isVerified == this.isVerified &&
          other.isMerchant == this.isMerchant &&
          other.role == this.role &&
          other.kycStatus == this.kycStatus &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class UsersCompanion extends UpdateCompanion<User> {
  final Value<String> id;
  final Value<String> email;
  final Value<String?> phone;
  final Value<String?> firstName;
  final Value<String?> lastName;
  final Value<String?> avatarUrl;
  final Value<bool> isVerified;
  final Value<bool> isMerchant;
  final Value<String> role;
  final Value<String?> kycStatus;
  final Value<DateTime?> createdAt;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> lastSyncedAt;
  final Value<int> rowid;
  const UsersCompanion({
    this.id = const Value.absent(),
    this.email = const Value.absent(),
    this.phone = const Value.absent(),
    this.firstName = const Value.absent(),
    this.lastName = const Value.absent(),
    this.avatarUrl = const Value.absent(),
    this.isVerified = const Value.absent(),
    this.isMerchant = const Value.absent(),
    this.role = const Value.absent(),
    this.kycStatus = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  UsersCompanion.insert({
    required String id,
    required String email,
    this.phone = const Value.absent(),
    this.firstName = const Value.absent(),
    this.lastName = const Value.absent(),
    this.avatarUrl = const Value.absent(),
    this.isVerified = const Value.absent(),
    this.isMerchant = const Value.absent(),
    this.role = const Value.absent(),
    this.kycStatus = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        email = Value(email);
  static Insertable<User> custom({
    Expression<String>? id,
    Expression<String>? email,
    Expression<String>? phone,
    Expression<String>? firstName,
    Expression<String>? lastName,
    Expression<String>? avatarUrl,
    Expression<bool>? isVerified,
    Expression<bool>? isMerchant,
    Expression<String>? role,
    Expression<String>? kycStatus,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? lastSyncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (email != null) 'email': email,
      if (phone != null) 'phone': phone,
      if (firstName != null) 'first_name': firstName,
      if (lastName != null) 'last_name': lastName,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      if (isVerified != null) 'is_verified': isVerified,
      if (isMerchant != null) 'is_merchant': isMerchant,
      if (role != null) 'role': role,
      if (kycStatus != null) 'kyc_status': kycStatus,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  UsersCompanion copyWith(
      {Value<String>? id,
      Value<String>? email,
      Value<String?>? phone,
      Value<String?>? firstName,
      Value<String?>? lastName,
      Value<String?>? avatarUrl,
      Value<bool>? isVerified,
      Value<bool>? isMerchant,
      Value<String>? role,
      Value<String?>? kycStatus,
      Value<DateTime?>? createdAt,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? lastSyncedAt,
      Value<int>? rowid}) {
    return UsersCompanion(
      id: id ?? this.id,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      isVerified: isVerified ?? this.isVerified,
      isMerchant: isMerchant ?? this.isMerchant,
      role: role ?? this.role,
      kycStatus: kycStatus ?? this.kycStatus,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (email.present) {
      map['email'] = Variable<String>(email.value);
    }
    if (phone.present) {
      map['phone'] = Variable<String>(phone.value);
    }
    if (firstName.present) {
      map['first_name'] = Variable<String>(firstName.value);
    }
    if (lastName.present) {
      map['last_name'] = Variable<String>(lastName.value);
    }
    if (avatarUrl.present) {
      map['avatar_url'] = Variable<String>(avatarUrl.value);
    }
    if (isVerified.present) {
      map['is_verified'] = Variable<bool>(isVerified.value);
    }
    if (isMerchant.present) {
      map['is_merchant'] = Variable<bool>(isMerchant.value);
    }
    if (role.present) {
      map['role'] = Variable<String>(role.value);
    }
    if (kycStatus.present) {
      map['kyc_status'] = Variable<String>(kycStatus.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('UsersCompanion(')
          ..write('id: $id, ')
          ..write('email: $email, ')
          ..write('phone: $phone, ')
          ..write('firstName: $firstName, ')
          ..write('lastName: $lastName, ')
          ..write('avatarUrl: $avatarUrl, ')
          ..write('isVerified: $isVerified, ')
          ..write('isMerchant: $isMerchant, ')
          ..write('role: $role, ')
          ..write('kycStatus: $kycStatus, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $WalletsTable extends Wallets with TableInfo<$WalletsTable, Wallet> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $WalletsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _userIdMeta = const VerificationMeta('userId');
  @override
  late final GeneratedColumn<String> userId = GeneratedColumn<String>(
      'user_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
      'type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _balanceMeta =
      const VerificationMeta('balance');
  @override
  late final GeneratedColumn<double> balance = GeneratedColumn<double>(
      'balance', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _pendingBalanceMeta =
      const VerificationMeta('pendingBalance');
  @override
  late final GeneratedColumn<double> pendingBalance = GeneratedColumn<double>(
      'pending_balance', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _currencyMeta =
      const VerificationMeta('currency');
  @override
  late final GeneratedColumn<String> currency = GeneratedColumn<String>(
      'currency', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('SLE'));
  static const VerificationMeta _isActiveMeta =
      const VerificationMeta('isActive');
  @override
  late final GeneratedColumn<bool> isActive = GeneratedColumn<bool>(
      'is_active', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_active" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _isFrozenMeta =
      const VerificationMeta('isFrozen');
  @override
  late final GeneratedColumn<bool> isFrozen = GeneratedColumn<bool>(
      'is_frozen', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_frozen" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _isPrimaryMeta =
      const VerificationMeta('isPrimary');
  @override
  late final GeneratedColumn<bool> isPrimary = GeneratedColumn<bool>(
      'is_primary', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_primary" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _accountNumberMeta =
      const VerificationMeta('accountNumber');
  @override
  late final GeneratedColumn<String> accountNumber = GeneratedColumn<String>(
      'account_number', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _colorMeta = const VerificationMeta('color');
  @override
  late final GeneratedColumn<String> color = GeneratedColumn<String>(
      'color', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _iconMeta = const VerificationMeta('icon');
  @override
  late final GeneratedColumn<String> icon = GeneratedColumn<String>(
      'icon', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _lastSyncedAtMeta =
      const VerificationMeta('lastSyncedAt');
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
      'last_synced_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        userId,
        name,
        type,
        balance,
        pendingBalance,
        currency,
        isActive,
        isFrozen,
        isPrimary,
        accountNumber,
        color,
        icon,
        createdAt,
        updatedAt,
        lastSyncedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'wallets';
  @override
  VerificationContext validateIntegrity(Insertable<Wallet> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('user_id')) {
      context.handle(_userIdMeta,
          userId.isAcceptableOrUnknown(data['user_id']!, _userIdMeta));
    } else if (isInserting) {
      context.missing(_userIdMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('type')) {
      context.handle(
          _typeMeta, type.isAcceptableOrUnknown(data['type']!, _typeMeta));
    } else if (isInserting) {
      context.missing(_typeMeta);
    }
    if (data.containsKey('balance')) {
      context.handle(_balanceMeta,
          balance.isAcceptableOrUnknown(data['balance']!, _balanceMeta));
    }
    if (data.containsKey('pending_balance')) {
      context.handle(
          _pendingBalanceMeta,
          pendingBalance.isAcceptableOrUnknown(
              data['pending_balance']!, _pendingBalanceMeta));
    }
    if (data.containsKey('currency')) {
      context.handle(_currencyMeta,
          currency.isAcceptableOrUnknown(data['currency']!, _currencyMeta));
    }
    if (data.containsKey('is_active')) {
      context.handle(_isActiveMeta,
          isActive.isAcceptableOrUnknown(data['is_active']!, _isActiveMeta));
    }
    if (data.containsKey('is_frozen')) {
      context.handle(_isFrozenMeta,
          isFrozen.isAcceptableOrUnknown(data['is_frozen']!, _isFrozenMeta));
    }
    if (data.containsKey('is_primary')) {
      context.handle(_isPrimaryMeta,
          isPrimary.isAcceptableOrUnknown(data['is_primary']!, _isPrimaryMeta));
    }
    if (data.containsKey('account_number')) {
      context.handle(
          _accountNumberMeta,
          accountNumber.isAcceptableOrUnknown(
              data['account_number']!, _accountNumberMeta));
    }
    if (data.containsKey('color')) {
      context.handle(
          _colorMeta, color.isAcceptableOrUnknown(data['color']!, _colorMeta));
    }
    if (data.containsKey('icon')) {
      context.handle(
          _iconMeta, icon.isAcceptableOrUnknown(data['icon']!, _iconMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
          _lastSyncedAtMeta,
          lastSyncedAt.isAcceptableOrUnknown(
              data['last_synced_at']!, _lastSyncedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Wallet map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Wallet(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      userId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}user_id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      type: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}type'])!,
      balance: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}balance'])!,
      pendingBalance: attachedDatabase.typeMapping.read(
          DriftSqlType.double, data['${effectivePrefix}pending_balance'])!,
      currency: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}currency'])!,
      isActive: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_active'])!,
      isFrozen: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_frozen'])!,
      isPrimary: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_primary'])!,
      accountNumber: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}account_number']),
      color: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}color']),
      icon: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}icon']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at']),
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at']),
      lastSyncedAt: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_synced_at']),
    );
  }

  @override
  $WalletsTable createAlias(String alias) {
    return $WalletsTable(attachedDatabase, alias);
  }
}

class Wallet extends DataClass implements Insertable<Wallet> {
  final String id;
  final String userId;
  final String name;
  final String type;
  final double balance;
  final double pendingBalance;
  final String currency;
  final bool isActive;
  final bool isFrozen;
  final bool isPrimary;
  final String? accountNumber;
  final String? color;
  final String? icon;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? lastSyncedAt;
  const Wallet(
      {required this.id,
      required this.userId,
      required this.name,
      required this.type,
      required this.balance,
      required this.pendingBalance,
      required this.currency,
      required this.isActive,
      required this.isFrozen,
      required this.isPrimary,
      this.accountNumber,
      this.color,
      this.icon,
      this.createdAt,
      this.updatedAt,
      this.lastSyncedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['user_id'] = Variable<String>(userId);
    map['name'] = Variable<String>(name);
    map['type'] = Variable<String>(type);
    map['balance'] = Variable<double>(balance);
    map['pending_balance'] = Variable<double>(pendingBalance);
    map['currency'] = Variable<String>(currency);
    map['is_active'] = Variable<bool>(isActive);
    map['is_frozen'] = Variable<bool>(isFrozen);
    map['is_primary'] = Variable<bool>(isPrimary);
    if (!nullToAbsent || accountNumber != null) {
      map['account_number'] = Variable<String>(accountNumber);
    }
    if (!nullToAbsent || color != null) {
      map['color'] = Variable<String>(color);
    }
    if (!nullToAbsent || icon != null) {
      map['icon'] = Variable<String>(icon);
    }
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<DateTime>(createdAt);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<DateTime>(updatedAt);
    }
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  WalletsCompanion toCompanion(bool nullToAbsent) {
    return WalletsCompanion(
      id: Value(id),
      userId: Value(userId),
      name: Value(name),
      type: Value(type),
      balance: Value(balance),
      pendingBalance: Value(pendingBalance),
      currency: Value(currency),
      isActive: Value(isActive),
      isFrozen: Value(isFrozen),
      isPrimary: Value(isPrimary),
      accountNumber: accountNumber == null && nullToAbsent
          ? const Value.absent()
          : Value(accountNumber),
      color:
          color == null && nullToAbsent ? const Value.absent() : Value(color),
      icon: icon == null && nullToAbsent ? const Value.absent() : Value(icon),
      createdAt: createdAt == null && nullToAbsent
          ? const Value.absent()
          : Value(createdAt),
      updatedAt: updatedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(updatedAt),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory Wallet.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Wallet(
      id: serializer.fromJson<String>(json['id']),
      userId: serializer.fromJson<String>(json['userId']),
      name: serializer.fromJson<String>(json['name']),
      type: serializer.fromJson<String>(json['type']),
      balance: serializer.fromJson<double>(json['balance']),
      pendingBalance: serializer.fromJson<double>(json['pendingBalance']),
      currency: serializer.fromJson<String>(json['currency']),
      isActive: serializer.fromJson<bool>(json['isActive']),
      isFrozen: serializer.fromJson<bool>(json['isFrozen']),
      isPrimary: serializer.fromJson<bool>(json['isPrimary']),
      accountNumber: serializer.fromJson<String?>(json['accountNumber']),
      color: serializer.fromJson<String?>(json['color']),
      icon: serializer.fromJson<String?>(json['icon']),
      createdAt: serializer.fromJson<DateTime?>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime?>(json['updatedAt']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'userId': serializer.toJson<String>(userId),
      'name': serializer.toJson<String>(name),
      'type': serializer.toJson<String>(type),
      'balance': serializer.toJson<double>(balance),
      'pendingBalance': serializer.toJson<double>(pendingBalance),
      'currency': serializer.toJson<String>(currency),
      'isActive': serializer.toJson<bool>(isActive),
      'isFrozen': serializer.toJson<bool>(isFrozen),
      'isPrimary': serializer.toJson<bool>(isPrimary),
      'accountNumber': serializer.toJson<String?>(accountNumber),
      'color': serializer.toJson<String?>(color),
      'icon': serializer.toJson<String?>(icon),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  Wallet copyWith(
          {String? id,
          String? userId,
          String? name,
          String? type,
          double? balance,
          double? pendingBalance,
          String? currency,
          bool? isActive,
          bool? isFrozen,
          bool? isPrimary,
          Value<String?> accountNumber = const Value.absent(),
          Value<String?> color = const Value.absent(),
          Value<String?> icon = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> lastSyncedAt = const Value.absent()}) =>
      Wallet(
        id: id ?? this.id,
        userId: userId ?? this.userId,
        name: name ?? this.name,
        type: type ?? this.type,
        balance: balance ?? this.balance,
        pendingBalance: pendingBalance ?? this.pendingBalance,
        currency: currency ?? this.currency,
        isActive: isActive ?? this.isActive,
        isFrozen: isFrozen ?? this.isFrozen,
        isPrimary: isPrimary ?? this.isPrimary,
        accountNumber:
            accountNumber.present ? accountNumber.value : this.accountNumber,
        color: color.present ? color.value : this.color,
        icon: icon.present ? icon.value : this.icon,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        lastSyncedAt:
            lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
      );
  Wallet copyWithCompanion(WalletsCompanion data) {
    return Wallet(
      id: data.id.present ? data.id.value : this.id,
      userId: data.userId.present ? data.userId.value : this.userId,
      name: data.name.present ? data.name.value : this.name,
      type: data.type.present ? data.type.value : this.type,
      balance: data.balance.present ? data.balance.value : this.balance,
      pendingBalance: data.pendingBalance.present
          ? data.pendingBalance.value
          : this.pendingBalance,
      currency: data.currency.present ? data.currency.value : this.currency,
      isActive: data.isActive.present ? data.isActive.value : this.isActive,
      isFrozen: data.isFrozen.present ? data.isFrozen.value : this.isFrozen,
      isPrimary: data.isPrimary.present ? data.isPrimary.value : this.isPrimary,
      accountNumber: data.accountNumber.present
          ? data.accountNumber.value
          : this.accountNumber,
      color: data.color.present ? data.color.value : this.color,
      icon: data.icon.present ? data.icon.value : this.icon,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Wallet(')
          ..write('id: $id, ')
          ..write('userId: $userId, ')
          ..write('name: $name, ')
          ..write('type: $type, ')
          ..write('balance: $balance, ')
          ..write('pendingBalance: $pendingBalance, ')
          ..write('currency: $currency, ')
          ..write('isActive: $isActive, ')
          ..write('isFrozen: $isFrozen, ')
          ..write('isPrimary: $isPrimary, ')
          ..write('accountNumber: $accountNumber, ')
          ..write('color: $color, ')
          ..write('icon: $icon, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      userId,
      name,
      type,
      balance,
      pendingBalance,
      currency,
      isActive,
      isFrozen,
      isPrimary,
      accountNumber,
      color,
      icon,
      createdAt,
      updatedAt,
      lastSyncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Wallet &&
          other.id == this.id &&
          other.userId == this.userId &&
          other.name == this.name &&
          other.type == this.type &&
          other.balance == this.balance &&
          other.pendingBalance == this.pendingBalance &&
          other.currency == this.currency &&
          other.isActive == this.isActive &&
          other.isFrozen == this.isFrozen &&
          other.isPrimary == this.isPrimary &&
          other.accountNumber == this.accountNumber &&
          other.color == this.color &&
          other.icon == this.icon &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class WalletsCompanion extends UpdateCompanion<Wallet> {
  final Value<String> id;
  final Value<String> userId;
  final Value<String> name;
  final Value<String> type;
  final Value<double> balance;
  final Value<double> pendingBalance;
  final Value<String> currency;
  final Value<bool> isActive;
  final Value<bool> isFrozen;
  final Value<bool> isPrimary;
  final Value<String?> accountNumber;
  final Value<String?> color;
  final Value<String?> icon;
  final Value<DateTime?> createdAt;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> lastSyncedAt;
  final Value<int> rowid;
  const WalletsCompanion({
    this.id = const Value.absent(),
    this.userId = const Value.absent(),
    this.name = const Value.absent(),
    this.type = const Value.absent(),
    this.balance = const Value.absent(),
    this.pendingBalance = const Value.absent(),
    this.currency = const Value.absent(),
    this.isActive = const Value.absent(),
    this.isFrozen = const Value.absent(),
    this.isPrimary = const Value.absent(),
    this.accountNumber = const Value.absent(),
    this.color = const Value.absent(),
    this.icon = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  WalletsCompanion.insert({
    required String id,
    required String userId,
    required String name,
    required String type,
    this.balance = const Value.absent(),
    this.pendingBalance = const Value.absent(),
    this.currency = const Value.absent(),
    this.isActive = const Value.absent(),
    this.isFrozen = const Value.absent(),
    this.isPrimary = const Value.absent(),
    this.accountNumber = const Value.absent(),
    this.color = const Value.absent(),
    this.icon = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        userId = Value(userId),
        name = Value(name),
        type = Value(type);
  static Insertable<Wallet> custom({
    Expression<String>? id,
    Expression<String>? userId,
    Expression<String>? name,
    Expression<String>? type,
    Expression<double>? balance,
    Expression<double>? pendingBalance,
    Expression<String>? currency,
    Expression<bool>? isActive,
    Expression<bool>? isFrozen,
    Expression<bool>? isPrimary,
    Expression<String>? accountNumber,
    Expression<String>? color,
    Expression<String>? icon,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? lastSyncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (userId != null) 'user_id': userId,
      if (name != null) 'name': name,
      if (type != null) 'type': type,
      if (balance != null) 'balance': balance,
      if (pendingBalance != null) 'pending_balance': pendingBalance,
      if (currency != null) 'currency': currency,
      if (isActive != null) 'is_active': isActive,
      if (isFrozen != null) 'is_frozen': isFrozen,
      if (isPrimary != null) 'is_primary': isPrimary,
      if (accountNumber != null) 'account_number': accountNumber,
      if (color != null) 'color': color,
      if (icon != null) 'icon': icon,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  WalletsCompanion copyWith(
      {Value<String>? id,
      Value<String>? userId,
      Value<String>? name,
      Value<String>? type,
      Value<double>? balance,
      Value<double>? pendingBalance,
      Value<String>? currency,
      Value<bool>? isActive,
      Value<bool>? isFrozen,
      Value<bool>? isPrimary,
      Value<String?>? accountNumber,
      Value<String?>? color,
      Value<String?>? icon,
      Value<DateTime?>? createdAt,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? lastSyncedAt,
      Value<int>? rowid}) {
    return WalletsCompanion(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      type: type ?? this.type,
      balance: balance ?? this.balance,
      pendingBalance: pendingBalance ?? this.pendingBalance,
      currency: currency ?? this.currency,
      isActive: isActive ?? this.isActive,
      isFrozen: isFrozen ?? this.isFrozen,
      isPrimary: isPrimary ?? this.isPrimary,
      accountNumber: accountNumber ?? this.accountNumber,
      color: color ?? this.color,
      icon: icon ?? this.icon,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (userId.present) {
      map['user_id'] = Variable<String>(userId.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (balance.present) {
      map['balance'] = Variable<double>(balance.value);
    }
    if (pendingBalance.present) {
      map['pending_balance'] = Variable<double>(pendingBalance.value);
    }
    if (currency.present) {
      map['currency'] = Variable<String>(currency.value);
    }
    if (isActive.present) {
      map['is_active'] = Variable<bool>(isActive.value);
    }
    if (isFrozen.present) {
      map['is_frozen'] = Variable<bool>(isFrozen.value);
    }
    if (isPrimary.present) {
      map['is_primary'] = Variable<bool>(isPrimary.value);
    }
    if (accountNumber.present) {
      map['account_number'] = Variable<String>(accountNumber.value);
    }
    if (color.present) {
      map['color'] = Variable<String>(color.value);
    }
    if (icon.present) {
      map['icon'] = Variable<String>(icon.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('WalletsCompanion(')
          ..write('id: $id, ')
          ..write('userId: $userId, ')
          ..write('name: $name, ')
          ..write('type: $type, ')
          ..write('balance: $balance, ')
          ..write('pendingBalance: $pendingBalance, ')
          ..write('currency: $currency, ')
          ..write('isActive: $isActive, ')
          ..write('isFrozen: $isFrozen, ')
          ..write('isPrimary: $isPrimary, ')
          ..write('accountNumber: $accountNumber, ')
          ..write('color: $color, ')
          ..write('icon: $icon, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $TransactionsTable extends Transactions
    with TableInfo<$TransactionsTable, Transaction> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TransactionsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _serverIdMeta =
      const VerificationMeta('serverId');
  @override
  late final GeneratedColumn<String> serverId = GeneratedColumn<String>(
      'server_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
      'type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _amountMeta = const VerificationMeta('amount');
  @override
  late final GeneratedColumn<double> amount = GeneratedColumn<double>(
      'amount', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _currencyMeta =
      const VerificationMeta('currency');
  @override
  late final GeneratedColumn<String> currency = GeneratedColumn<String>(
      'currency', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _descriptionMeta =
      const VerificationMeta('description');
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
      'description', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _referenceMeta =
      const VerificationMeta('reference');
  @override
  late final GeneratedColumn<String> reference = GeneratedColumn<String>(
      'reference', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _senderWalletIdMeta =
      const VerificationMeta('senderWalletId');
  @override
  late final GeneratedColumn<String> senderWalletId = GeneratedColumn<String>(
      'sender_wallet_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _receiverWalletIdMeta =
      const VerificationMeta('receiverWalletId');
  @override
  late final GeneratedColumn<String> receiverWalletId = GeneratedColumn<String>(
      'receiver_wallet_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _senderNameMeta =
      const VerificationMeta('senderName');
  @override
  late final GeneratedColumn<String> senderName = GeneratedColumn<String>(
      'sender_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _receiverNameMeta =
      const VerificationMeta('receiverName');
  @override
  late final GeneratedColumn<String> receiverName = GeneratedColumn<String>(
      'receiver_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _senderPhoneMeta =
      const VerificationMeta('senderPhone');
  @override
  late final GeneratedColumn<String> senderPhone = GeneratedColumn<String>(
      'sender_phone', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _receiverPhoneMeta =
      const VerificationMeta('receiverPhone');
  @override
  late final GeneratedColumn<String> receiverPhone = GeneratedColumn<String>(
      'receiver_phone', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _merchantNameMeta =
      const VerificationMeta('merchantName');
  @override
  late final GeneratedColumn<String> merchantName = GeneratedColumn<String>(
      'merchant_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _merchantLogoMeta =
      const VerificationMeta('merchantLogo');
  @override
  late final GeneratedColumn<String> merchantLogo = GeneratedColumn<String>(
      'merchant_logo', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _categoryMeta =
      const VerificationMeta('category');
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
      'category', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _feeMeta = const VerificationMeta('fee');
  @override
  late final GeneratedColumn<double> fee = GeneratedColumn<double>(
      'fee', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _metadataMeta =
      const VerificationMeta('metadata');
  @override
  late final GeneratedColumn<String> metadata = GeneratedColumn<String>(
      'metadata', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _syncAttemptsMeta =
      const VerificationMeta('syncAttempts');
  @override
  late final GeneratedColumn<int> syncAttempts = GeneratedColumn<int>(
      'sync_attempts', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _syncErrorMeta =
      const VerificationMeta('syncError');
  @override
  late final GeneratedColumn<String> syncError = GeneratedColumn<String>(
      'sync_error', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _lastSyncAttemptMeta =
      const VerificationMeta('lastSyncAttempt');
  @override
  late final GeneratedColumn<DateTime> lastSyncAttempt =
      GeneratedColumn<DateTime>('last_sync_attempt', aliasedName, true,
          type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _syncedAtMeta =
      const VerificationMeta('syncedAt');
  @override
  late final GeneratedColumn<DateTime> syncedAt = GeneratedColumn<DateTime>(
      'synced_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        serverId,
        type,
        amount,
        currency,
        status,
        description,
        reference,
        senderWalletId,
        receiverWalletId,
        senderName,
        receiverName,
        senderPhone,
        receiverPhone,
        merchantName,
        merchantLogo,
        category,
        fee,
        metadata,
        syncStatus,
        syncAttempts,
        syncError,
        lastSyncAttempt,
        createdAt,
        updatedAt,
        syncedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'transactions';
  @override
  VerificationContext validateIntegrity(Insertable<Transaction> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('server_id')) {
      context.handle(_serverIdMeta,
          serverId.isAcceptableOrUnknown(data['server_id']!, _serverIdMeta));
    }
    if (data.containsKey('type')) {
      context.handle(
          _typeMeta, type.isAcceptableOrUnknown(data['type']!, _typeMeta));
    } else if (isInserting) {
      context.missing(_typeMeta);
    }
    if (data.containsKey('amount')) {
      context.handle(_amountMeta,
          amount.isAcceptableOrUnknown(data['amount']!, _amountMeta));
    } else if (isInserting) {
      context.missing(_amountMeta);
    }
    if (data.containsKey('currency')) {
      context.handle(_currencyMeta,
          currency.isAcceptableOrUnknown(data['currency']!, _currencyMeta));
    } else if (isInserting) {
      context.missing(_currencyMeta);
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    } else if (isInserting) {
      context.missing(_statusMeta);
    }
    if (data.containsKey('description')) {
      context.handle(
          _descriptionMeta,
          description.isAcceptableOrUnknown(
              data['description']!, _descriptionMeta));
    }
    if (data.containsKey('reference')) {
      context.handle(_referenceMeta,
          reference.isAcceptableOrUnknown(data['reference']!, _referenceMeta));
    }
    if (data.containsKey('sender_wallet_id')) {
      context.handle(
          _senderWalletIdMeta,
          senderWalletId.isAcceptableOrUnknown(
              data['sender_wallet_id']!, _senderWalletIdMeta));
    }
    if (data.containsKey('receiver_wallet_id')) {
      context.handle(
          _receiverWalletIdMeta,
          receiverWalletId.isAcceptableOrUnknown(
              data['receiver_wallet_id']!, _receiverWalletIdMeta));
    }
    if (data.containsKey('sender_name')) {
      context.handle(
          _senderNameMeta,
          senderName.isAcceptableOrUnknown(
              data['sender_name']!, _senderNameMeta));
    }
    if (data.containsKey('receiver_name')) {
      context.handle(
          _receiverNameMeta,
          receiverName.isAcceptableOrUnknown(
              data['receiver_name']!, _receiverNameMeta));
    }
    if (data.containsKey('sender_phone')) {
      context.handle(
          _senderPhoneMeta,
          senderPhone.isAcceptableOrUnknown(
              data['sender_phone']!, _senderPhoneMeta));
    }
    if (data.containsKey('receiver_phone')) {
      context.handle(
          _receiverPhoneMeta,
          receiverPhone.isAcceptableOrUnknown(
              data['receiver_phone']!, _receiverPhoneMeta));
    }
    if (data.containsKey('merchant_name')) {
      context.handle(
          _merchantNameMeta,
          merchantName.isAcceptableOrUnknown(
              data['merchant_name']!, _merchantNameMeta));
    }
    if (data.containsKey('merchant_logo')) {
      context.handle(
          _merchantLogoMeta,
          merchantLogo.isAcceptableOrUnknown(
              data['merchant_logo']!, _merchantLogoMeta));
    }
    if (data.containsKey('category')) {
      context.handle(_categoryMeta,
          category.isAcceptableOrUnknown(data['category']!, _categoryMeta));
    }
    if (data.containsKey('fee')) {
      context.handle(
          _feeMeta, fee.isAcceptableOrUnknown(data['fee']!, _feeMeta));
    }
    if (data.containsKey('metadata')) {
      context.handle(_metadataMeta,
          metadata.isAcceptableOrUnknown(data['metadata']!, _metadataMeta));
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('sync_attempts')) {
      context.handle(
          _syncAttemptsMeta,
          syncAttempts.isAcceptableOrUnknown(
              data['sync_attempts']!, _syncAttemptsMeta));
    }
    if (data.containsKey('sync_error')) {
      context.handle(_syncErrorMeta,
          syncError.isAcceptableOrUnknown(data['sync_error']!, _syncErrorMeta));
    }
    if (data.containsKey('last_sync_attempt')) {
      context.handle(
          _lastSyncAttemptMeta,
          lastSyncAttempt.isAcceptableOrUnknown(
              data['last_sync_attempt']!, _lastSyncAttemptMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('synced_at')) {
      context.handle(_syncedAtMeta,
          syncedAt.isAcceptableOrUnknown(data['synced_at']!, _syncedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Transaction map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Transaction(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      serverId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}server_id']),
      type: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}type'])!,
      amount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}amount'])!,
      currency: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}currency'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      description: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}description']),
      reference: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}reference']),
      senderWalletId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}sender_wallet_id']),
      receiverWalletId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}receiver_wallet_id']),
      senderName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sender_name']),
      receiverName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}receiver_name']),
      senderPhone: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sender_phone']),
      receiverPhone: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}receiver_phone']),
      merchantName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}merchant_name']),
      merchantLogo: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}merchant_logo']),
      category: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}category']),
      fee: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}fee']),
      metadata: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}metadata']),
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_status'])!,
      syncAttempts: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}sync_attempts'])!,
      syncError: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_error']),
      lastSyncAttempt: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_sync_attempt']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at']),
      syncedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}synced_at']),
    );
  }

  @override
  $TransactionsTable createAlias(String alias) {
    return $TransactionsTable(attachedDatabase, alias);
  }
}

class Transaction extends DataClass implements Insertable<Transaction> {
  final String id;
  final String? serverId;
  final String type;
  final double amount;
  final String currency;
  final String status;
  final String? description;
  final String? reference;
  final String? senderWalletId;
  final String? receiverWalletId;
  final String? senderName;
  final String? receiverName;
  final String? senderPhone;
  final String? receiverPhone;
  final String? merchantName;
  final String? merchantLogo;
  final String? category;
  final double? fee;
  final String? metadata;
  final String syncStatus;
  final int syncAttempts;
  final String? syncError;
  final DateTime? lastSyncAttempt;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final DateTime? syncedAt;
  const Transaction(
      {required this.id,
      this.serverId,
      required this.type,
      required this.amount,
      required this.currency,
      required this.status,
      this.description,
      this.reference,
      this.senderWalletId,
      this.receiverWalletId,
      this.senderName,
      this.receiverName,
      this.senderPhone,
      this.receiverPhone,
      this.merchantName,
      this.merchantLogo,
      this.category,
      this.fee,
      this.metadata,
      required this.syncStatus,
      required this.syncAttempts,
      this.syncError,
      this.lastSyncAttempt,
      required this.createdAt,
      this.updatedAt,
      this.syncedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || serverId != null) {
      map['server_id'] = Variable<String>(serverId);
    }
    map['type'] = Variable<String>(type);
    map['amount'] = Variable<double>(amount);
    map['currency'] = Variable<String>(currency);
    map['status'] = Variable<String>(status);
    if (!nullToAbsent || description != null) {
      map['description'] = Variable<String>(description);
    }
    if (!nullToAbsent || reference != null) {
      map['reference'] = Variable<String>(reference);
    }
    if (!nullToAbsent || senderWalletId != null) {
      map['sender_wallet_id'] = Variable<String>(senderWalletId);
    }
    if (!nullToAbsent || receiverWalletId != null) {
      map['receiver_wallet_id'] = Variable<String>(receiverWalletId);
    }
    if (!nullToAbsent || senderName != null) {
      map['sender_name'] = Variable<String>(senderName);
    }
    if (!nullToAbsent || receiverName != null) {
      map['receiver_name'] = Variable<String>(receiverName);
    }
    if (!nullToAbsent || senderPhone != null) {
      map['sender_phone'] = Variable<String>(senderPhone);
    }
    if (!nullToAbsent || receiverPhone != null) {
      map['receiver_phone'] = Variable<String>(receiverPhone);
    }
    if (!nullToAbsent || merchantName != null) {
      map['merchant_name'] = Variable<String>(merchantName);
    }
    if (!nullToAbsent || merchantLogo != null) {
      map['merchant_logo'] = Variable<String>(merchantLogo);
    }
    if (!nullToAbsent || category != null) {
      map['category'] = Variable<String>(category);
    }
    if (!nullToAbsent || fee != null) {
      map['fee'] = Variable<double>(fee);
    }
    if (!nullToAbsent || metadata != null) {
      map['metadata'] = Variable<String>(metadata);
    }
    map['sync_status'] = Variable<String>(syncStatus);
    map['sync_attempts'] = Variable<int>(syncAttempts);
    if (!nullToAbsent || syncError != null) {
      map['sync_error'] = Variable<String>(syncError);
    }
    if (!nullToAbsent || lastSyncAttempt != null) {
      map['last_sync_attempt'] = Variable<DateTime>(lastSyncAttempt);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<DateTime>(updatedAt);
    }
    if (!nullToAbsent || syncedAt != null) {
      map['synced_at'] = Variable<DateTime>(syncedAt);
    }
    return map;
  }

  TransactionsCompanion toCompanion(bool nullToAbsent) {
    return TransactionsCompanion(
      id: Value(id),
      serverId: serverId == null && nullToAbsent
          ? const Value.absent()
          : Value(serverId),
      type: Value(type),
      amount: Value(amount),
      currency: Value(currency),
      status: Value(status),
      description: description == null && nullToAbsent
          ? const Value.absent()
          : Value(description),
      reference: reference == null && nullToAbsent
          ? const Value.absent()
          : Value(reference),
      senderWalletId: senderWalletId == null && nullToAbsent
          ? const Value.absent()
          : Value(senderWalletId),
      receiverWalletId: receiverWalletId == null && nullToAbsent
          ? const Value.absent()
          : Value(receiverWalletId),
      senderName: senderName == null && nullToAbsent
          ? const Value.absent()
          : Value(senderName),
      receiverName: receiverName == null && nullToAbsent
          ? const Value.absent()
          : Value(receiverName),
      senderPhone: senderPhone == null && nullToAbsent
          ? const Value.absent()
          : Value(senderPhone),
      receiverPhone: receiverPhone == null && nullToAbsent
          ? const Value.absent()
          : Value(receiverPhone),
      merchantName: merchantName == null && nullToAbsent
          ? const Value.absent()
          : Value(merchantName),
      merchantLogo: merchantLogo == null && nullToAbsent
          ? const Value.absent()
          : Value(merchantLogo),
      category: category == null && nullToAbsent
          ? const Value.absent()
          : Value(category),
      fee: fee == null && nullToAbsent ? const Value.absent() : Value(fee),
      metadata: metadata == null && nullToAbsent
          ? const Value.absent()
          : Value(metadata),
      syncStatus: Value(syncStatus),
      syncAttempts: Value(syncAttempts),
      syncError: syncError == null && nullToAbsent
          ? const Value.absent()
          : Value(syncError),
      lastSyncAttempt: lastSyncAttempt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncAttempt),
      createdAt: Value(createdAt),
      updatedAt: updatedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(updatedAt),
      syncedAt: syncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(syncedAt),
    );
  }

  factory Transaction.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Transaction(
      id: serializer.fromJson<String>(json['id']),
      serverId: serializer.fromJson<String?>(json['serverId']),
      type: serializer.fromJson<String>(json['type']),
      amount: serializer.fromJson<double>(json['amount']),
      currency: serializer.fromJson<String>(json['currency']),
      status: serializer.fromJson<String>(json['status']),
      description: serializer.fromJson<String?>(json['description']),
      reference: serializer.fromJson<String?>(json['reference']),
      senderWalletId: serializer.fromJson<String?>(json['senderWalletId']),
      receiverWalletId: serializer.fromJson<String?>(json['receiverWalletId']),
      senderName: serializer.fromJson<String?>(json['senderName']),
      receiverName: serializer.fromJson<String?>(json['receiverName']),
      senderPhone: serializer.fromJson<String?>(json['senderPhone']),
      receiverPhone: serializer.fromJson<String?>(json['receiverPhone']),
      merchantName: serializer.fromJson<String?>(json['merchantName']),
      merchantLogo: serializer.fromJson<String?>(json['merchantLogo']),
      category: serializer.fromJson<String?>(json['category']),
      fee: serializer.fromJson<double?>(json['fee']),
      metadata: serializer.fromJson<String?>(json['metadata']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      syncAttempts: serializer.fromJson<int>(json['syncAttempts']),
      syncError: serializer.fromJson<String?>(json['syncError']),
      lastSyncAttempt: serializer.fromJson<DateTime?>(json['lastSyncAttempt']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime?>(json['updatedAt']),
      syncedAt: serializer.fromJson<DateTime?>(json['syncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'serverId': serializer.toJson<String?>(serverId),
      'type': serializer.toJson<String>(type),
      'amount': serializer.toJson<double>(amount),
      'currency': serializer.toJson<String>(currency),
      'status': serializer.toJson<String>(status),
      'description': serializer.toJson<String?>(description),
      'reference': serializer.toJson<String?>(reference),
      'senderWalletId': serializer.toJson<String?>(senderWalletId),
      'receiverWalletId': serializer.toJson<String?>(receiverWalletId),
      'senderName': serializer.toJson<String?>(senderName),
      'receiverName': serializer.toJson<String?>(receiverName),
      'senderPhone': serializer.toJson<String?>(senderPhone),
      'receiverPhone': serializer.toJson<String?>(receiverPhone),
      'merchantName': serializer.toJson<String?>(merchantName),
      'merchantLogo': serializer.toJson<String?>(merchantLogo),
      'category': serializer.toJson<String?>(category),
      'fee': serializer.toJson<double?>(fee),
      'metadata': serializer.toJson<String?>(metadata),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'syncAttempts': serializer.toJson<int>(syncAttempts),
      'syncError': serializer.toJson<String?>(syncError),
      'lastSyncAttempt': serializer.toJson<DateTime?>(lastSyncAttempt),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'syncedAt': serializer.toJson<DateTime?>(syncedAt),
    };
  }

  Transaction copyWith(
          {String? id,
          Value<String?> serverId = const Value.absent(),
          String? type,
          double? amount,
          String? currency,
          String? status,
          Value<String?> description = const Value.absent(),
          Value<String?> reference = const Value.absent(),
          Value<String?> senderWalletId = const Value.absent(),
          Value<String?> receiverWalletId = const Value.absent(),
          Value<String?> senderName = const Value.absent(),
          Value<String?> receiverName = const Value.absent(),
          Value<String?> senderPhone = const Value.absent(),
          Value<String?> receiverPhone = const Value.absent(),
          Value<String?> merchantName = const Value.absent(),
          Value<String?> merchantLogo = const Value.absent(),
          Value<String?> category = const Value.absent(),
          Value<double?> fee = const Value.absent(),
          Value<String?> metadata = const Value.absent(),
          String? syncStatus,
          int? syncAttempts,
          Value<String?> syncError = const Value.absent(),
          Value<DateTime?> lastSyncAttempt = const Value.absent(),
          DateTime? createdAt,
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> syncedAt = const Value.absent()}) =>
      Transaction(
        id: id ?? this.id,
        serverId: serverId.present ? serverId.value : this.serverId,
        type: type ?? this.type,
        amount: amount ?? this.amount,
        currency: currency ?? this.currency,
        status: status ?? this.status,
        description: description.present ? description.value : this.description,
        reference: reference.present ? reference.value : this.reference,
        senderWalletId:
            senderWalletId.present ? senderWalletId.value : this.senderWalletId,
        receiverWalletId: receiverWalletId.present
            ? receiverWalletId.value
            : this.receiverWalletId,
        senderName: senderName.present ? senderName.value : this.senderName,
        receiverName:
            receiverName.present ? receiverName.value : this.receiverName,
        senderPhone: senderPhone.present ? senderPhone.value : this.senderPhone,
        receiverPhone:
            receiverPhone.present ? receiverPhone.value : this.receiverPhone,
        merchantName:
            merchantName.present ? merchantName.value : this.merchantName,
        merchantLogo:
            merchantLogo.present ? merchantLogo.value : this.merchantLogo,
        category: category.present ? category.value : this.category,
        fee: fee.present ? fee.value : this.fee,
        metadata: metadata.present ? metadata.value : this.metadata,
        syncStatus: syncStatus ?? this.syncStatus,
        syncAttempts: syncAttempts ?? this.syncAttempts,
        syncError: syncError.present ? syncError.value : this.syncError,
        lastSyncAttempt: lastSyncAttempt.present
            ? lastSyncAttempt.value
            : this.lastSyncAttempt,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        syncedAt: syncedAt.present ? syncedAt.value : this.syncedAt,
      );
  Transaction copyWithCompanion(TransactionsCompanion data) {
    return Transaction(
      id: data.id.present ? data.id.value : this.id,
      serverId: data.serverId.present ? data.serverId.value : this.serverId,
      type: data.type.present ? data.type.value : this.type,
      amount: data.amount.present ? data.amount.value : this.amount,
      currency: data.currency.present ? data.currency.value : this.currency,
      status: data.status.present ? data.status.value : this.status,
      description:
          data.description.present ? data.description.value : this.description,
      reference: data.reference.present ? data.reference.value : this.reference,
      senderWalletId: data.senderWalletId.present
          ? data.senderWalletId.value
          : this.senderWalletId,
      receiverWalletId: data.receiverWalletId.present
          ? data.receiverWalletId.value
          : this.receiverWalletId,
      senderName:
          data.senderName.present ? data.senderName.value : this.senderName,
      receiverName: data.receiverName.present
          ? data.receiverName.value
          : this.receiverName,
      senderPhone:
          data.senderPhone.present ? data.senderPhone.value : this.senderPhone,
      receiverPhone: data.receiverPhone.present
          ? data.receiverPhone.value
          : this.receiverPhone,
      merchantName: data.merchantName.present
          ? data.merchantName.value
          : this.merchantName,
      merchantLogo: data.merchantLogo.present
          ? data.merchantLogo.value
          : this.merchantLogo,
      category: data.category.present ? data.category.value : this.category,
      fee: data.fee.present ? data.fee.value : this.fee,
      metadata: data.metadata.present ? data.metadata.value : this.metadata,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      syncAttempts: data.syncAttempts.present
          ? data.syncAttempts.value
          : this.syncAttempts,
      syncError: data.syncError.present ? data.syncError.value : this.syncError,
      lastSyncAttempt: data.lastSyncAttempt.present
          ? data.lastSyncAttempt.value
          : this.lastSyncAttempt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      syncedAt: data.syncedAt.present ? data.syncedAt.value : this.syncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Transaction(')
          ..write('id: $id, ')
          ..write('serverId: $serverId, ')
          ..write('type: $type, ')
          ..write('amount: $amount, ')
          ..write('currency: $currency, ')
          ..write('status: $status, ')
          ..write('description: $description, ')
          ..write('reference: $reference, ')
          ..write('senderWalletId: $senderWalletId, ')
          ..write('receiverWalletId: $receiverWalletId, ')
          ..write('senderName: $senderName, ')
          ..write('receiverName: $receiverName, ')
          ..write('senderPhone: $senderPhone, ')
          ..write('receiverPhone: $receiverPhone, ')
          ..write('merchantName: $merchantName, ')
          ..write('merchantLogo: $merchantLogo, ')
          ..write('category: $category, ')
          ..write('fee: $fee, ')
          ..write('metadata: $metadata, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('syncAttempts: $syncAttempts, ')
          ..write('syncError: $syncError, ')
          ..write('lastSyncAttempt: $lastSyncAttempt, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('syncedAt: $syncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
        id,
        serverId,
        type,
        amount,
        currency,
        status,
        description,
        reference,
        senderWalletId,
        receiverWalletId,
        senderName,
        receiverName,
        senderPhone,
        receiverPhone,
        merchantName,
        merchantLogo,
        category,
        fee,
        metadata,
        syncStatus,
        syncAttempts,
        syncError,
        lastSyncAttempt,
        createdAt,
        updatedAt,
        syncedAt
      ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Transaction &&
          other.id == this.id &&
          other.serverId == this.serverId &&
          other.type == this.type &&
          other.amount == this.amount &&
          other.currency == this.currency &&
          other.status == this.status &&
          other.description == this.description &&
          other.reference == this.reference &&
          other.senderWalletId == this.senderWalletId &&
          other.receiverWalletId == this.receiverWalletId &&
          other.senderName == this.senderName &&
          other.receiverName == this.receiverName &&
          other.senderPhone == this.senderPhone &&
          other.receiverPhone == this.receiverPhone &&
          other.merchantName == this.merchantName &&
          other.merchantLogo == this.merchantLogo &&
          other.category == this.category &&
          other.fee == this.fee &&
          other.metadata == this.metadata &&
          other.syncStatus == this.syncStatus &&
          other.syncAttempts == this.syncAttempts &&
          other.syncError == this.syncError &&
          other.lastSyncAttempt == this.lastSyncAttempt &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.syncedAt == this.syncedAt);
}

class TransactionsCompanion extends UpdateCompanion<Transaction> {
  final Value<String> id;
  final Value<String?> serverId;
  final Value<String> type;
  final Value<double> amount;
  final Value<String> currency;
  final Value<String> status;
  final Value<String?> description;
  final Value<String?> reference;
  final Value<String?> senderWalletId;
  final Value<String?> receiverWalletId;
  final Value<String?> senderName;
  final Value<String?> receiverName;
  final Value<String?> senderPhone;
  final Value<String?> receiverPhone;
  final Value<String?> merchantName;
  final Value<String?> merchantLogo;
  final Value<String?> category;
  final Value<double?> fee;
  final Value<String?> metadata;
  final Value<String> syncStatus;
  final Value<int> syncAttempts;
  final Value<String?> syncError;
  final Value<DateTime?> lastSyncAttempt;
  final Value<DateTime> createdAt;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> syncedAt;
  final Value<int> rowid;
  const TransactionsCompanion({
    this.id = const Value.absent(),
    this.serverId = const Value.absent(),
    this.type = const Value.absent(),
    this.amount = const Value.absent(),
    this.currency = const Value.absent(),
    this.status = const Value.absent(),
    this.description = const Value.absent(),
    this.reference = const Value.absent(),
    this.senderWalletId = const Value.absent(),
    this.receiverWalletId = const Value.absent(),
    this.senderName = const Value.absent(),
    this.receiverName = const Value.absent(),
    this.senderPhone = const Value.absent(),
    this.receiverPhone = const Value.absent(),
    this.merchantName = const Value.absent(),
    this.merchantLogo = const Value.absent(),
    this.category = const Value.absent(),
    this.fee = const Value.absent(),
    this.metadata = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.syncAttempts = const Value.absent(),
    this.syncError = const Value.absent(),
    this.lastSyncAttempt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  TransactionsCompanion.insert({
    required String id,
    this.serverId = const Value.absent(),
    required String type,
    required double amount,
    required String currency,
    required String status,
    this.description = const Value.absent(),
    this.reference = const Value.absent(),
    this.senderWalletId = const Value.absent(),
    this.receiverWalletId = const Value.absent(),
    this.senderName = const Value.absent(),
    this.receiverName = const Value.absent(),
    this.senderPhone = const Value.absent(),
    this.receiverPhone = const Value.absent(),
    this.merchantName = const Value.absent(),
    this.merchantLogo = const Value.absent(),
    this.category = const Value.absent(),
    this.fee = const Value.absent(),
    this.metadata = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.syncAttempts = const Value.absent(),
    this.syncError = const Value.absent(),
    this.lastSyncAttempt = const Value.absent(),
    required DateTime createdAt,
    this.updatedAt = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        type = Value(type),
        amount = Value(amount),
        currency = Value(currency),
        status = Value(status),
        createdAt = Value(createdAt);
  static Insertable<Transaction> custom({
    Expression<String>? id,
    Expression<String>? serverId,
    Expression<String>? type,
    Expression<double>? amount,
    Expression<String>? currency,
    Expression<String>? status,
    Expression<String>? description,
    Expression<String>? reference,
    Expression<String>? senderWalletId,
    Expression<String>? receiverWalletId,
    Expression<String>? senderName,
    Expression<String>? receiverName,
    Expression<String>? senderPhone,
    Expression<String>? receiverPhone,
    Expression<String>? merchantName,
    Expression<String>? merchantLogo,
    Expression<String>? category,
    Expression<double>? fee,
    Expression<String>? metadata,
    Expression<String>? syncStatus,
    Expression<int>? syncAttempts,
    Expression<String>? syncError,
    Expression<DateTime>? lastSyncAttempt,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? syncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (serverId != null) 'server_id': serverId,
      if (type != null) 'type': type,
      if (amount != null) 'amount': amount,
      if (currency != null) 'currency': currency,
      if (status != null) 'status': status,
      if (description != null) 'description': description,
      if (reference != null) 'reference': reference,
      if (senderWalletId != null) 'sender_wallet_id': senderWalletId,
      if (receiverWalletId != null) 'receiver_wallet_id': receiverWalletId,
      if (senderName != null) 'sender_name': senderName,
      if (receiverName != null) 'receiver_name': receiverName,
      if (senderPhone != null) 'sender_phone': senderPhone,
      if (receiverPhone != null) 'receiver_phone': receiverPhone,
      if (merchantName != null) 'merchant_name': merchantName,
      if (merchantLogo != null) 'merchant_logo': merchantLogo,
      if (category != null) 'category': category,
      if (fee != null) 'fee': fee,
      if (metadata != null) 'metadata': metadata,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (syncAttempts != null) 'sync_attempts': syncAttempts,
      if (syncError != null) 'sync_error': syncError,
      if (lastSyncAttempt != null) 'last_sync_attempt': lastSyncAttempt,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (syncedAt != null) 'synced_at': syncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  TransactionsCompanion copyWith(
      {Value<String>? id,
      Value<String?>? serverId,
      Value<String>? type,
      Value<double>? amount,
      Value<String>? currency,
      Value<String>? status,
      Value<String?>? description,
      Value<String?>? reference,
      Value<String?>? senderWalletId,
      Value<String?>? receiverWalletId,
      Value<String?>? senderName,
      Value<String?>? receiverName,
      Value<String?>? senderPhone,
      Value<String?>? receiverPhone,
      Value<String?>? merchantName,
      Value<String?>? merchantLogo,
      Value<String?>? category,
      Value<double?>? fee,
      Value<String?>? metadata,
      Value<String>? syncStatus,
      Value<int>? syncAttempts,
      Value<String?>? syncError,
      Value<DateTime?>? lastSyncAttempt,
      Value<DateTime>? createdAt,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? syncedAt,
      Value<int>? rowid}) {
    return TransactionsCompanion(
      id: id ?? this.id,
      serverId: serverId ?? this.serverId,
      type: type ?? this.type,
      amount: amount ?? this.amount,
      currency: currency ?? this.currency,
      status: status ?? this.status,
      description: description ?? this.description,
      reference: reference ?? this.reference,
      senderWalletId: senderWalletId ?? this.senderWalletId,
      receiverWalletId: receiverWalletId ?? this.receiverWalletId,
      senderName: senderName ?? this.senderName,
      receiverName: receiverName ?? this.receiverName,
      senderPhone: senderPhone ?? this.senderPhone,
      receiverPhone: receiverPhone ?? this.receiverPhone,
      merchantName: merchantName ?? this.merchantName,
      merchantLogo: merchantLogo ?? this.merchantLogo,
      category: category ?? this.category,
      fee: fee ?? this.fee,
      metadata: metadata ?? this.metadata,
      syncStatus: syncStatus ?? this.syncStatus,
      syncAttempts: syncAttempts ?? this.syncAttempts,
      syncError: syncError ?? this.syncError,
      lastSyncAttempt: lastSyncAttempt ?? this.lastSyncAttempt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      syncedAt: syncedAt ?? this.syncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (serverId.present) {
      map['server_id'] = Variable<String>(serverId.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (amount.present) {
      map['amount'] = Variable<double>(amount.value);
    }
    if (currency.present) {
      map['currency'] = Variable<String>(currency.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (description.present) {
      map['description'] = Variable<String>(description.value);
    }
    if (reference.present) {
      map['reference'] = Variable<String>(reference.value);
    }
    if (senderWalletId.present) {
      map['sender_wallet_id'] = Variable<String>(senderWalletId.value);
    }
    if (receiverWalletId.present) {
      map['receiver_wallet_id'] = Variable<String>(receiverWalletId.value);
    }
    if (senderName.present) {
      map['sender_name'] = Variable<String>(senderName.value);
    }
    if (receiverName.present) {
      map['receiver_name'] = Variable<String>(receiverName.value);
    }
    if (senderPhone.present) {
      map['sender_phone'] = Variable<String>(senderPhone.value);
    }
    if (receiverPhone.present) {
      map['receiver_phone'] = Variable<String>(receiverPhone.value);
    }
    if (merchantName.present) {
      map['merchant_name'] = Variable<String>(merchantName.value);
    }
    if (merchantLogo.present) {
      map['merchant_logo'] = Variable<String>(merchantLogo.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (fee.present) {
      map['fee'] = Variable<double>(fee.value);
    }
    if (metadata.present) {
      map['metadata'] = Variable<String>(metadata.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (syncAttempts.present) {
      map['sync_attempts'] = Variable<int>(syncAttempts.value);
    }
    if (syncError.present) {
      map['sync_error'] = Variable<String>(syncError.value);
    }
    if (lastSyncAttempt.present) {
      map['last_sync_attempt'] = Variable<DateTime>(lastSyncAttempt.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (syncedAt.present) {
      map['synced_at'] = Variable<DateTime>(syncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('TransactionsCompanion(')
          ..write('id: $id, ')
          ..write('serverId: $serverId, ')
          ..write('type: $type, ')
          ..write('amount: $amount, ')
          ..write('currency: $currency, ')
          ..write('status: $status, ')
          ..write('description: $description, ')
          ..write('reference: $reference, ')
          ..write('senderWalletId: $senderWalletId, ')
          ..write('receiverWalletId: $receiverWalletId, ')
          ..write('senderName: $senderName, ')
          ..write('receiverName: $receiverName, ')
          ..write('senderPhone: $senderPhone, ')
          ..write('receiverPhone: $receiverPhone, ')
          ..write('merchantName: $merchantName, ')
          ..write('merchantLogo: $merchantLogo, ')
          ..write('category: $category, ')
          ..write('fee: $fee, ')
          ..write('metadata: $metadata, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('syncAttempts: $syncAttempts, ')
          ..write('syncError: $syncError, ')
          ..write('lastSyncAttempt: $lastSyncAttempt, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CardsTable extends Cards with TableInfo<$CardsTable, Card> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CardsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _userIdMeta = const VerificationMeta('userId');
  @override
  late final GeneratedColumn<String> userId = GeneratedColumn<String>(
      'user_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
      'type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _maskedPanMeta =
      const VerificationMeta('maskedPan');
  @override
  late final GeneratedColumn<String> maskedPan = GeneratedColumn<String>(
      'masked_pan', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _cardholderNameMeta =
      const VerificationMeta('cardholderName');
  @override
  late final GeneratedColumn<String> cardholderName = GeneratedColumn<String>(
      'cardholder_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _expiryMonthMeta =
      const VerificationMeta('expiryMonth');
  @override
  late final GeneratedColumn<String> expiryMonth = GeneratedColumn<String>(
      'expiry_month', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _expiryYearMeta =
      const VerificationMeta('expiryYear');
  @override
  late final GeneratedColumn<String> expiryYear = GeneratedColumn<String>(
      'expiry_year', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _brandMeta = const VerificationMeta('brand');
  @override
  late final GeneratedColumn<String> brand = GeneratedColumn<String>(
      'brand', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _walletIdMeta =
      const VerificationMeta('walletId');
  @override
  late final GeneratedColumn<String> walletId = GeneratedColumn<String>(
      'wallet_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _balanceMeta =
      const VerificationMeta('balance');
  @override
  late final GeneratedColumn<double> balance = GeneratedColumn<double>(
      'balance', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _spendingLimitMeta =
      const VerificationMeta('spendingLimit');
  @override
  late final GeneratedColumn<double> spendingLimit = GeneratedColumn<double>(
      'spending_limit', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _isFrozenMeta =
      const VerificationMeta('isFrozen');
  @override
  late final GeneratedColumn<bool> isFrozen = GeneratedColumn<bool>(
      'is_frozen', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_frozen" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _isVirtualMeta =
      const VerificationMeta('isVirtual');
  @override
  late final GeneratedColumn<bool> isVirtual = GeneratedColumn<bool>(
      'is_virtual', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_virtual" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _colorMeta = const VerificationMeta('color');
  @override
  late final GeneratedColumn<String> color = GeneratedColumn<String>(
      'color', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _designIdMeta =
      const VerificationMeta('designId');
  @override
  late final GeneratedColumn<String> designId = GeneratedColumn<String>(
      'design_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _settingsMeta =
      const VerificationMeta('settings');
  @override
  late final GeneratedColumn<String> settings = GeneratedColumn<String>(
      'settings', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _lastSyncedAtMeta =
      const VerificationMeta('lastSyncedAt');
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
      'last_synced_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        userId,
        type,
        status,
        maskedPan,
        cardholderName,
        expiryMonth,
        expiryYear,
        brand,
        walletId,
        balance,
        spendingLimit,
        isFrozen,
        isVirtual,
        color,
        designId,
        settings,
        createdAt,
        updatedAt,
        lastSyncedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cards';
  @override
  VerificationContext validateIntegrity(Insertable<Card> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('user_id')) {
      context.handle(_userIdMeta,
          userId.isAcceptableOrUnknown(data['user_id']!, _userIdMeta));
    } else if (isInserting) {
      context.missing(_userIdMeta);
    }
    if (data.containsKey('type')) {
      context.handle(
          _typeMeta, type.isAcceptableOrUnknown(data['type']!, _typeMeta));
    } else if (isInserting) {
      context.missing(_typeMeta);
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    } else if (isInserting) {
      context.missing(_statusMeta);
    }
    if (data.containsKey('masked_pan')) {
      context.handle(_maskedPanMeta,
          maskedPan.isAcceptableOrUnknown(data['masked_pan']!, _maskedPanMeta));
    } else if (isInserting) {
      context.missing(_maskedPanMeta);
    }
    if (data.containsKey('cardholder_name')) {
      context.handle(
          _cardholderNameMeta,
          cardholderName.isAcceptableOrUnknown(
              data['cardholder_name']!, _cardholderNameMeta));
    }
    if (data.containsKey('expiry_month')) {
      context.handle(
          _expiryMonthMeta,
          expiryMonth.isAcceptableOrUnknown(
              data['expiry_month']!, _expiryMonthMeta));
    }
    if (data.containsKey('expiry_year')) {
      context.handle(
          _expiryYearMeta,
          expiryYear.isAcceptableOrUnknown(
              data['expiry_year']!, _expiryYearMeta));
    }
    if (data.containsKey('brand')) {
      context.handle(
          _brandMeta, brand.isAcceptableOrUnknown(data['brand']!, _brandMeta));
    }
    if (data.containsKey('wallet_id')) {
      context.handle(_walletIdMeta,
          walletId.isAcceptableOrUnknown(data['wallet_id']!, _walletIdMeta));
    }
    if (data.containsKey('balance')) {
      context.handle(_balanceMeta,
          balance.isAcceptableOrUnknown(data['balance']!, _balanceMeta));
    }
    if (data.containsKey('spending_limit')) {
      context.handle(
          _spendingLimitMeta,
          spendingLimit.isAcceptableOrUnknown(
              data['spending_limit']!, _spendingLimitMeta));
    }
    if (data.containsKey('is_frozen')) {
      context.handle(_isFrozenMeta,
          isFrozen.isAcceptableOrUnknown(data['is_frozen']!, _isFrozenMeta));
    }
    if (data.containsKey('is_virtual')) {
      context.handle(_isVirtualMeta,
          isVirtual.isAcceptableOrUnknown(data['is_virtual']!, _isVirtualMeta));
    }
    if (data.containsKey('color')) {
      context.handle(
          _colorMeta, color.isAcceptableOrUnknown(data['color']!, _colorMeta));
    }
    if (data.containsKey('design_id')) {
      context.handle(_designIdMeta,
          designId.isAcceptableOrUnknown(data['design_id']!, _designIdMeta));
    }
    if (data.containsKey('settings')) {
      context.handle(_settingsMeta,
          settings.isAcceptableOrUnknown(data['settings']!, _settingsMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
          _lastSyncedAtMeta,
          lastSyncedAt.isAcceptableOrUnknown(
              data['last_synced_at']!, _lastSyncedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Card map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Card(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      userId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}user_id'])!,
      type: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}type'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      maskedPan: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}masked_pan'])!,
      cardholderName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}cardholder_name']),
      expiryMonth: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}expiry_month']),
      expiryYear: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}expiry_year']),
      brand: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}brand']),
      walletId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wallet_id']),
      balance: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}balance']),
      spendingLimit: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}spending_limit']),
      isFrozen: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_frozen'])!,
      isVirtual: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_virtual'])!,
      color: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}color']),
      designId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}design_id']),
      settings: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}settings']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at']),
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at']),
      lastSyncedAt: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_synced_at']),
    );
  }

  @override
  $CardsTable createAlias(String alias) {
    return $CardsTable(attachedDatabase, alias);
  }
}

class Card extends DataClass implements Insertable<Card> {
  final String id;
  final String userId;
  final String type;
  final String status;
  final String maskedPan;
  final String? cardholderName;
  final String? expiryMonth;
  final String? expiryYear;
  final String? brand;
  final String? walletId;
  final double? balance;
  final double? spendingLimit;
  final bool isFrozen;
  final bool isVirtual;
  final String? color;
  final String? designId;
  final String? settings;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? lastSyncedAt;
  const Card(
      {required this.id,
      required this.userId,
      required this.type,
      required this.status,
      required this.maskedPan,
      this.cardholderName,
      this.expiryMonth,
      this.expiryYear,
      this.brand,
      this.walletId,
      this.balance,
      this.spendingLimit,
      required this.isFrozen,
      required this.isVirtual,
      this.color,
      this.designId,
      this.settings,
      this.createdAt,
      this.updatedAt,
      this.lastSyncedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['user_id'] = Variable<String>(userId);
    map['type'] = Variable<String>(type);
    map['status'] = Variable<String>(status);
    map['masked_pan'] = Variable<String>(maskedPan);
    if (!nullToAbsent || cardholderName != null) {
      map['cardholder_name'] = Variable<String>(cardholderName);
    }
    if (!nullToAbsent || expiryMonth != null) {
      map['expiry_month'] = Variable<String>(expiryMonth);
    }
    if (!nullToAbsent || expiryYear != null) {
      map['expiry_year'] = Variable<String>(expiryYear);
    }
    if (!nullToAbsent || brand != null) {
      map['brand'] = Variable<String>(brand);
    }
    if (!nullToAbsent || walletId != null) {
      map['wallet_id'] = Variable<String>(walletId);
    }
    if (!nullToAbsent || balance != null) {
      map['balance'] = Variable<double>(balance);
    }
    if (!nullToAbsent || spendingLimit != null) {
      map['spending_limit'] = Variable<double>(spendingLimit);
    }
    map['is_frozen'] = Variable<bool>(isFrozen);
    map['is_virtual'] = Variable<bool>(isVirtual);
    if (!nullToAbsent || color != null) {
      map['color'] = Variable<String>(color);
    }
    if (!nullToAbsent || designId != null) {
      map['design_id'] = Variable<String>(designId);
    }
    if (!nullToAbsent || settings != null) {
      map['settings'] = Variable<String>(settings);
    }
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<DateTime>(createdAt);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<DateTime>(updatedAt);
    }
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  CardsCompanion toCompanion(bool nullToAbsent) {
    return CardsCompanion(
      id: Value(id),
      userId: Value(userId),
      type: Value(type),
      status: Value(status),
      maskedPan: Value(maskedPan),
      cardholderName: cardholderName == null && nullToAbsent
          ? const Value.absent()
          : Value(cardholderName),
      expiryMonth: expiryMonth == null && nullToAbsent
          ? const Value.absent()
          : Value(expiryMonth),
      expiryYear: expiryYear == null && nullToAbsent
          ? const Value.absent()
          : Value(expiryYear),
      brand:
          brand == null && nullToAbsent ? const Value.absent() : Value(brand),
      walletId: walletId == null && nullToAbsent
          ? const Value.absent()
          : Value(walletId),
      balance: balance == null && nullToAbsent
          ? const Value.absent()
          : Value(balance),
      spendingLimit: spendingLimit == null && nullToAbsent
          ? const Value.absent()
          : Value(spendingLimit),
      isFrozen: Value(isFrozen),
      isVirtual: Value(isVirtual),
      color:
          color == null && nullToAbsent ? const Value.absent() : Value(color),
      designId: designId == null && nullToAbsent
          ? const Value.absent()
          : Value(designId),
      settings: settings == null && nullToAbsent
          ? const Value.absent()
          : Value(settings),
      createdAt: createdAt == null && nullToAbsent
          ? const Value.absent()
          : Value(createdAt),
      updatedAt: updatedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(updatedAt),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory Card.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Card(
      id: serializer.fromJson<String>(json['id']),
      userId: serializer.fromJson<String>(json['userId']),
      type: serializer.fromJson<String>(json['type']),
      status: serializer.fromJson<String>(json['status']),
      maskedPan: serializer.fromJson<String>(json['maskedPan']),
      cardholderName: serializer.fromJson<String?>(json['cardholderName']),
      expiryMonth: serializer.fromJson<String?>(json['expiryMonth']),
      expiryYear: serializer.fromJson<String?>(json['expiryYear']),
      brand: serializer.fromJson<String?>(json['brand']),
      walletId: serializer.fromJson<String?>(json['walletId']),
      balance: serializer.fromJson<double?>(json['balance']),
      spendingLimit: serializer.fromJson<double?>(json['spendingLimit']),
      isFrozen: serializer.fromJson<bool>(json['isFrozen']),
      isVirtual: serializer.fromJson<bool>(json['isVirtual']),
      color: serializer.fromJson<String?>(json['color']),
      designId: serializer.fromJson<String?>(json['designId']),
      settings: serializer.fromJson<String?>(json['settings']),
      createdAt: serializer.fromJson<DateTime?>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime?>(json['updatedAt']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'userId': serializer.toJson<String>(userId),
      'type': serializer.toJson<String>(type),
      'status': serializer.toJson<String>(status),
      'maskedPan': serializer.toJson<String>(maskedPan),
      'cardholderName': serializer.toJson<String?>(cardholderName),
      'expiryMonth': serializer.toJson<String?>(expiryMonth),
      'expiryYear': serializer.toJson<String?>(expiryYear),
      'brand': serializer.toJson<String?>(brand),
      'walletId': serializer.toJson<String?>(walletId),
      'balance': serializer.toJson<double?>(balance),
      'spendingLimit': serializer.toJson<double?>(spendingLimit),
      'isFrozen': serializer.toJson<bool>(isFrozen),
      'isVirtual': serializer.toJson<bool>(isVirtual),
      'color': serializer.toJson<String?>(color),
      'designId': serializer.toJson<String?>(designId),
      'settings': serializer.toJson<String?>(settings),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  Card copyWith(
          {String? id,
          String? userId,
          String? type,
          String? status,
          String? maskedPan,
          Value<String?> cardholderName = const Value.absent(),
          Value<String?> expiryMonth = const Value.absent(),
          Value<String?> expiryYear = const Value.absent(),
          Value<String?> brand = const Value.absent(),
          Value<String?> walletId = const Value.absent(),
          Value<double?> balance = const Value.absent(),
          Value<double?> spendingLimit = const Value.absent(),
          bool? isFrozen,
          bool? isVirtual,
          Value<String?> color = const Value.absent(),
          Value<String?> designId = const Value.absent(),
          Value<String?> settings = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> lastSyncedAt = const Value.absent()}) =>
      Card(
        id: id ?? this.id,
        userId: userId ?? this.userId,
        type: type ?? this.type,
        status: status ?? this.status,
        maskedPan: maskedPan ?? this.maskedPan,
        cardholderName:
            cardholderName.present ? cardholderName.value : this.cardholderName,
        expiryMonth: expiryMonth.present ? expiryMonth.value : this.expiryMonth,
        expiryYear: expiryYear.present ? expiryYear.value : this.expiryYear,
        brand: brand.present ? brand.value : this.brand,
        walletId: walletId.present ? walletId.value : this.walletId,
        balance: balance.present ? balance.value : this.balance,
        spendingLimit:
            spendingLimit.present ? spendingLimit.value : this.spendingLimit,
        isFrozen: isFrozen ?? this.isFrozen,
        isVirtual: isVirtual ?? this.isVirtual,
        color: color.present ? color.value : this.color,
        designId: designId.present ? designId.value : this.designId,
        settings: settings.present ? settings.value : this.settings,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        lastSyncedAt:
            lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
      );
  Card copyWithCompanion(CardsCompanion data) {
    return Card(
      id: data.id.present ? data.id.value : this.id,
      userId: data.userId.present ? data.userId.value : this.userId,
      type: data.type.present ? data.type.value : this.type,
      status: data.status.present ? data.status.value : this.status,
      maskedPan: data.maskedPan.present ? data.maskedPan.value : this.maskedPan,
      cardholderName: data.cardholderName.present
          ? data.cardholderName.value
          : this.cardholderName,
      expiryMonth:
          data.expiryMonth.present ? data.expiryMonth.value : this.expiryMonth,
      expiryYear:
          data.expiryYear.present ? data.expiryYear.value : this.expiryYear,
      brand: data.brand.present ? data.brand.value : this.brand,
      walletId: data.walletId.present ? data.walletId.value : this.walletId,
      balance: data.balance.present ? data.balance.value : this.balance,
      spendingLimit: data.spendingLimit.present
          ? data.spendingLimit.value
          : this.spendingLimit,
      isFrozen: data.isFrozen.present ? data.isFrozen.value : this.isFrozen,
      isVirtual: data.isVirtual.present ? data.isVirtual.value : this.isVirtual,
      color: data.color.present ? data.color.value : this.color,
      designId: data.designId.present ? data.designId.value : this.designId,
      settings: data.settings.present ? data.settings.value : this.settings,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Card(')
          ..write('id: $id, ')
          ..write('userId: $userId, ')
          ..write('type: $type, ')
          ..write('status: $status, ')
          ..write('maskedPan: $maskedPan, ')
          ..write('cardholderName: $cardholderName, ')
          ..write('expiryMonth: $expiryMonth, ')
          ..write('expiryYear: $expiryYear, ')
          ..write('brand: $brand, ')
          ..write('walletId: $walletId, ')
          ..write('balance: $balance, ')
          ..write('spendingLimit: $spendingLimit, ')
          ..write('isFrozen: $isFrozen, ')
          ..write('isVirtual: $isVirtual, ')
          ..write('color: $color, ')
          ..write('designId: $designId, ')
          ..write('settings: $settings, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      userId,
      type,
      status,
      maskedPan,
      cardholderName,
      expiryMonth,
      expiryYear,
      brand,
      walletId,
      balance,
      spendingLimit,
      isFrozen,
      isVirtual,
      color,
      designId,
      settings,
      createdAt,
      updatedAt,
      lastSyncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Card &&
          other.id == this.id &&
          other.userId == this.userId &&
          other.type == this.type &&
          other.status == this.status &&
          other.maskedPan == this.maskedPan &&
          other.cardholderName == this.cardholderName &&
          other.expiryMonth == this.expiryMonth &&
          other.expiryYear == this.expiryYear &&
          other.brand == this.brand &&
          other.walletId == this.walletId &&
          other.balance == this.balance &&
          other.spendingLimit == this.spendingLimit &&
          other.isFrozen == this.isFrozen &&
          other.isVirtual == this.isVirtual &&
          other.color == this.color &&
          other.designId == this.designId &&
          other.settings == this.settings &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class CardsCompanion extends UpdateCompanion<Card> {
  final Value<String> id;
  final Value<String> userId;
  final Value<String> type;
  final Value<String> status;
  final Value<String> maskedPan;
  final Value<String?> cardholderName;
  final Value<String?> expiryMonth;
  final Value<String?> expiryYear;
  final Value<String?> brand;
  final Value<String?> walletId;
  final Value<double?> balance;
  final Value<double?> spendingLimit;
  final Value<bool> isFrozen;
  final Value<bool> isVirtual;
  final Value<String?> color;
  final Value<String?> designId;
  final Value<String?> settings;
  final Value<DateTime?> createdAt;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> lastSyncedAt;
  final Value<int> rowid;
  const CardsCompanion({
    this.id = const Value.absent(),
    this.userId = const Value.absent(),
    this.type = const Value.absent(),
    this.status = const Value.absent(),
    this.maskedPan = const Value.absent(),
    this.cardholderName = const Value.absent(),
    this.expiryMonth = const Value.absent(),
    this.expiryYear = const Value.absent(),
    this.brand = const Value.absent(),
    this.walletId = const Value.absent(),
    this.balance = const Value.absent(),
    this.spendingLimit = const Value.absent(),
    this.isFrozen = const Value.absent(),
    this.isVirtual = const Value.absent(),
    this.color = const Value.absent(),
    this.designId = const Value.absent(),
    this.settings = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CardsCompanion.insert({
    required String id,
    required String userId,
    required String type,
    required String status,
    required String maskedPan,
    this.cardholderName = const Value.absent(),
    this.expiryMonth = const Value.absent(),
    this.expiryYear = const Value.absent(),
    this.brand = const Value.absent(),
    this.walletId = const Value.absent(),
    this.balance = const Value.absent(),
    this.spendingLimit = const Value.absent(),
    this.isFrozen = const Value.absent(),
    this.isVirtual = const Value.absent(),
    this.color = const Value.absent(),
    this.designId = const Value.absent(),
    this.settings = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        userId = Value(userId),
        type = Value(type),
        status = Value(status),
        maskedPan = Value(maskedPan);
  static Insertable<Card> custom({
    Expression<String>? id,
    Expression<String>? userId,
    Expression<String>? type,
    Expression<String>? status,
    Expression<String>? maskedPan,
    Expression<String>? cardholderName,
    Expression<String>? expiryMonth,
    Expression<String>? expiryYear,
    Expression<String>? brand,
    Expression<String>? walletId,
    Expression<double>? balance,
    Expression<double>? spendingLimit,
    Expression<bool>? isFrozen,
    Expression<bool>? isVirtual,
    Expression<String>? color,
    Expression<String>? designId,
    Expression<String>? settings,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? lastSyncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (userId != null) 'user_id': userId,
      if (type != null) 'type': type,
      if (status != null) 'status': status,
      if (maskedPan != null) 'masked_pan': maskedPan,
      if (cardholderName != null) 'cardholder_name': cardholderName,
      if (expiryMonth != null) 'expiry_month': expiryMonth,
      if (expiryYear != null) 'expiry_year': expiryYear,
      if (brand != null) 'brand': brand,
      if (walletId != null) 'wallet_id': walletId,
      if (balance != null) 'balance': balance,
      if (spendingLimit != null) 'spending_limit': spendingLimit,
      if (isFrozen != null) 'is_frozen': isFrozen,
      if (isVirtual != null) 'is_virtual': isVirtual,
      if (color != null) 'color': color,
      if (designId != null) 'design_id': designId,
      if (settings != null) 'settings': settings,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CardsCompanion copyWith(
      {Value<String>? id,
      Value<String>? userId,
      Value<String>? type,
      Value<String>? status,
      Value<String>? maskedPan,
      Value<String?>? cardholderName,
      Value<String?>? expiryMonth,
      Value<String?>? expiryYear,
      Value<String?>? brand,
      Value<String?>? walletId,
      Value<double?>? balance,
      Value<double?>? spendingLimit,
      Value<bool>? isFrozen,
      Value<bool>? isVirtual,
      Value<String?>? color,
      Value<String?>? designId,
      Value<String?>? settings,
      Value<DateTime?>? createdAt,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? lastSyncedAt,
      Value<int>? rowid}) {
    return CardsCompanion(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      type: type ?? this.type,
      status: status ?? this.status,
      maskedPan: maskedPan ?? this.maskedPan,
      cardholderName: cardholderName ?? this.cardholderName,
      expiryMonth: expiryMonth ?? this.expiryMonth,
      expiryYear: expiryYear ?? this.expiryYear,
      brand: brand ?? this.brand,
      walletId: walletId ?? this.walletId,
      balance: balance ?? this.balance,
      spendingLimit: spendingLimit ?? this.spendingLimit,
      isFrozen: isFrozen ?? this.isFrozen,
      isVirtual: isVirtual ?? this.isVirtual,
      color: color ?? this.color,
      designId: designId ?? this.designId,
      settings: settings ?? this.settings,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (userId.present) {
      map['user_id'] = Variable<String>(userId.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (maskedPan.present) {
      map['masked_pan'] = Variable<String>(maskedPan.value);
    }
    if (cardholderName.present) {
      map['cardholder_name'] = Variable<String>(cardholderName.value);
    }
    if (expiryMonth.present) {
      map['expiry_month'] = Variable<String>(expiryMonth.value);
    }
    if (expiryYear.present) {
      map['expiry_year'] = Variable<String>(expiryYear.value);
    }
    if (brand.present) {
      map['brand'] = Variable<String>(brand.value);
    }
    if (walletId.present) {
      map['wallet_id'] = Variable<String>(walletId.value);
    }
    if (balance.present) {
      map['balance'] = Variable<double>(balance.value);
    }
    if (spendingLimit.present) {
      map['spending_limit'] = Variable<double>(spendingLimit.value);
    }
    if (isFrozen.present) {
      map['is_frozen'] = Variable<bool>(isFrozen.value);
    }
    if (isVirtual.present) {
      map['is_virtual'] = Variable<bool>(isVirtual.value);
    }
    if (color.present) {
      map['color'] = Variable<String>(color.value);
    }
    if (designId.present) {
      map['design_id'] = Variable<String>(designId.value);
    }
    if (settings.present) {
      map['settings'] = Variable<String>(settings.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CardsCompanion(')
          ..write('id: $id, ')
          ..write('userId: $userId, ')
          ..write('type: $type, ')
          ..write('status: $status, ')
          ..write('maskedPan: $maskedPan, ')
          ..write('cardholderName: $cardholderName, ')
          ..write('expiryMonth: $expiryMonth, ')
          ..write('expiryYear: $expiryYear, ')
          ..write('brand: $brand, ')
          ..write('walletId: $walletId, ')
          ..write('balance: $balance, ')
          ..write('spendingLimit: $spendingLimit, ')
          ..write('isFrozen: $isFrozen, ')
          ..write('isVirtual: $isVirtual, ')
          ..write('color: $color, ')
          ..write('designId: $designId, ')
          ..write('settings: $settings, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SyncQueueTable extends SyncQueue
    with TableInfo<$SyncQueueTable, SyncQueueData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncQueueTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _entityTypeMeta =
      const VerificationMeta('entityType');
  @override
  late final GeneratedColumn<String> entityType = GeneratedColumn<String>(
      'entity_type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _entityIdMeta =
      const VerificationMeta('entityId');
  @override
  late final GeneratedColumn<String> entityId = GeneratedColumn<String>(
      'entity_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _operationMeta =
      const VerificationMeta('operation');
  @override
  late final GeneratedColumn<String> operation = GeneratedColumn<String>(
      'operation', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _payloadMeta =
      const VerificationMeta('payload');
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
      'payload', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _priorityMeta =
      const VerificationMeta('priority');
  @override
  late final GeneratedColumn<int> priority = GeneratedColumn<int>(
      'priority', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(5));
  static const VerificationMeta _attemptsMeta =
      const VerificationMeta('attempts');
  @override
  late final GeneratedColumn<int> attempts = GeneratedColumn<int>(
      'attempts', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _maxAttemptsMeta =
      const VerificationMeta('maxAttempts');
  @override
  late final GeneratedColumn<int> maxAttempts = GeneratedColumn<int>(
      'max_attempts', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(5));
  static const VerificationMeta _errorMessageMeta =
      const VerificationMeta('errorMessage');
  @override
  late final GeneratedColumn<String> errorMessage = GeneratedColumn<String>(
      'error_message', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _lastAttemptAtMeta =
      const VerificationMeta('lastAttemptAt');
  @override
  late final GeneratedColumn<DateTime> lastAttemptAt =
      GeneratedColumn<DateTime>('last_attempt_at', aliasedName, true,
          type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _nextRetryAtMeta =
      const VerificationMeta('nextRetryAt');
  @override
  late final GeneratedColumn<DateTime> nextRetryAt = GeneratedColumn<DateTime>(
      'next_retry_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _syncedAtMeta =
      const VerificationMeta('syncedAt');
  @override
  late final GeneratedColumn<DateTime> syncedAt = GeneratedColumn<DateTime>(
      'synced_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        entityType,
        entityId,
        operation,
        payload,
        status,
        priority,
        attempts,
        maxAttempts,
        errorMessage,
        createdAt,
        lastAttemptAt,
        nextRetryAt,
        syncedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_queue';
  @override
  VerificationContext validateIntegrity(Insertable<SyncQueueData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('entity_type')) {
      context.handle(
          _entityTypeMeta,
          entityType.isAcceptableOrUnknown(
              data['entity_type']!, _entityTypeMeta));
    } else if (isInserting) {
      context.missing(_entityTypeMeta);
    }
    if (data.containsKey('entity_id')) {
      context.handle(_entityIdMeta,
          entityId.isAcceptableOrUnknown(data['entity_id']!, _entityIdMeta));
    } else if (isInserting) {
      context.missing(_entityIdMeta);
    }
    if (data.containsKey('operation')) {
      context.handle(_operationMeta,
          operation.isAcceptableOrUnknown(data['operation']!, _operationMeta));
    } else if (isInserting) {
      context.missing(_operationMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(_payloadMeta,
          payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta));
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('priority')) {
      context.handle(_priorityMeta,
          priority.isAcceptableOrUnknown(data['priority']!, _priorityMeta));
    }
    if (data.containsKey('attempts')) {
      context.handle(_attemptsMeta,
          attempts.isAcceptableOrUnknown(data['attempts']!, _attemptsMeta));
    }
    if (data.containsKey('max_attempts')) {
      context.handle(
          _maxAttemptsMeta,
          maxAttempts.isAcceptableOrUnknown(
              data['max_attempts']!, _maxAttemptsMeta));
    }
    if (data.containsKey('error_message')) {
      context.handle(
          _errorMessageMeta,
          errorMessage.isAcceptableOrUnknown(
              data['error_message']!, _errorMessageMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('last_attempt_at')) {
      context.handle(
          _lastAttemptAtMeta,
          lastAttemptAt.isAcceptableOrUnknown(
              data['last_attempt_at']!, _lastAttemptAtMeta));
    }
    if (data.containsKey('next_retry_at')) {
      context.handle(
          _nextRetryAtMeta,
          nextRetryAt.isAcceptableOrUnknown(
              data['next_retry_at']!, _nextRetryAtMeta));
    }
    if (data.containsKey('synced_at')) {
      context.handle(_syncedAtMeta,
          syncedAt.isAcceptableOrUnknown(data['synced_at']!, _syncedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  SyncQueueData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncQueueData(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      entityType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}entity_type'])!,
      entityId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}entity_id'])!,
      operation: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}operation'])!,
      payload: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}payload'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      priority: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}priority'])!,
      attempts: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}attempts'])!,
      maxAttempts: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}max_attempts'])!,
      errorMessage: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}error_message']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      lastAttemptAt: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_attempt_at']),
      nextRetryAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}next_retry_at']),
      syncedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}synced_at']),
    );
  }

  @override
  $SyncQueueTable createAlias(String alias) {
    return $SyncQueueTable(attachedDatabase, alias);
  }
}

class SyncQueueData extends DataClass implements Insertable<SyncQueueData> {
  final int id;

  /// The table/entity this operation applies to (e.g., 'transactions', 'wallets')
  final String entityType;

  /// The local ID of the entity
  final String entityId;

  /// Operation type: create, update, delete
  final String operation;

  /// JSON payload to send to server
  final String payload;

  /// Sync status: pending, syncing, synced, failed
  final String status;

  /// Priority (lower = higher priority)
  final int priority;

  /// Number of sync attempts
  final int attempts;

  /// Maximum retry attempts
  final int maxAttempts;

  /// Error message from last failed attempt
  final String? errorMessage;

  /// When this operation was queued
  final DateTime createdAt;

  /// Last sync attempt timestamp
  final DateTime? lastAttemptAt;

  /// Next retry timestamp (for exponential backoff)
  final DateTime? nextRetryAt;

  /// When successfully synced
  final DateTime? syncedAt;
  const SyncQueueData(
      {required this.id,
      required this.entityType,
      required this.entityId,
      required this.operation,
      required this.payload,
      required this.status,
      required this.priority,
      required this.attempts,
      required this.maxAttempts,
      this.errorMessage,
      required this.createdAt,
      this.lastAttemptAt,
      this.nextRetryAt,
      this.syncedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['entity_type'] = Variable<String>(entityType);
    map['entity_id'] = Variable<String>(entityId);
    map['operation'] = Variable<String>(operation);
    map['payload'] = Variable<String>(payload);
    map['status'] = Variable<String>(status);
    map['priority'] = Variable<int>(priority);
    map['attempts'] = Variable<int>(attempts);
    map['max_attempts'] = Variable<int>(maxAttempts);
    if (!nullToAbsent || errorMessage != null) {
      map['error_message'] = Variable<String>(errorMessage);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    if (!nullToAbsent || lastAttemptAt != null) {
      map['last_attempt_at'] = Variable<DateTime>(lastAttemptAt);
    }
    if (!nullToAbsent || nextRetryAt != null) {
      map['next_retry_at'] = Variable<DateTime>(nextRetryAt);
    }
    if (!nullToAbsent || syncedAt != null) {
      map['synced_at'] = Variable<DateTime>(syncedAt);
    }
    return map;
  }

  SyncQueueCompanion toCompanion(bool nullToAbsent) {
    return SyncQueueCompanion(
      id: Value(id),
      entityType: Value(entityType),
      entityId: Value(entityId),
      operation: Value(operation),
      payload: Value(payload),
      status: Value(status),
      priority: Value(priority),
      attempts: Value(attempts),
      maxAttempts: Value(maxAttempts),
      errorMessage: errorMessage == null && nullToAbsent
          ? const Value.absent()
          : Value(errorMessage),
      createdAt: Value(createdAt),
      lastAttemptAt: lastAttemptAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastAttemptAt),
      nextRetryAt: nextRetryAt == null && nullToAbsent
          ? const Value.absent()
          : Value(nextRetryAt),
      syncedAt: syncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(syncedAt),
    );
  }

  factory SyncQueueData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncQueueData(
      id: serializer.fromJson<int>(json['id']),
      entityType: serializer.fromJson<String>(json['entityType']),
      entityId: serializer.fromJson<String>(json['entityId']),
      operation: serializer.fromJson<String>(json['operation']),
      payload: serializer.fromJson<String>(json['payload']),
      status: serializer.fromJson<String>(json['status']),
      priority: serializer.fromJson<int>(json['priority']),
      attempts: serializer.fromJson<int>(json['attempts']),
      maxAttempts: serializer.fromJson<int>(json['maxAttempts']),
      errorMessage: serializer.fromJson<String?>(json['errorMessage']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      lastAttemptAt: serializer.fromJson<DateTime?>(json['lastAttemptAt']),
      nextRetryAt: serializer.fromJson<DateTime?>(json['nextRetryAt']),
      syncedAt: serializer.fromJson<DateTime?>(json['syncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'entityType': serializer.toJson<String>(entityType),
      'entityId': serializer.toJson<String>(entityId),
      'operation': serializer.toJson<String>(operation),
      'payload': serializer.toJson<String>(payload),
      'status': serializer.toJson<String>(status),
      'priority': serializer.toJson<int>(priority),
      'attempts': serializer.toJson<int>(attempts),
      'maxAttempts': serializer.toJson<int>(maxAttempts),
      'errorMessage': serializer.toJson<String?>(errorMessage),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'lastAttemptAt': serializer.toJson<DateTime?>(lastAttemptAt),
      'nextRetryAt': serializer.toJson<DateTime?>(nextRetryAt),
      'syncedAt': serializer.toJson<DateTime?>(syncedAt),
    };
  }

  SyncQueueData copyWith(
          {int? id,
          String? entityType,
          String? entityId,
          String? operation,
          String? payload,
          String? status,
          int? priority,
          int? attempts,
          int? maxAttempts,
          Value<String?> errorMessage = const Value.absent(),
          DateTime? createdAt,
          Value<DateTime?> lastAttemptAt = const Value.absent(),
          Value<DateTime?> nextRetryAt = const Value.absent(),
          Value<DateTime?> syncedAt = const Value.absent()}) =>
      SyncQueueData(
        id: id ?? this.id,
        entityType: entityType ?? this.entityType,
        entityId: entityId ?? this.entityId,
        operation: operation ?? this.operation,
        payload: payload ?? this.payload,
        status: status ?? this.status,
        priority: priority ?? this.priority,
        attempts: attempts ?? this.attempts,
        maxAttempts: maxAttempts ?? this.maxAttempts,
        errorMessage:
            errorMessage.present ? errorMessage.value : this.errorMessage,
        createdAt: createdAt ?? this.createdAt,
        lastAttemptAt:
            lastAttemptAt.present ? lastAttemptAt.value : this.lastAttemptAt,
        nextRetryAt: nextRetryAt.present ? nextRetryAt.value : this.nextRetryAt,
        syncedAt: syncedAt.present ? syncedAt.value : this.syncedAt,
      );
  SyncQueueData copyWithCompanion(SyncQueueCompanion data) {
    return SyncQueueData(
      id: data.id.present ? data.id.value : this.id,
      entityType:
          data.entityType.present ? data.entityType.value : this.entityType,
      entityId: data.entityId.present ? data.entityId.value : this.entityId,
      operation: data.operation.present ? data.operation.value : this.operation,
      payload: data.payload.present ? data.payload.value : this.payload,
      status: data.status.present ? data.status.value : this.status,
      priority: data.priority.present ? data.priority.value : this.priority,
      attempts: data.attempts.present ? data.attempts.value : this.attempts,
      maxAttempts:
          data.maxAttempts.present ? data.maxAttempts.value : this.maxAttempts,
      errorMessage: data.errorMessage.present
          ? data.errorMessage.value
          : this.errorMessage,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      lastAttemptAt: data.lastAttemptAt.present
          ? data.lastAttemptAt.value
          : this.lastAttemptAt,
      nextRetryAt:
          data.nextRetryAt.present ? data.nextRetryAt.value : this.nextRetryAt,
      syncedAt: data.syncedAt.present ? data.syncedAt.value : this.syncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncQueueData(')
          ..write('id: $id, ')
          ..write('entityType: $entityType, ')
          ..write('entityId: $entityId, ')
          ..write('operation: $operation, ')
          ..write('payload: $payload, ')
          ..write('status: $status, ')
          ..write('priority: $priority, ')
          ..write('attempts: $attempts, ')
          ..write('maxAttempts: $maxAttempts, ')
          ..write('errorMessage: $errorMessage, ')
          ..write('createdAt: $createdAt, ')
          ..write('lastAttemptAt: $lastAttemptAt, ')
          ..write('nextRetryAt: $nextRetryAt, ')
          ..write('syncedAt: $syncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      entityType,
      entityId,
      operation,
      payload,
      status,
      priority,
      attempts,
      maxAttempts,
      errorMessage,
      createdAt,
      lastAttemptAt,
      nextRetryAt,
      syncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncQueueData &&
          other.id == this.id &&
          other.entityType == this.entityType &&
          other.entityId == this.entityId &&
          other.operation == this.operation &&
          other.payload == this.payload &&
          other.status == this.status &&
          other.priority == this.priority &&
          other.attempts == this.attempts &&
          other.maxAttempts == this.maxAttempts &&
          other.errorMessage == this.errorMessage &&
          other.createdAt == this.createdAt &&
          other.lastAttemptAt == this.lastAttemptAt &&
          other.nextRetryAt == this.nextRetryAt &&
          other.syncedAt == this.syncedAt);
}

class SyncQueueCompanion extends UpdateCompanion<SyncQueueData> {
  final Value<int> id;
  final Value<String> entityType;
  final Value<String> entityId;
  final Value<String> operation;
  final Value<String> payload;
  final Value<String> status;
  final Value<int> priority;
  final Value<int> attempts;
  final Value<int> maxAttempts;
  final Value<String?> errorMessage;
  final Value<DateTime> createdAt;
  final Value<DateTime?> lastAttemptAt;
  final Value<DateTime?> nextRetryAt;
  final Value<DateTime?> syncedAt;
  const SyncQueueCompanion({
    this.id = const Value.absent(),
    this.entityType = const Value.absent(),
    this.entityId = const Value.absent(),
    this.operation = const Value.absent(),
    this.payload = const Value.absent(),
    this.status = const Value.absent(),
    this.priority = const Value.absent(),
    this.attempts = const Value.absent(),
    this.maxAttempts = const Value.absent(),
    this.errorMessage = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.lastAttemptAt = const Value.absent(),
    this.nextRetryAt = const Value.absent(),
    this.syncedAt = const Value.absent(),
  });
  SyncQueueCompanion.insert({
    this.id = const Value.absent(),
    required String entityType,
    required String entityId,
    required String operation,
    required String payload,
    this.status = const Value.absent(),
    this.priority = const Value.absent(),
    this.attempts = const Value.absent(),
    this.maxAttempts = const Value.absent(),
    this.errorMessage = const Value.absent(),
    required DateTime createdAt,
    this.lastAttemptAt = const Value.absent(),
    this.nextRetryAt = const Value.absent(),
    this.syncedAt = const Value.absent(),
  })  : entityType = Value(entityType),
        entityId = Value(entityId),
        operation = Value(operation),
        payload = Value(payload),
        createdAt = Value(createdAt);
  static Insertable<SyncQueueData> custom({
    Expression<int>? id,
    Expression<String>? entityType,
    Expression<String>? entityId,
    Expression<String>? operation,
    Expression<String>? payload,
    Expression<String>? status,
    Expression<int>? priority,
    Expression<int>? attempts,
    Expression<int>? maxAttempts,
    Expression<String>? errorMessage,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? lastAttemptAt,
    Expression<DateTime>? nextRetryAt,
    Expression<DateTime>? syncedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (entityType != null) 'entity_type': entityType,
      if (entityId != null) 'entity_id': entityId,
      if (operation != null) 'operation': operation,
      if (payload != null) 'payload': payload,
      if (status != null) 'status': status,
      if (priority != null) 'priority': priority,
      if (attempts != null) 'attempts': attempts,
      if (maxAttempts != null) 'max_attempts': maxAttempts,
      if (errorMessage != null) 'error_message': errorMessage,
      if (createdAt != null) 'created_at': createdAt,
      if (lastAttemptAt != null) 'last_attempt_at': lastAttemptAt,
      if (nextRetryAt != null) 'next_retry_at': nextRetryAt,
      if (syncedAt != null) 'synced_at': syncedAt,
    });
  }

  SyncQueueCompanion copyWith(
      {Value<int>? id,
      Value<String>? entityType,
      Value<String>? entityId,
      Value<String>? operation,
      Value<String>? payload,
      Value<String>? status,
      Value<int>? priority,
      Value<int>? attempts,
      Value<int>? maxAttempts,
      Value<String?>? errorMessage,
      Value<DateTime>? createdAt,
      Value<DateTime?>? lastAttemptAt,
      Value<DateTime?>? nextRetryAt,
      Value<DateTime?>? syncedAt}) {
    return SyncQueueCompanion(
      id: id ?? this.id,
      entityType: entityType ?? this.entityType,
      entityId: entityId ?? this.entityId,
      operation: operation ?? this.operation,
      payload: payload ?? this.payload,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      attempts: attempts ?? this.attempts,
      maxAttempts: maxAttempts ?? this.maxAttempts,
      errorMessage: errorMessage ?? this.errorMessage,
      createdAt: createdAt ?? this.createdAt,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      nextRetryAt: nextRetryAt ?? this.nextRetryAt,
      syncedAt: syncedAt ?? this.syncedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (entityType.present) {
      map['entity_type'] = Variable<String>(entityType.value);
    }
    if (entityId.present) {
      map['entity_id'] = Variable<String>(entityId.value);
    }
    if (operation.present) {
      map['operation'] = Variable<String>(operation.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (priority.present) {
      map['priority'] = Variable<int>(priority.value);
    }
    if (attempts.present) {
      map['attempts'] = Variable<int>(attempts.value);
    }
    if (maxAttempts.present) {
      map['max_attempts'] = Variable<int>(maxAttempts.value);
    }
    if (errorMessage.present) {
      map['error_message'] = Variable<String>(errorMessage.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (lastAttemptAt.present) {
      map['last_attempt_at'] = Variable<DateTime>(lastAttemptAt.value);
    }
    if (nextRetryAt.present) {
      map['next_retry_at'] = Variable<DateTime>(nextRetryAt.value);
    }
    if (syncedAt.present) {
      map['synced_at'] = Variable<DateTime>(syncedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncQueueCompanion(')
          ..write('id: $id, ')
          ..write('entityType: $entityType, ')
          ..write('entityId: $entityId, ')
          ..write('operation: $operation, ')
          ..write('payload: $payload, ')
          ..write('status: $status, ')
          ..write('priority: $priority, ')
          ..write('attempts: $attempts, ')
          ..write('maxAttempts: $maxAttempts, ')
          ..write('errorMessage: $errorMessage, ')
          ..write('createdAt: $createdAt, ')
          ..write('lastAttemptAt: $lastAttemptAt, ')
          ..write('nextRetryAt: $nextRetryAt, ')
          ..write('syncedAt: $syncedAt')
          ..write(')'))
        .toString();
  }
}

class $ContactsTable extends Contacts with TableInfo<$ContactsTable, Contact> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ContactsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _userIdMeta = const VerificationMeta('userId');
  @override
  late final GeneratedColumn<String> userId = GeneratedColumn<String>(
      'user_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _contactUserIdMeta =
      const VerificationMeta('contactUserId');
  @override
  late final GeneratedColumn<String> contactUserId = GeneratedColumn<String>(
      'contact_user_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _phoneMeta = const VerificationMeta('phone');
  @override
  late final GeneratedColumn<String> phone = GeneratedColumn<String>(
      'phone', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _emailMeta = const VerificationMeta('email');
  @override
  late final GeneratedColumn<String> email = GeneratedColumn<String>(
      'email', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _avatarUrlMeta =
      const VerificationMeta('avatarUrl');
  @override
  late final GeneratedColumn<String> avatarUrl = GeneratedColumn<String>(
      'avatar_url', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _isPeeapUserMeta =
      const VerificationMeta('isPeeapUser');
  @override
  late final GeneratedColumn<bool> isPeeapUser = GeneratedColumn<bool>(
      'is_peeap_user', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("is_peeap_user" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _isFavoriteMeta =
      const VerificationMeta('isFavorite');
  @override
  late final GeneratedColumn<bool> isFavorite = GeneratedColumn<bool>(
      'is_favorite', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_favorite" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _transactionCountMeta =
      const VerificationMeta('transactionCount');
  @override
  late final GeneratedColumn<int> transactionCount = GeneratedColumn<int>(
      'transaction_count', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _totalSentMeta =
      const VerificationMeta('totalSent');
  @override
  late final GeneratedColumn<double> totalSent = GeneratedColumn<double>(
      'total_sent', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _totalReceivedMeta =
      const VerificationMeta('totalReceived');
  @override
  late final GeneratedColumn<double> totalReceived = GeneratedColumn<double>(
      'total_received', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _lastTransactionAtMeta =
      const VerificationMeta('lastTransactionAt');
  @override
  late final GeneratedColumn<DateTime> lastTransactionAt =
      GeneratedColumn<DateTime>('last_transaction_at', aliasedName, true,
          type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _lastSyncedAtMeta =
      const VerificationMeta('lastSyncedAt');
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
      'last_synced_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        userId,
        contactUserId,
        name,
        phone,
        email,
        avatarUrl,
        isPeeapUser,
        isFavorite,
        transactionCount,
        totalSent,
        totalReceived,
        lastTransactionAt,
        createdAt,
        updatedAt,
        lastSyncedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'contacts';
  @override
  VerificationContext validateIntegrity(Insertable<Contact> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('user_id')) {
      context.handle(_userIdMeta,
          userId.isAcceptableOrUnknown(data['user_id']!, _userIdMeta));
    } else if (isInserting) {
      context.missing(_userIdMeta);
    }
    if (data.containsKey('contact_user_id')) {
      context.handle(
          _contactUserIdMeta,
          contactUserId.isAcceptableOrUnknown(
              data['contact_user_id']!, _contactUserIdMeta));
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('phone')) {
      context.handle(
          _phoneMeta, phone.isAcceptableOrUnknown(data['phone']!, _phoneMeta));
    } else if (isInserting) {
      context.missing(_phoneMeta);
    }
    if (data.containsKey('email')) {
      context.handle(
          _emailMeta, email.isAcceptableOrUnknown(data['email']!, _emailMeta));
    }
    if (data.containsKey('avatar_url')) {
      context.handle(_avatarUrlMeta,
          avatarUrl.isAcceptableOrUnknown(data['avatar_url']!, _avatarUrlMeta));
    }
    if (data.containsKey('is_peeap_user')) {
      context.handle(
          _isPeeapUserMeta,
          isPeeapUser.isAcceptableOrUnknown(
              data['is_peeap_user']!, _isPeeapUserMeta));
    }
    if (data.containsKey('is_favorite')) {
      context.handle(
          _isFavoriteMeta,
          isFavorite.isAcceptableOrUnknown(
              data['is_favorite']!, _isFavoriteMeta));
    }
    if (data.containsKey('transaction_count')) {
      context.handle(
          _transactionCountMeta,
          transactionCount.isAcceptableOrUnknown(
              data['transaction_count']!, _transactionCountMeta));
    }
    if (data.containsKey('total_sent')) {
      context.handle(_totalSentMeta,
          totalSent.isAcceptableOrUnknown(data['total_sent']!, _totalSentMeta));
    }
    if (data.containsKey('total_received')) {
      context.handle(
          _totalReceivedMeta,
          totalReceived.isAcceptableOrUnknown(
              data['total_received']!, _totalReceivedMeta));
    }
    if (data.containsKey('last_transaction_at')) {
      context.handle(
          _lastTransactionAtMeta,
          lastTransactionAt.isAcceptableOrUnknown(
              data['last_transaction_at']!, _lastTransactionAtMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
          _lastSyncedAtMeta,
          lastSyncedAt.isAcceptableOrUnknown(
              data['last_synced_at']!, _lastSyncedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Contact map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Contact(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      userId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}user_id'])!,
      contactUserId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}contact_user_id']),
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      phone: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}phone'])!,
      email: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}email']),
      avatarUrl: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}avatar_url']),
      isPeeapUser: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_peeap_user'])!,
      isFavorite: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_favorite'])!,
      transactionCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}transaction_count'])!,
      totalSent: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}total_sent'])!,
      totalReceived: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}total_received'])!,
      lastTransactionAt: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_transaction_at']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at']),
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at']),
      lastSyncedAt: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_synced_at']),
    );
  }

  @override
  $ContactsTable createAlias(String alias) {
    return $ContactsTable(attachedDatabase, alias);
  }
}

class Contact extends DataClass implements Insertable<Contact> {
  final String id;
  final String userId;
  final String? contactUserId;
  final String name;
  final String phone;
  final String? email;
  final String? avatarUrl;
  final bool isPeeapUser;
  final bool isFavorite;
  final int transactionCount;
  final double totalSent;
  final double totalReceived;
  final DateTime? lastTransactionAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? lastSyncedAt;
  const Contact(
      {required this.id,
      required this.userId,
      this.contactUserId,
      required this.name,
      required this.phone,
      this.email,
      this.avatarUrl,
      required this.isPeeapUser,
      required this.isFavorite,
      required this.transactionCount,
      required this.totalSent,
      required this.totalReceived,
      this.lastTransactionAt,
      this.createdAt,
      this.updatedAt,
      this.lastSyncedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['user_id'] = Variable<String>(userId);
    if (!nullToAbsent || contactUserId != null) {
      map['contact_user_id'] = Variable<String>(contactUserId);
    }
    map['name'] = Variable<String>(name);
    map['phone'] = Variable<String>(phone);
    if (!nullToAbsent || email != null) {
      map['email'] = Variable<String>(email);
    }
    if (!nullToAbsent || avatarUrl != null) {
      map['avatar_url'] = Variable<String>(avatarUrl);
    }
    map['is_peeap_user'] = Variable<bool>(isPeeapUser);
    map['is_favorite'] = Variable<bool>(isFavorite);
    map['transaction_count'] = Variable<int>(transactionCount);
    map['total_sent'] = Variable<double>(totalSent);
    map['total_received'] = Variable<double>(totalReceived);
    if (!nullToAbsent || lastTransactionAt != null) {
      map['last_transaction_at'] = Variable<DateTime>(lastTransactionAt);
    }
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<DateTime>(createdAt);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<DateTime>(updatedAt);
    }
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  ContactsCompanion toCompanion(bool nullToAbsent) {
    return ContactsCompanion(
      id: Value(id),
      userId: Value(userId),
      contactUserId: contactUserId == null && nullToAbsent
          ? const Value.absent()
          : Value(contactUserId),
      name: Value(name),
      phone: Value(phone),
      email:
          email == null && nullToAbsent ? const Value.absent() : Value(email),
      avatarUrl: avatarUrl == null && nullToAbsent
          ? const Value.absent()
          : Value(avatarUrl),
      isPeeapUser: Value(isPeeapUser),
      isFavorite: Value(isFavorite),
      transactionCount: Value(transactionCount),
      totalSent: Value(totalSent),
      totalReceived: Value(totalReceived),
      lastTransactionAt: lastTransactionAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastTransactionAt),
      createdAt: createdAt == null && nullToAbsent
          ? const Value.absent()
          : Value(createdAt),
      updatedAt: updatedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(updatedAt),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory Contact.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Contact(
      id: serializer.fromJson<String>(json['id']),
      userId: serializer.fromJson<String>(json['userId']),
      contactUserId: serializer.fromJson<String?>(json['contactUserId']),
      name: serializer.fromJson<String>(json['name']),
      phone: serializer.fromJson<String>(json['phone']),
      email: serializer.fromJson<String?>(json['email']),
      avatarUrl: serializer.fromJson<String?>(json['avatarUrl']),
      isPeeapUser: serializer.fromJson<bool>(json['isPeeapUser']),
      isFavorite: serializer.fromJson<bool>(json['isFavorite']),
      transactionCount: serializer.fromJson<int>(json['transactionCount']),
      totalSent: serializer.fromJson<double>(json['totalSent']),
      totalReceived: serializer.fromJson<double>(json['totalReceived']),
      lastTransactionAt:
          serializer.fromJson<DateTime?>(json['lastTransactionAt']),
      createdAt: serializer.fromJson<DateTime?>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime?>(json['updatedAt']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'userId': serializer.toJson<String>(userId),
      'contactUserId': serializer.toJson<String?>(contactUserId),
      'name': serializer.toJson<String>(name),
      'phone': serializer.toJson<String>(phone),
      'email': serializer.toJson<String?>(email),
      'avatarUrl': serializer.toJson<String?>(avatarUrl),
      'isPeeapUser': serializer.toJson<bool>(isPeeapUser),
      'isFavorite': serializer.toJson<bool>(isFavorite),
      'transactionCount': serializer.toJson<int>(transactionCount),
      'totalSent': serializer.toJson<double>(totalSent),
      'totalReceived': serializer.toJson<double>(totalReceived),
      'lastTransactionAt': serializer.toJson<DateTime?>(lastTransactionAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  Contact copyWith(
          {String? id,
          String? userId,
          Value<String?> contactUserId = const Value.absent(),
          String? name,
          String? phone,
          Value<String?> email = const Value.absent(),
          Value<String?> avatarUrl = const Value.absent(),
          bool? isPeeapUser,
          bool? isFavorite,
          int? transactionCount,
          double? totalSent,
          double? totalReceived,
          Value<DateTime?> lastTransactionAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> lastSyncedAt = const Value.absent()}) =>
      Contact(
        id: id ?? this.id,
        userId: userId ?? this.userId,
        contactUserId:
            contactUserId.present ? contactUserId.value : this.contactUserId,
        name: name ?? this.name,
        phone: phone ?? this.phone,
        email: email.present ? email.value : this.email,
        avatarUrl: avatarUrl.present ? avatarUrl.value : this.avatarUrl,
        isPeeapUser: isPeeapUser ?? this.isPeeapUser,
        isFavorite: isFavorite ?? this.isFavorite,
        transactionCount: transactionCount ?? this.transactionCount,
        totalSent: totalSent ?? this.totalSent,
        totalReceived: totalReceived ?? this.totalReceived,
        lastTransactionAt: lastTransactionAt.present
            ? lastTransactionAt.value
            : this.lastTransactionAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        lastSyncedAt:
            lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
      );
  Contact copyWithCompanion(ContactsCompanion data) {
    return Contact(
      id: data.id.present ? data.id.value : this.id,
      userId: data.userId.present ? data.userId.value : this.userId,
      contactUserId: data.contactUserId.present
          ? data.contactUserId.value
          : this.contactUserId,
      name: data.name.present ? data.name.value : this.name,
      phone: data.phone.present ? data.phone.value : this.phone,
      email: data.email.present ? data.email.value : this.email,
      avatarUrl: data.avatarUrl.present ? data.avatarUrl.value : this.avatarUrl,
      isPeeapUser:
          data.isPeeapUser.present ? data.isPeeapUser.value : this.isPeeapUser,
      isFavorite:
          data.isFavorite.present ? data.isFavorite.value : this.isFavorite,
      transactionCount: data.transactionCount.present
          ? data.transactionCount.value
          : this.transactionCount,
      totalSent: data.totalSent.present ? data.totalSent.value : this.totalSent,
      totalReceived: data.totalReceived.present
          ? data.totalReceived.value
          : this.totalReceived,
      lastTransactionAt: data.lastTransactionAt.present
          ? data.lastTransactionAt.value
          : this.lastTransactionAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Contact(')
          ..write('id: $id, ')
          ..write('userId: $userId, ')
          ..write('contactUserId: $contactUserId, ')
          ..write('name: $name, ')
          ..write('phone: $phone, ')
          ..write('email: $email, ')
          ..write('avatarUrl: $avatarUrl, ')
          ..write('isPeeapUser: $isPeeapUser, ')
          ..write('isFavorite: $isFavorite, ')
          ..write('transactionCount: $transactionCount, ')
          ..write('totalSent: $totalSent, ')
          ..write('totalReceived: $totalReceived, ')
          ..write('lastTransactionAt: $lastTransactionAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      userId,
      contactUserId,
      name,
      phone,
      email,
      avatarUrl,
      isPeeapUser,
      isFavorite,
      transactionCount,
      totalSent,
      totalReceived,
      lastTransactionAt,
      createdAt,
      updatedAt,
      lastSyncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Contact &&
          other.id == this.id &&
          other.userId == this.userId &&
          other.contactUserId == this.contactUserId &&
          other.name == this.name &&
          other.phone == this.phone &&
          other.email == this.email &&
          other.avatarUrl == this.avatarUrl &&
          other.isPeeapUser == this.isPeeapUser &&
          other.isFavorite == this.isFavorite &&
          other.transactionCount == this.transactionCount &&
          other.totalSent == this.totalSent &&
          other.totalReceived == this.totalReceived &&
          other.lastTransactionAt == this.lastTransactionAt &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class ContactsCompanion extends UpdateCompanion<Contact> {
  final Value<String> id;
  final Value<String> userId;
  final Value<String?> contactUserId;
  final Value<String> name;
  final Value<String> phone;
  final Value<String?> email;
  final Value<String?> avatarUrl;
  final Value<bool> isPeeapUser;
  final Value<bool> isFavorite;
  final Value<int> transactionCount;
  final Value<double> totalSent;
  final Value<double> totalReceived;
  final Value<DateTime?> lastTransactionAt;
  final Value<DateTime?> createdAt;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> lastSyncedAt;
  final Value<int> rowid;
  const ContactsCompanion({
    this.id = const Value.absent(),
    this.userId = const Value.absent(),
    this.contactUserId = const Value.absent(),
    this.name = const Value.absent(),
    this.phone = const Value.absent(),
    this.email = const Value.absent(),
    this.avatarUrl = const Value.absent(),
    this.isPeeapUser = const Value.absent(),
    this.isFavorite = const Value.absent(),
    this.transactionCount = const Value.absent(),
    this.totalSent = const Value.absent(),
    this.totalReceived = const Value.absent(),
    this.lastTransactionAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ContactsCompanion.insert({
    required String id,
    required String userId,
    this.contactUserId = const Value.absent(),
    required String name,
    required String phone,
    this.email = const Value.absent(),
    this.avatarUrl = const Value.absent(),
    this.isPeeapUser = const Value.absent(),
    this.isFavorite = const Value.absent(),
    this.transactionCount = const Value.absent(),
    this.totalSent = const Value.absent(),
    this.totalReceived = const Value.absent(),
    this.lastTransactionAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        userId = Value(userId),
        name = Value(name),
        phone = Value(phone);
  static Insertable<Contact> custom({
    Expression<String>? id,
    Expression<String>? userId,
    Expression<String>? contactUserId,
    Expression<String>? name,
    Expression<String>? phone,
    Expression<String>? email,
    Expression<String>? avatarUrl,
    Expression<bool>? isPeeapUser,
    Expression<bool>? isFavorite,
    Expression<int>? transactionCount,
    Expression<double>? totalSent,
    Expression<double>? totalReceived,
    Expression<DateTime>? lastTransactionAt,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? lastSyncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (userId != null) 'user_id': userId,
      if (contactUserId != null) 'contact_user_id': contactUserId,
      if (name != null) 'name': name,
      if (phone != null) 'phone': phone,
      if (email != null) 'email': email,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      if (isPeeapUser != null) 'is_peeap_user': isPeeapUser,
      if (isFavorite != null) 'is_favorite': isFavorite,
      if (transactionCount != null) 'transaction_count': transactionCount,
      if (totalSent != null) 'total_sent': totalSent,
      if (totalReceived != null) 'total_received': totalReceived,
      if (lastTransactionAt != null) 'last_transaction_at': lastTransactionAt,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ContactsCompanion copyWith(
      {Value<String>? id,
      Value<String>? userId,
      Value<String?>? contactUserId,
      Value<String>? name,
      Value<String>? phone,
      Value<String?>? email,
      Value<String?>? avatarUrl,
      Value<bool>? isPeeapUser,
      Value<bool>? isFavorite,
      Value<int>? transactionCount,
      Value<double>? totalSent,
      Value<double>? totalReceived,
      Value<DateTime?>? lastTransactionAt,
      Value<DateTime?>? createdAt,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? lastSyncedAt,
      Value<int>? rowid}) {
    return ContactsCompanion(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      contactUserId: contactUserId ?? this.contactUserId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      isPeeapUser: isPeeapUser ?? this.isPeeapUser,
      isFavorite: isFavorite ?? this.isFavorite,
      transactionCount: transactionCount ?? this.transactionCount,
      totalSent: totalSent ?? this.totalSent,
      totalReceived: totalReceived ?? this.totalReceived,
      lastTransactionAt: lastTransactionAt ?? this.lastTransactionAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (userId.present) {
      map['user_id'] = Variable<String>(userId.value);
    }
    if (contactUserId.present) {
      map['contact_user_id'] = Variable<String>(contactUserId.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (phone.present) {
      map['phone'] = Variable<String>(phone.value);
    }
    if (email.present) {
      map['email'] = Variable<String>(email.value);
    }
    if (avatarUrl.present) {
      map['avatar_url'] = Variable<String>(avatarUrl.value);
    }
    if (isPeeapUser.present) {
      map['is_peeap_user'] = Variable<bool>(isPeeapUser.value);
    }
    if (isFavorite.present) {
      map['is_favorite'] = Variable<bool>(isFavorite.value);
    }
    if (transactionCount.present) {
      map['transaction_count'] = Variable<int>(transactionCount.value);
    }
    if (totalSent.present) {
      map['total_sent'] = Variable<double>(totalSent.value);
    }
    if (totalReceived.present) {
      map['total_received'] = Variable<double>(totalReceived.value);
    }
    if (lastTransactionAt.present) {
      map['last_transaction_at'] = Variable<DateTime>(lastTransactionAt.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ContactsCompanion(')
          ..write('id: $id, ')
          ..write('userId: $userId, ')
          ..write('contactUserId: $contactUserId, ')
          ..write('name: $name, ')
          ..write('phone: $phone, ')
          ..write('email: $email, ')
          ..write('avatarUrl: $avatarUrl, ')
          ..write('isPeeapUser: $isPeeapUser, ')
          ..write('isFavorite: $isFavorite, ')
          ..write('transactionCount: $transactionCount, ')
          ..write('totalSent: $totalSent, ')
          ..write('totalReceived: $totalReceived, ')
          ..write('lastTransactionAt: $lastTransactionAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $RecentRecipientsTable extends RecentRecipients
    with TableInfo<$RecentRecipientsTable, RecentRecipient> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $RecentRecipientsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _userIdMeta = const VerificationMeta('userId');
  @override
  late final GeneratedColumn<String> userId = GeneratedColumn<String>(
      'user_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _contactIdMeta =
      const VerificationMeta('contactId');
  @override
  late final GeneratedColumn<String> contactId = GeneratedColumn<String>(
      'contact_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _contactPhoneMeta =
      const VerificationMeta('contactPhone');
  @override
  late final GeneratedColumn<String> contactPhone = GeneratedColumn<String>(
      'contact_phone', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _contactNameMeta =
      const VerificationMeta('contactName');
  @override
  late final GeneratedColumn<String> contactName = GeneratedColumn<String>(
      'contact_name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _lastAmountMeta =
      const VerificationMeta('lastAmount');
  @override
  late final GeneratedColumn<double> lastAmount = GeneratedColumn<double>(
      'last_amount', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _lastCurrencyMeta =
      const VerificationMeta('lastCurrency');
  @override
  late final GeneratedColumn<String> lastCurrency = GeneratedColumn<String>(
      'last_currency', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _usedAtMeta = const VerificationMeta('usedAt');
  @override
  late final GeneratedColumn<DateTime> usedAt = GeneratedColumn<DateTime>(
      'used_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        userId,
        contactId,
        contactPhone,
        contactName,
        lastAmount,
        lastCurrency,
        usedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'recent_recipients';
  @override
  VerificationContext validateIntegrity(Insertable<RecentRecipient> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('user_id')) {
      context.handle(_userIdMeta,
          userId.isAcceptableOrUnknown(data['user_id']!, _userIdMeta));
    } else if (isInserting) {
      context.missing(_userIdMeta);
    }
    if (data.containsKey('contact_id')) {
      context.handle(_contactIdMeta,
          contactId.isAcceptableOrUnknown(data['contact_id']!, _contactIdMeta));
    } else if (isInserting) {
      context.missing(_contactIdMeta);
    }
    if (data.containsKey('contact_phone')) {
      context.handle(
          _contactPhoneMeta,
          contactPhone.isAcceptableOrUnknown(
              data['contact_phone']!, _contactPhoneMeta));
    } else if (isInserting) {
      context.missing(_contactPhoneMeta);
    }
    if (data.containsKey('contact_name')) {
      context.handle(
          _contactNameMeta,
          contactName.isAcceptableOrUnknown(
              data['contact_name']!, _contactNameMeta));
    } else if (isInserting) {
      context.missing(_contactNameMeta);
    }
    if (data.containsKey('last_amount')) {
      context.handle(
          _lastAmountMeta,
          lastAmount.isAcceptableOrUnknown(
              data['last_amount']!, _lastAmountMeta));
    }
    if (data.containsKey('last_currency')) {
      context.handle(
          _lastCurrencyMeta,
          lastCurrency.isAcceptableOrUnknown(
              data['last_currency']!, _lastCurrencyMeta));
    }
    if (data.containsKey('used_at')) {
      context.handle(_usedAtMeta,
          usedAt.isAcceptableOrUnknown(data['used_at']!, _usedAtMeta));
    } else if (isInserting) {
      context.missing(_usedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  RecentRecipient map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return RecentRecipient(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      userId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}user_id'])!,
      contactId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}contact_id'])!,
      contactPhone: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}contact_phone'])!,
      contactName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}contact_name'])!,
      lastAmount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}last_amount']),
      lastCurrency: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}last_currency']),
      usedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}used_at'])!,
    );
  }

  @override
  $RecentRecipientsTable createAlias(String alias) {
    return $RecentRecipientsTable(attachedDatabase, alias);
  }
}

class RecentRecipient extends DataClass implements Insertable<RecentRecipient> {
  final int id;
  final String userId;
  final String contactId;
  final String contactPhone;
  final String contactName;
  final double? lastAmount;
  final String? lastCurrency;
  final DateTime usedAt;
  const RecentRecipient(
      {required this.id,
      required this.userId,
      required this.contactId,
      required this.contactPhone,
      required this.contactName,
      this.lastAmount,
      this.lastCurrency,
      required this.usedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['user_id'] = Variable<String>(userId);
    map['contact_id'] = Variable<String>(contactId);
    map['contact_phone'] = Variable<String>(contactPhone);
    map['contact_name'] = Variable<String>(contactName);
    if (!nullToAbsent || lastAmount != null) {
      map['last_amount'] = Variable<double>(lastAmount);
    }
    if (!nullToAbsent || lastCurrency != null) {
      map['last_currency'] = Variable<String>(lastCurrency);
    }
    map['used_at'] = Variable<DateTime>(usedAt);
    return map;
  }

  RecentRecipientsCompanion toCompanion(bool nullToAbsent) {
    return RecentRecipientsCompanion(
      id: Value(id),
      userId: Value(userId),
      contactId: Value(contactId),
      contactPhone: Value(contactPhone),
      contactName: Value(contactName),
      lastAmount: lastAmount == null && nullToAbsent
          ? const Value.absent()
          : Value(lastAmount),
      lastCurrency: lastCurrency == null && nullToAbsent
          ? const Value.absent()
          : Value(lastCurrency),
      usedAt: Value(usedAt),
    );
  }

  factory RecentRecipient.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return RecentRecipient(
      id: serializer.fromJson<int>(json['id']),
      userId: serializer.fromJson<String>(json['userId']),
      contactId: serializer.fromJson<String>(json['contactId']),
      contactPhone: serializer.fromJson<String>(json['contactPhone']),
      contactName: serializer.fromJson<String>(json['contactName']),
      lastAmount: serializer.fromJson<double?>(json['lastAmount']),
      lastCurrency: serializer.fromJson<String?>(json['lastCurrency']),
      usedAt: serializer.fromJson<DateTime>(json['usedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'userId': serializer.toJson<String>(userId),
      'contactId': serializer.toJson<String>(contactId),
      'contactPhone': serializer.toJson<String>(contactPhone),
      'contactName': serializer.toJson<String>(contactName),
      'lastAmount': serializer.toJson<double?>(lastAmount),
      'lastCurrency': serializer.toJson<String?>(lastCurrency),
      'usedAt': serializer.toJson<DateTime>(usedAt),
    };
  }

  RecentRecipient copyWith(
          {int? id,
          String? userId,
          String? contactId,
          String? contactPhone,
          String? contactName,
          Value<double?> lastAmount = const Value.absent(),
          Value<String?> lastCurrency = const Value.absent(),
          DateTime? usedAt}) =>
      RecentRecipient(
        id: id ?? this.id,
        userId: userId ?? this.userId,
        contactId: contactId ?? this.contactId,
        contactPhone: contactPhone ?? this.contactPhone,
        contactName: contactName ?? this.contactName,
        lastAmount: lastAmount.present ? lastAmount.value : this.lastAmount,
        lastCurrency:
            lastCurrency.present ? lastCurrency.value : this.lastCurrency,
        usedAt: usedAt ?? this.usedAt,
      );
  RecentRecipient copyWithCompanion(RecentRecipientsCompanion data) {
    return RecentRecipient(
      id: data.id.present ? data.id.value : this.id,
      userId: data.userId.present ? data.userId.value : this.userId,
      contactId: data.contactId.present ? data.contactId.value : this.contactId,
      contactPhone: data.contactPhone.present
          ? data.contactPhone.value
          : this.contactPhone,
      contactName:
          data.contactName.present ? data.contactName.value : this.contactName,
      lastAmount:
          data.lastAmount.present ? data.lastAmount.value : this.lastAmount,
      lastCurrency: data.lastCurrency.present
          ? data.lastCurrency.value
          : this.lastCurrency,
      usedAt: data.usedAt.present ? data.usedAt.value : this.usedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('RecentRecipient(')
          ..write('id: $id, ')
          ..write('userId: $userId, ')
          ..write('contactId: $contactId, ')
          ..write('contactPhone: $contactPhone, ')
          ..write('contactName: $contactName, ')
          ..write('lastAmount: $lastAmount, ')
          ..write('lastCurrency: $lastCurrency, ')
          ..write('usedAt: $usedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, userId, contactId, contactPhone,
      contactName, lastAmount, lastCurrency, usedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is RecentRecipient &&
          other.id == this.id &&
          other.userId == this.userId &&
          other.contactId == this.contactId &&
          other.contactPhone == this.contactPhone &&
          other.contactName == this.contactName &&
          other.lastAmount == this.lastAmount &&
          other.lastCurrency == this.lastCurrency &&
          other.usedAt == this.usedAt);
}

class RecentRecipientsCompanion extends UpdateCompanion<RecentRecipient> {
  final Value<int> id;
  final Value<String> userId;
  final Value<String> contactId;
  final Value<String> contactPhone;
  final Value<String> contactName;
  final Value<double?> lastAmount;
  final Value<String?> lastCurrency;
  final Value<DateTime> usedAt;
  const RecentRecipientsCompanion({
    this.id = const Value.absent(),
    this.userId = const Value.absent(),
    this.contactId = const Value.absent(),
    this.contactPhone = const Value.absent(),
    this.contactName = const Value.absent(),
    this.lastAmount = const Value.absent(),
    this.lastCurrency = const Value.absent(),
    this.usedAt = const Value.absent(),
  });
  RecentRecipientsCompanion.insert({
    this.id = const Value.absent(),
    required String userId,
    required String contactId,
    required String contactPhone,
    required String contactName,
    this.lastAmount = const Value.absent(),
    this.lastCurrency = const Value.absent(),
    required DateTime usedAt,
  })  : userId = Value(userId),
        contactId = Value(contactId),
        contactPhone = Value(contactPhone),
        contactName = Value(contactName),
        usedAt = Value(usedAt);
  static Insertable<RecentRecipient> custom({
    Expression<int>? id,
    Expression<String>? userId,
    Expression<String>? contactId,
    Expression<String>? contactPhone,
    Expression<String>? contactName,
    Expression<double>? lastAmount,
    Expression<String>? lastCurrency,
    Expression<DateTime>? usedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (userId != null) 'user_id': userId,
      if (contactId != null) 'contact_id': contactId,
      if (contactPhone != null) 'contact_phone': contactPhone,
      if (contactName != null) 'contact_name': contactName,
      if (lastAmount != null) 'last_amount': lastAmount,
      if (lastCurrency != null) 'last_currency': lastCurrency,
      if (usedAt != null) 'used_at': usedAt,
    });
  }

  RecentRecipientsCompanion copyWith(
      {Value<int>? id,
      Value<String>? userId,
      Value<String>? contactId,
      Value<String>? contactPhone,
      Value<String>? contactName,
      Value<double?>? lastAmount,
      Value<String?>? lastCurrency,
      Value<DateTime>? usedAt}) {
    return RecentRecipientsCompanion(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      contactId: contactId ?? this.contactId,
      contactPhone: contactPhone ?? this.contactPhone,
      contactName: contactName ?? this.contactName,
      lastAmount: lastAmount ?? this.lastAmount,
      lastCurrency: lastCurrency ?? this.lastCurrency,
      usedAt: usedAt ?? this.usedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (userId.present) {
      map['user_id'] = Variable<String>(userId.value);
    }
    if (contactId.present) {
      map['contact_id'] = Variable<String>(contactId.value);
    }
    if (contactPhone.present) {
      map['contact_phone'] = Variable<String>(contactPhone.value);
    }
    if (contactName.present) {
      map['contact_name'] = Variable<String>(contactName.value);
    }
    if (lastAmount.present) {
      map['last_amount'] = Variable<double>(lastAmount.value);
    }
    if (lastCurrency.present) {
      map['last_currency'] = Variable<String>(lastCurrency.value);
    }
    if (usedAt.present) {
      map['used_at'] = Variable<DateTime>(usedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('RecentRecipientsCompanion(')
          ..write('id: $id, ')
          ..write('userId: $userId, ')
          ..write('contactId: $contactId, ')
          ..write('contactPhone: $contactPhone, ')
          ..write('contactName: $contactName, ')
          ..write('lastAmount: $lastAmount, ')
          ..write('lastCurrency: $lastCurrency, ')
          ..write('usedAt: $usedAt')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $UsersTable users = $UsersTable(this);
  late final $WalletsTable wallets = $WalletsTable(this);
  late final $TransactionsTable transactions = $TransactionsTable(this);
  late final $CardsTable cards = $CardsTable(this);
  late final $SyncQueueTable syncQueue = $SyncQueueTable(this);
  late final $ContactsTable contacts = $ContactsTable(this);
  late final $RecentRecipientsTable recentRecipients =
      $RecentRecipientsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
        users,
        wallets,
        transactions,
        cards,
        syncQueue,
        contacts,
        recentRecipients
      ];
}

typedef $$UsersTableCreateCompanionBuilder = UsersCompanion Function({
  required String id,
  required String email,
  Value<String?> phone,
  Value<String?> firstName,
  Value<String?> lastName,
  Value<String?> avatarUrl,
  Value<bool> isVerified,
  Value<bool> isMerchant,
  Value<String> role,
  Value<String?> kycStatus,
  Value<DateTime?> createdAt,
  Value<DateTime?> updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<int> rowid,
});
typedef $$UsersTableUpdateCompanionBuilder = UsersCompanion Function({
  Value<String> id,
  Value<String> email,
  Value<String?> phone,
  Value<String?> firstName,
  Value<String?> lastName,
  Value<String?> avatarUrl,
  Value<bool> isVerified,
  Value<bool> isMerchant,
  Value<String> role,
  Value<String?> kycStatus,
  Value<DateTime?> createdAt,
  Value<DateTime?> updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<int> rowid,
});

class $$UsersTableFilterComposer extends Composer<_$AppDatabase, $UsersTable> {
  $$UsersTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get email => $composableBuilder(
      column: $table.email, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get phone => $composableBuilder(
      column: $table.phone, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get firstName => $composableBuilder(
      column: $table.firstName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastName => $composableBuilder(
      column: $table.lastName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get avatarUrl => $composableBuilder(
      column: $table.avatarUrl, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isVerified => $composableBuilder(
      column: $table.isVerified, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isMerchant => $composableBuilder(
      column: $table.isMerchant, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get role => $composableBuilder(
      column: $table.role, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kycStatus => $composableBuilder(
      column: $table.kycStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => ColumnFilters(column));
}

class $$UsersTableOrderingComposer
    extends Composer<_$AppDatabase, $UsersTable> {
  $$UsersTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get email => $composableBuilder(
      column: $table.email, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get phone => $composableBuilder(
      column: $table.phone, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get firstName => $composableBuilder(
      column: $table.firstName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastName => $composableBuilder(
      column: $table.lastName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get avatarUrl => $composableBuilder(
      column: $table.avatarUrl, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isVerified => $composableBuilder(
      column: $table.isVerified, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isMerchant => $composableBuilder(
      column: $table.isMerchant, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get role => $composableBuilder(
      column: $table.role, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kycStatus => $composableBuilder(
      column: $table.kycStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt,
      builder: (column) => ColumnOrderings(column));
}

class $$UsersTableAnnotationComposer
    extends Composer<_$AppDatabase, $UsersTable> {
  $$UsersTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get email =>
      $composableBuilder(column: $table.email, builder: (column) => column);

  GeneratedColumn<String> get phone =>
      $composableBuilder(column: $table.phone, builder: (column) => column);

  GeneratedColumn<String> get firstName =>
      $composableBuilder(column: $table.firstName, builder: (column) => column);

  GeneratedColumn<String> get lastName =>
      $composableBuilder(column: $table.lastName, builder: (column) => column);

  GeneratedColumn<String> get avatarUrl =>
      $composableBuilder(column: $table.avatarUrl, builder: (column) => column);

  GeneratedColumn<bool> get isVerified => $composableBuilder(
      column: $table.isVerified, builder: (column) => column);

  GeneratedColumn<bool> get isMerchant => $composableBuilder(
      column: $table.isMerchant, builder: (column) => column);

  GeneratedColumn<String> get role =>
      $composableBuilder(column: $table.role, builder: (column) => column);

  GeneratedColumn<String> get kycStatus =>
      $composableBuilder(column: $table.kycStatus, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => column);
}

class $$UsersTableTableManager extends RootTableManager<
    _$AppDatabase,
    $UsersTable,
    User,
    $$UsersTableFilterComposer,
    $$UsersTableOrderingComposer,
    $$UsersTableAnnotationComposer,
    $$UsersTableCreateCompanionBuilder,
    $$UsersTableUpdateCompanionBuilder,
    (User, BaseReferences<_$AppDatabase, $UsersTable, User>),
    User,
    PrefetchHooks Function()> {
  $$UsersTableTableManager(_$AppDatabase db, $UsersTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$UsersTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$UsersTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$UsersTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> email = const Value.absent(),
            Value<String?> phone = const Value.absent(),
            Value<String?> firstName = const Value.absent(),
            Value<String?> lastName = const Value.absent(),
            Value<String?> avatarUrl = const Value.absent(),
            Value<bool> isVerified = const Value.absent(),
            Value<bool> isMerchant = const Value.absent(),
            Value<String> role = const Value.absent(),
            Value<String?> kycStatus = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              UsersCompanion(
            id: id,
            email: email,
            phone: phone,
            firstName: firstName,
            lastName: lastName,
            avatarUrl: avatarUrl,
            isVerified: isVerified,
            isMerchant: isMerchant,
            role: role,
            kycStatus: kycStatus,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String email,
            Value<String?> phone = const Value.absent(),
            Value<String?> firstName = const Value.absent(),
            Value<String?> lastName = const Value.absent(),
            Value<String?> avatarUrl = const Value.absent(),
            Value<bool> isVerified = const Value.absent(),
            Value<bool> isMerchant = const Value.absent(),
            Value<String> role = const Value.absent(),
            Value<String?> kycStatus = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              UsersCompanion.insert(
            id: id,
            email: email,
            phone: phone,
            firstName: firstName,
            lastName: lastName,
            avatarUrl: avatarUrl,
            isVerified: isVerified,
            isMerchant: isMerchant,
            role: role,
            kycStatus: kycStatus,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$UsersTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $UsersTable,
    User,
    $$UsersTableFilterComposer,
    $$UsersTableOrderingComposer,
    $$UsersTableAnnotationComposer,
    $$UsersTableCreateCompanionBuilder,
    $$UsersTableUpdateCompanionBuilder,
    (User, BaseReferences<_$AppDatabase, $UsersTable, User>),
    User,
    PrefetchHooks Function()>;
typedef $$WalletsTableCreateCompanionBuilder = WalletsCompanion Function({
  required String id,
  required String userId,
  required String name,
  required String type,
  Value<double> balance,
  Value<double> pendingBalance,
  Value<String> currency,
  Value<bool> isActive,
  Value<bool> isFrozen,
  Value<bool> isPrimary,
  Value<String?> accountNumber,
  Value<String?> color,
  Value<String?> icon,
  Value<DateTime?> createdAt,
  Value<DateTime?> updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<int> rowid,
});
typedef $$WalletsTableUpdateCompanionBuilder = WalletsCompanion Function({
  Value<String> id,
  Value<String> userId,
  Value<String> name,
  Value<String> type,
  Value<double> balance,
  Value<double> pendingBalance,
  Value<String> currency,
  Value<bool> isActive,
  Value<bool> isFrozen,
  Value<bool> isPrimary,
  Value<String?> accountNumber,
  Value<String?> color,
  Value<String?> icon,
  Value<DateTime?> createdAt,
  Value<DateTime?> updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<int> rowid,
});

class $$WalletsTableFilterComposer
    extends Composer<_$AppDatabase, $WalletsTable> {
  $$WalletsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get userId => $composableBuilder(
      column: $table.userId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get balance => $composableBuilder(
      column: $table.balance, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get pendingBalance => $composableBuilder(
      column: $table.pendingBalance,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get currency => $composableBuilder(
      column: $table.currency, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isActive => $composableBuilder(
      column: $table.isActive, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isFrozen => $composableBuilder(
      column: $table.isFrozen, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isPrimary => $composableBuilder(
      column: $table.isPrimary, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get accountNumber => $composableBuilder(
      column: $table.accountNumber, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get color => $composableBuilder(
      column: $table.color, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get icon => $composableBuilder(
      column: $table.icon, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => ColumnFilters(column));
}

class $$WalletsTableOrderingComposer
    extends Composer<_$AppDatabase, $WalletsTable> {
  $$WalletsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get userId => $composableBuilder(
      column: $table.userId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get balance => $composableBuilder(
      column: $table.balance, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get pendingBalance => $composableBuilder(
      column: $table.pendingBalance,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get currency => $composableBuilder(
      column: $table.currency, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isActive => $composableBuilder(
      column: $table.isActive, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isFrozen => $composableBuilder(
      column: $table.isFrozen, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isPrimary => $composableBuilder(
      column: $table.isPrimary, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get accountNumber => $composableBuilder(
      column: $table.accountNumber,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get color => $composableBuilder(
      column: $table.color, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get icon => $composableBuilder(
      column: $table.icon, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt,
      builder: (column) => ColumnOrderings(column));
}

class $$WalletsTableAnnotationComposer
    extends Composer<_$AppDatabase, $WalletsTable> {
  $$WalletsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get userId =>
      $composableBuilder(column: $table.userId, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<double> get balance =>
      $composableBuilder(column: $table.balance, builder: (column) => column);

  GeneratedColumn<double> get pendingBalance => $composableBuilder(
      column: $table.pendingBalance, builder: (column) => column);

  GeneratedColumn<String> get currency =>
      $composableBuilder(column: $table.currency, builder: (column) => column);

  GeneratedColumn<bool> get isActive =>
      $composableBuilder(column: $table.isActive, builder: (column) => column);

  GeneratedColumn<bool> get isFrozen =>
      $composableBuilder(column: $table.isFrozen, builder: (column) => column);

  GeneratedColumn<bool> get isPrimary =>
      $composableBuilder(column: $table.isPrimary, builder: (column) => column);

  GeneratedColumn<String> get accountNumber => $composableBuilder(
      column: $table.accountNumber, builder: (column) => column);

  GeneratedColumn<String> get color =>
      $composableBuilder(column: $table.color, builder: (column) => column);

  GeneratedColumn<String> get icon =>
      $composableBuilder(column: $table.icon, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => column);
}

class $$WalletsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $WalletsTable,
    Wallet,
    $$WalletsTableFilterComposer,
    $$WalletsTableOrderingComposer,
    $$WalletsTableAnnotationComposer,
    $$WalletsTableCreateCompanionBuilder,
    $$WalletsTableUpdateCompanionBuilder,
    (Wallet, BaseReferences<_$AppDatabase, $WalletsTable, Wallet>),
    Wallet,
    PrefetchHooks Function()> {
  $$WalletsTableTableManager(_$AppDatabase db, $WalletsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$WalletsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$WalletsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$WalletsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> userId = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<double> balance = const Value.absent(),
            Value<double> pendingBalance = const Value.absent(),
            Value<String> currency = const Value.absent(),
            Value<bool> isActive = const Value.absent(),
            Value<bool> isFrozen = const Value.absent(),
            Value<bool> isPrimary = const Value.absent(),
            Value<String?> accountNumber = const Value.absent(),
            Value<String?> color = const Value.absent(),
            Value<String?> icon = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              WalletsCompanion(
            id: id,
            userId: userId,
            name: name,
            type: type,
            balance: balance,
            pendingBalance: pendingBalance,
            currency: currency,
            isActive: isActive,
            isFrozen: isFrozen,
            isPrimary: isPrimary,
            accountNumber: accountNumber,
            color: color,
            icon: icon,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String userId,
            required String name,
            required String type,
            Value<double> balance = const Value.absent(),
            Value<double> pendingBalance = const Value.absent(),
            Value<String> currency = const Value.absent(),
            Value<bool> isActive = const Value.absent(),
            Value<bool> isFrozen = const Value.absent(),
            Value<bool> isPrimary = const Value.absent(),
            Value<String?> accountNumber = const Value.absent(),
            Value<String?> color = const Value.absent(),
            Value<String?> icon = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              WalletsCompanion.insert(
            id: id,
            userId: userId,
            name: name,
            type: type,
            balance: balance,
            pendingBalance: pendingBalance,
            currency: currency,
            isActive: isActive,
            isFrozen: isFrozen,
            isPrimary: isPrimary,
            accountNumber: accountNumber,
            color: color,
            icon: icon,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$WalletsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $WalletsTable,
    Wallet,
    $$WalletsTableFilterComposer,
    $$WalletsTableOrderingComposer,
    $$WalletsTableAnnotationComposer,
    $$WalletsTableCreateCompanionBuilder,
    $$WalletsTableUpdateCompanionBuilder,
    (Wallet, BaseReferences<_$AppDatabase, $WalletsTable, Wallet>),
    Wallet,
    PrefetchHooks Function()>;
typedef $$TransactionsTableCreateCompanionBuilder = TransactionsCompanion
    Function({
  required String id,
  Value<String?> serverId,
  required String type,
  required double amount,
  required String currency,
  required String status,
  Value<String?> description,
  Value<String?> reference,
  Value<String?> senderWalletId,
  Value<String?> receiverWalletId,
  Value<String?> senderName,
  Value<String?> receiverName,
  Value<String?> senderPhone,
  Value<String?> receiverPhone,
  Value<String?> merchantName,
  Value<String?> merchantLogo,
  Value<String?> category,
  Value<double?> fee,
  Value<String?> metadata,
  Value<String> syncStatus,
  Value<int> syncAttempts,
  Value<String?> syncError,
  Value<DateTime?> lastSyncAttempt,
  required DateTime createdAt,
  Value<DateTime?> updatedAt,
  Value<DateTime?> syncedAt,
  Value<int> rowid,
});
typedef $$TransactionsTableUpdateCompanionBuilder = TransactionsCompanion
    Function({
  Value<String> id,
  Value<String?> serverId,
  Value<String> type,
  Value<double> amount,
  Value<String> currency,
  Value<String> status,
  Value<String?> description,
  Value<String?> reference,
  Value<String?> senderWalletId,
  Value<String?> receiverWalletId,
  Value<String?> senderName,
  Value<String?> receiverName,
  Value<String?> senderPhone,
  Value<String?> receiverPhone,
  Value<String?> merchantName,
  Value<String?> merchantLogo,
  Value<String?> category,
  Value<double?> fee,
  Value<String?> metadata,
  Value<String> syncStatus,
  Value<int> syncAttempts,
  Value<String?> syncError,
  Value<DateTime?> lastSyncAttempt,
  Value<DateTime> createdAt,
  Value<DateTime?> updatedAt,
  Value<DateTime?> syncedAt,
  Value<int> rowid,
});

class $$TransactionsTableFilterComposer
    extends Composer<_$AppDatabase, $TransactionsTable> {
  $$TransactionsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get currency => $composableBuilder(
      column: $table.currency, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get reference => $composableBuilder(
      column: $table.reference, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get senderWalletId => $composableBuilder(
      column: $table.senderWalletId,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get receiverWalletId => $composableBuilder(
      column: $table.receiverWalletId,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get senderName => $composableBuilder(
      column: $table.senderName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get receiverName => $composableBuilder(
      column: $table.receiverName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get senderPhone => $composableBuilder(
      column: $table.senderPhone, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get receiverPhone => $composableBuilder(
      column: $table.receiverPhone, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get merchantName => $composableBuilder(
      column: $table.merchantName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get merchantLogo => $composableBuilder(
      column: $table.merchantLogo, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get category => $composableBuilder(
      column: $table.category, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get fee => $composableBuilder(
      column: $table.fee, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get metadata => $composableBuilder(
      column: $table.metadata, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get syncAttempts => $composableBuilder(
      column: $table.syncAttempts, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncError => $composableBuilder(
      column: $table.syncError, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastSyncAttempt => $composableBuilder(
      column: $table.lastSyncAttempt,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get syncedAt => $composableBuilder(
      column: $table.syncedAt, builder: (column) => ColumnFilters(column));
}

class $$TransactionsTableOrderingComposer
    extends Composer<_$AppDatabase, $TransactionsTable> {
  $$TransactionsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get currency => $composableBuilder(
      column: $table.currency, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get reference => $composableBuilder(
      column: $table.reference, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get senderWalletId => $composableBuilder(
      column: $table.senderWalletId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get receiverWalletId => $composableBuilder(
      column: $table.receiverWalletId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get senderName => $composableBuilder(
      column: $table.senderName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get receiverName => $composableBuilder(
      column: $table.receiverName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get senderPhone => $composableBuilder(
      column: $table.senderPhone, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get receiverPhone => $composableBuilder(
      column: $table.receiverPhone,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get merchantName => $composableBuilder(
      column: $table.merchantName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get merchantLogo => $composableBuilder(
      column: $table.merchantLogo,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get category => $composableBuilder(
      column: $table.category, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get fee => $composableBuilder(
      column: $table.fee, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get metadata => $composableBuilder(
      column: $table.metadata, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get syncAttempts => $composableBuilder(
      column: $table.syncAttempts,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncError => $composableBuilder(
      column: $table.syncError, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastSyncAttempt => $composableBuilder(
      column: $table.lastSyncAttempt,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get syncedAt => $composableBuilder(
      column: $table.syncedAt, builder: (column) => ColumnOrderings(column));
}

class $$TransactionsTableAnnotationComposer
    extends Composer<_$AppDatabase, $TransactionsTable> {
  $$TransactionsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get serverId =>
      $composableBuilder(column: $table.serverId, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<double> get amount =>
      $composableBuilder(column: $table.amount, builder: (column) => column);

  GeneratedColumn<String> get currency =>
      $composableBuilder(column: $table.currency, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => column);

  GeneratedColumn<String> get reference =>
      $composableBuilder(column: $table.reference, builder: (column) => column);

  GeneratedColumn<String> get senderWalletId => $composableBuilder(
      column: $table.senderWalletId, builder: (column) => column);

  GeneratedColumn<String> get receiverWalletId => $composableBuilder(
      column: $table.receiverWalletId, builder: (column) => column);

  GeneratedColumn<String> get senderName => $composableBuilder(
      column: $table.senderName, builder: (column) => column);

  GeneratedColumn<String> get receiverName => $composableBuilder(
      column: $table.receiverName, builder: (column) => column);

  GeneratedColumn<String> get senderPhone => $composableBuilder(
      column: $table.senderPhone, builder: (column) => column);

  GeneratedColumn<String> get receiverPhone => $composableBuilder(
      column: $table.receiverPhone, builder: (column) => column);

  GeneratedColumn<String> get merchantName => $composableBuilder(
      column: $table.merchantName, builder: (column) => column);

  GeneratedColumn<String> get merchantLogo => $composableBuilder(
      column: $table.merchantLogo, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);

  GeneratedColumn<double> get fee =>
      $composableBuilder(column: $table.fee, builder: (column) => column);

  GeneratedColumn<String> get metadata =>
      $composableBuilder(column: $table.metadata, builder: (column) => column);

  GeneratedColumn<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<int> get syncAttempts => $composableBuilder(
      column: $table.syncAttempts, builder: (column) => column);

  GeneratedColumn<String> get syncError =>
      $composableBuilder(column: $table.syncError, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncAttempt => $composableBuilder(
      column: $table.lastSyncAttempt, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get syncedAt =>
      $composableBuilder(column: $table.syncedAt, builder: (column) => column);
}

class $$TransactionsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $TransactionsTable,
    Transaction,
    $$TransactionsTableFilterComposer,
    $$TransactionsTableOrderingComposer,
    $$TransactionsTableAnnotationComposer,
    $$TransactionsTableCreateCompanionBuilder,
    $$TransactionsTableUpdateCompanionBuilder,
    (
      Transaction,
      BaseReferences<_$AppDatabase, $TransactionsTable, Transaction>
    ),
    Transaction,
    PrefetchHooks Function()> {
  $$TransactionsTableTableManager(_$AppDatabase db, $TransactionsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$TransactionsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$TransactionsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$TransactionsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String?> serverId = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<double> amount = const Value.absent(),
            Value<String> currency = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String?> description = const Value.absent(),
            Value<String?> reference = const Value.absent(),
            Value<String?> senderWalletId = const Value.absent(),
            Value<String?> receiverWalletId = const Value.absent(),
            Value<String?> senderName = const Value.absent(),
            Value<String?> receiverName = const Value.absent(),
            Value<String?> senderPhone = const Value.absent(),
            Value<String?> receiverPhone = const Value.absent(),
            Value<String?> merchantName = const Value.absent(),
            Value<String?> merchantLogo = const Value.absent(),
            Value<String?> category = const Value.absent(),
            Value<double?> fee = const Value.absent(),
            Value<String?> metadata = const Value.absent(),
            Value<String> syncStatus = const Value.absent(),
            Value<int> syncAttempts = const Value.absent(),
            Value<String?> syncError = const Value.absent(),
            Value<DateTime?> lastSyncAttempt = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> syncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              TransactionsCompanion(
            id: id,
            serverId: serverId,
            type: type,
            amount: amount,
            currency: currency,
            status: status,
            description: description,
            reference: reference,
            senderWalletId: senderWalletId,
            receiverWalletId: receiverWalletId,
            senderName: senderName,
            receiverName: receiverName,
            senderPhone: senderPhone,
            receiverPhone: receiverPhone,
            merchantName: merchantName,
            merchantLogo: merchantLogo,
            category: category,
            fee: fee,
            metadata: metadata,
            syncStatus: syncStatus,
            syncAttempts: syncAttempts,
            syncError: syncError,
            lastSyncAttempt: lastSyncAttempt,
            createdAt: createdAt,
            updatedAt: updatedAt,
            syncedAt: syncedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            Value<String?> serverId = const Value.absent(),
            required String type,
            required double amount,
            required String currency,
            required String status,
            Value<String?> description = const Value.absent(),
            Value<String?> reference = const Value.absent(),
            Value<String?> senderWalletId = const Value.absent(),
            Value<String?> receiverWalletId = const Value.absent(),
            Value<String?> senderName = const Value.absent(),
            Value<String?> receiverName = const Value.absent(),
            Value<String?> senderPhone = const Value.absent(),
            Value<String?> receiverPhone = const Value.absent(),
            Value<String?> merchantName = const Value.absent(),
            Value<String?> merchantLogo = const Value.absent(),
            Value<String?> category = const Value.absent(),
            Value<double?> fee = const Value.absent(),
            Value<String?> metadata = const Value.absent(),
            Value<String> syncStatus = const Value.absent(),
            Value<int> syncAttempts = const Value.absent(),
            Value<String?> syncError = const Value.absent(),
            Value<DateTime?> lastSyncAttempt = const Value.absent(),
            required DateTime createdAt,
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> syncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              TransactionsCompanion.insert(
            id: id,
            serverId: serverId,
            type: type,
            amount: amount,
            currency: currency,
            status: status,
            description: description,
            reference: reference,
            senderWalletId: senderWalletId,
            receiverWalletId: receiverWalletId,
            senderName: senderName,
            receiverName: receiverName,
            senderPhone: senderPhone,
            receiverPhone: receiverPhone,
            merchantName: merchantName,
            merchantLogo: merchantLogo,
            category: category,
            fee: fee,
            metadata: metadata,
            syncStatus: syncStatus,
            syncAttempts: syncAttempts,
            syncError: syncError,
            lastSyncAttempt: lastSyncAttempt,
            createdAt: createdAt,
            updatedAt: updatedAt,
            syncedAt: syncedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$TransactionsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $TransactionsTable,
    Transaction,
    $$TransactionsTableFilterComposer,
    $$TransactionsTableOrderingComposer,
    $$TransactionsTableAnnotationComposer,
    $$TransactionsTableCreateCompanionBuilder,
    $$TransactionsTableUpdateCompanionBuilder,
    (
      Transaction,
      BaseReferences<_$AppDatabase, $TransactionsTable, Transaction>
    ),
    Transaction,
    PrefetchHooks Function()>;
typedef $$CardsTableCreateCompanionBuilder = CardsCompanion Function({
  required String id,
  required String userId,
  required String type,
  required String status,
  required String maskedPan,
  Value<String?> cardholderName,
  Value<String?> expiryMonth,
  Value<String?> expiryYear,
  Value<String?> brand,
  Value<String?> walletId,
  Value<double?> balance,
  Value<double?> spendingLimit,
  Value<bool> isFrozen,
  Value<bool> isVirtual,
  Value<String?> color,
  Value<String?> designId,
  Value<String?> settings,
  Value<DateTime?> createdAt,
  Value<DateTime?> updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<int> rowid,
});
typedef $$CardsTableUpdateCompanionBuilder = CardsCompanion Function({
  Value<String> id,
  Value<String> userId,
  Value<String> type,
  Value<String> status,
  Value<String> maskedPan,
  Value<String?> cardholderName,
  Value<String?> expiryMonth,
  Value<String?> expiryYear,
  Value<String?> brand,
  Value<String?> walletId,
  Value<double?> balance,
  Value<double?> spendingLimit,
  Value<bool> isFrozen,
  Value<bool> isVirtual,
  Value<String?> color,
  Value<String?> designId,
  Value<String?> settings,
  Value<DateTime?> createdAt,
  Value<DateTime?> updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<int> rowid,
});

class $$CardsTableFilterComposer extends Composer<_$AppDatabase, $CardsTable> {
  $$CardsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get userId => $composableBuilder(
      column: $table.userId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get maskedPan => $composableBuilder(
      column: $table.maskedPan, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get cardholderName => $composableBuilder(
      column: $table.cardholderName,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get expiryMonth => $composableBuilder(
      column: $table.expiryMonth, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get expiryYear => $composableBuilder(
      column: $table.expiryYear, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get brand => $composableBuilder(
      column: $table.brand, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get walletId => $composableBuilder(
      column: $table.walletId, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get balance => $composableBuilder(
      column: $table.balance, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get spendingLimit => $composableBuilder(
      column: $table.spendingLimit, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isFrozen => $composableBuilder(
      column: $table.isFrozen, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isVirtual => $composableBuilder(
      column: $table.isVirtual, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get color => $composableBuilder(
      column: $table.color, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get designId => $composableBuilder(
      column: $table.designId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get settings => $composableBuilder(
      column: $table.settings, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => ColumnFilters(column));
}

class $$CardsTableOrderingComposer
    extends Composer<_$AppDatabase, $CardsTable> {
  $$CardsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get userId => $composableBuilder(
      column: $table.userId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get maskedPan => $composableBuilder(
      column: $table.maskedPan, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get cardholderName => $composableBuilder(
      column: $table.cardholderName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get expiryMonth => $composableBuilder(
      column: $table.expiryMonth, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get expiryYear => $composableBuilder(
      column: $table.expiryYear, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get brand => $composableBuilder(
      column: $table.brand, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get walletId => $composableBuilder(
      column: $table.walletId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get balance => $composableBuilder(
      column: $table.balance, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get spendingLimit => $composableBuilder(
      column: $table.spendingLimit,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isFrozen => $composableBuilder(
      column: $table.isFrozen, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isVirtual => $composableBuilder(
      column: $table.isVirtual, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get color => $composableBuilder(
      column: $table.color, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get designId => $composableBuilder(
      column: $table.designId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get settings => $composableBuilder(
      column: $table.settings, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt,
      builder: (column) => ColumnOrderings(column));
}

class $$CardsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CardsTable> {
  $$CardsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get userId =>
      $composableBuilder(column: $table.userId, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get maskedPan =>
      $composableBuilder(column: $table.maskedPan, builder: (column) => column);

  GeneratedColumn<String> get cardholderName => $composableBuilder(
      column: $table.cardholderName, builder: (column) => column);

  GeneratedColumn<String> get expiryMonth => $composableBuilder(
      column: $table.expiryMonth, builder: (column) => column);

  GeneratedColumn<String> get expiryYear => $composableBuilder(
      column: $table.expiryYear, builder: (column) => column);

  GeneratedColumn<String> get brand =>
      $composableBuilder(column: $table.brand, builder: (column) => column);

  GeneratedColumn<String> get walletId =>
      $composableBuilder(column: $table.walletId, builder: (column) => column);

  GeneratedColumn<double> get balance =>
      $composableBuilder(column: $table.balance, builder: (column) => column);

  GeneratedColumn<double> get spendingLimit => $composableBuilder(
      column: $table.spendingLimit, builder: (column) => column);

  GeneratedColumn<bool> get isFrozen =>
      $composableBuilder(column: $table.isFrozen, builder: (column) => column);

  GeneratedColumn<bool> get isVirtual =>
      $composableBuilder(column: $table.isVirtual, builder: (column) => column);

  GeneratedColumn<String> get color =>
      $composableBuilder(column: $table.color, builder: (column) => column);

  GeneratedColumn<String> get designId =>
      $composableBuilder(column: $table.designId, builder: (column) => column);

  GeneratedColumn<String> get settings =>
      $composableBuilder(column: $table.settings, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => column);
}

class $$CardsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $CardsTable,
    Card,
    $$CardsTableFilterComposer,
    $$CardsTableOrderingComposer,
    $$CardsTableAnnotationComposer,
    $$CardsTableCreateCompanionBuilder,
    $$CardsTableUpdateCompanionBuilder,
    (Card, BaseReferences<_$AppDatabase, $CardsTable, Card>),
    Card,
    PrefetchHooks Function()> {
  $$CardsTableTableManager(_$AppDatabase db, $CardsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CardsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CardsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CardsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> userId = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String> maskedPan = const Value.absent(),
            Value<String?> cardholderName = const Value.absent(),
            Value<String?> expiryMonth = const Value.absent(),
            Value<String?> expiryYear = const Value.absent(),
            Value<String?> brand = const Value.absent(),
            Value<String?> walletId = const Value.absent(),
            Value<double?> balance = const Value.absent(),
            Value<double?> spendingLimit = const Value.absent(),
            Value<bool> isFrozen = const Value.absent(),
            Value<bool> isVirtual = const Value.absent(),
            Value<String?> color = const Value.absent(),
            Value<String?> designId = const Value.absent(),
            Value<String?> settings = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              CardsCompanion(
            id: id,
            userId: userId,
            type: type,
            status: status,
            maskedPan: maskedPan,
            cardholderName: cardholderName,
            expiryMonth: expiryMonth,
            expiryYear: expiryYear,
            brand: brand,
            walletId: walletId,
            balance: balance,
            spendingLimit: spendingLimit,
            isFrozen: isFrozen,
            isVirtual: isVirtual,
            color: color,
            designId: designId,
            settings: settings,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String userId,
            required String type,
            required String status,
            required String maskedPan,
            Value<String?> cardholderName = const Value.absent(),
            Value<String?> expiryMonth = const Value.absent(),
            Value<String?> expiryYear = const Value.absent(),
            Value<String?> brand = const Value.absent(),
            Value<String?> walletId = const Value.absent(),
            Value<double?> balance = const Value.absent(),
            Value<double?> spendingLimit = const Value.absent(),
            Value<bool> isFrozen = const Value.absent(),
            Value<bool> isVirtual = const Value.absent(),
            Value<String?> color = const Value.absent(),
            Value<String?> designId = const Value.absent(),
            Value<String?> settings = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              CardsCompanion.insert(
            id: id,
            userId: userId,
            type: type,
            status: status,
            maskedPan: maskedPan,
            cardholderName: cardholderName,
            expiryMonth: expiryMonth,
            expiryYear: expiryYear,
            brand: brand,
            walletId: walletId,
            balance: balance,
            spendingLimit: spendingLimit,
            isFrozen: isFrozen,
            isVirtual: isVirtual,
            color: color,
            designId: designId,
            settings: settings,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$CardsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $CardsTable,
    Card,
    $$CardsTableFilterComposer,
    $$CardsTableOrderingComposer,
    $$CardsTableAnnotationComposer,
    $$CardsTableCreateCompanionBuilder,
    $$CardsTableUpdateCompanionBuilder,
    (Card, BaseReferences<_$AppDatabase, $CardsTable, Card>),
    Card,
    PrefetchHooks Function()>;
typedef $$SyncQueueTableCreateCompanionBuilder = SyncQueueCompanion Function({
  Value<int> id,
  required String entityType,
  required String entityId,
  required String operation,
  required String payload,
  Value<String> status,
  Value<int> priority,
  Value<int> attempts,
  Value<int> maxAttempts,
  Value<String?> errorMessage,
  required DateTime createdAt,
  Value<DateTime?> lastAttemptAt,
  Value<DateTime?> nextRetryAt,
  Value<DateTime?> syncedAt,
});
typedef $$SyncQueueTableUpdateCompanionBuilder = SyncQueueCompanion Function({
  Value<int> id,
  Value<String> entityType,
  Value<String> entityId,
  Value<String> operation,
  Value<String> payload,
  Value<String> status,
  Value<int> priority,
  Value<int> attempts,
  Value<int> maxAttempts,
  Value<String?> errorMessage,
  Value<DateTime> createdAt,
  Value<DateTime?> lastAttemptAt,
  Value<DateTime?> nextRetryAt,
  Value<DateTime?> syncedAt,
});

class $$SyncQueueTableFilterComposer
    extends Composer<_$AppDatabase, $SyncQueueTable> {
  $$SyncQueueTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get entityType => $composableBuilder(
      column: $table.entityType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get entityId => $composableBuilder(
      column: $table.entityId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get operation => $composableBuilder(
      column: $table.operation, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get payload => $composableBuilder(
      column: $table.payload, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get priority => $composableBuilder(
      column: $table.priority, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get attempts => $composableBuilder(
      column: $table.attempts, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get maxAttempts => $composableBuilder(
      column: $table.maxAttempts, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get errorMessage => $composableBuilder(
      column: $table.errorMessage, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastAttemptAt => $composableBuilder(
      column: $table.lastAttemptAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get nextRetryAt => $composableBuilder(
      column: $table.nextRetryAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get syncedAt => $composableBuilder(
      column: $table.syncedAt, builder: (column) => ColumnFilters(column));
}

class $$SyncQueueTableOrderingComposer
    extends Composer<_$AppDatabase, $SyncQueueTable> {
  $$SyncQueueTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get entityType => $composableBuilder(
      column: $table.entityType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get entityId => $composableBuilder(
      column: $table.entityId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get operation => $composableBuilder(
      column: $table.operation, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get payload => $composableBuilder(
      column: $table.payload, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get priority => $composableBuilder(
      column: $table.priority, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get attempts => $composableBuilder(
      column: $table.attempts, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get maxAttempts => $composableBuilder(
      column: $table.maxAttempts, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get errorMessage => $composableBuilder(
      column: $table.errorMessage,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastAttemptAt => $composableBuilder(
      column: $table.lastAttemptAt,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get nextRetryAt => $composableBuilder(
      column: $table.nextRetryAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get syncedAt => $composableBuilder(
      column: $table.syncedAt, builder: (column) => ColumnOrderings(column));
}

class $$SyncQueueTableAnnotationComposer
    extends Composer<_$AppDatabase, $SyncQueueTable> {
  $$SyncQueueTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get entityType => $composableBuilder(
      column: $table.entityType, builder: (column) => column);

  GeneratedColumn<String> get entityId =>
      $composableBuilder(column: $table.entityId, builder: (column) => column);

  GeneratedColumn<String> get operation =>
      $composableBuilder(column: $table.operation, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<int> get priority =>
      $composableBuilder(column: $table.priority, builder: (column) => column);

  GeneratedColumn<int> get attempts =>
      $composableBuilder(column: $table.attempts, builder: (column) => column);

  GeneratedColumn<int> get maxAttempts => $composableBuilder(
      column: $table.maxAttempts, builder: (column) => column);

  GeneratedColumn<String> get errorMessage => $composableBuilder(
      column: $table.errorMessage, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get lastAttemptAt => $composableBuilder(
      column: $table.lastAttemptAt, builder: (column) => column);

  GeneratedColumn<DateTime> get nextRetryAt => $composableBuilder(
      column: $table.nextRetryAt, builder: (column) => column);

  GeneratedColumn<DateTime> get syncedAt =>
      $composableBuilder(column: $table.syncedAt, builder: (column) => column);
}

class $$SyncQueueTableTableManager extends RootTableManager<
    _$AppDatabase,
    $SyncQueueTable,
    SyncQueueData,
    $$SyncQueueTableFilterComposer,
    $$SyncQueueTableOrderingComposer,
    $$SyncQueueTableAnnotationComposer,
    $$SyncQueueTableCreateCompanionBuilder,
    $$SyncQueueTableUpdateCompanionBuilder,
    (
      SyncQueueData,
      BaseReferences<_$AppDatabase, $SyncQueueTable, SyncQueueData>
    ),
    SyncQueueData,
    PrefetchHooks Function()> {
  $$SyncQueueTableTableManager(_$AppDatabase db, $SyncQueueTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SyncQueueTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SyncQueueTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SyncQueueTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> entityType = const Value.absent(),
            Value<String> entityId = const Value.absent(),
            Value<String> operation = const Value.absent(),
            Value<String> payload = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int> priority = const Value.absent(),
            Value<int> attempts = const Value.absent(),
            Value<int> maxAttempts = const Value.absent(),
            Value<String?> errorMessage = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime?> lastAttemptAt = const Value.absent(),
            Value<DateTime?> nextRetryAt = const Value.absent(),
            Value<DateTime?> syncedAt = const Value.absent(),
          }) =>
              SyncQueueCompanion(
            id: id,
            entityType: entityType,
            entityId: entityId,
            operation: operation,
            payload: payload,
            status: status,
            priority: priority,
            attempts: attempts,
            maxAttempts: maxAttempts,
            errorMessage: errorMessage,
            createdAt: createdAt,
            lastAttemptAt: lastAttemptAt,
            nextRetryAt: nextRetryAt,
            syncedAt: syncedAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String entityType,
            required String entityId,
            required String operation,
            required String payload,
            Value<String> status = const Value.absent(),
            Value<int> priority = const Value.absent(),
            Value<int> attempts = const Value.absent(),
            Value<int> maxAttempts = const Value.absent(),
            Value<String?> errorMessage = const Value.absent(),
            required DateTime createdAt,
            Value<DateTime?> lastAttemptAt = const Value.absent(),
            Value<DateTime?> nextRetryAt = const Value.absent(),
            Value<DateTime?> syncedAt = const Value.absent(),
          }) =>
              SyncQueueCompanion.insert(
            id: id,
            entityType: entityType,
            entityId: entityId,
            operation: operation,
            payload: payload,
            status: status,
            priority: priority,
            attempts: attempts,
            maxAttempts: maxAttempts,
            errorMessage: errorMessage,
            createdAt: createdAt,
            lastAttemptAt: lastAttemptAt,
            nextRetryAt: nextRetryAt,
            syncedAt: syncedAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$SyncQueueTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $SyncQueueTable,
    SyncQueueData,
    $$SyncQueueTableFilterComposer,
    $$SyncQueueTableOrderingComposer,
    $$SyncQueueTableAnnotationComposer,
    $$SyncQueueTableCreateCompanionBuilder,
    $$SyncQueueTableUpdateCompanionBuilder,
    (
      SyncQueueData,
      BaseReferences<_$AppDatabase, $SyncQueueTable, SyncQueueData>
    ),
    SyncQueueData,
    PrefetchHooks Function()>;
typedef $$ContactsTableCreateCompanionBuilder = ContactsCompanion Function({
  required String id,
  required String userId,
  Value<String?> contactUserId,
  required String name,
  required String phone,
  Value<String?> email,
  Value<String?> avatarUrl,
  Value<bool> isPeeapUser,
  Value<bool> isFavorite,
  Value<int> transactionCount,
  Value<double> totalSent,
  Value<double> totalReceived,
  Value<DateTime?> lastTransactionAt,
  Value<DateTime?> createdAt,
  Value<DateTime?> updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<int> rowid,
});
typedef $$ContactsTableUpdateCompanionBuilder = ContactsCompanion Function({
  Value<String> id,
  Value<String> userId,
  Value<String?> contactUserId,
  Value<String> name,
  Value<String> phone,
  Value<String?> email,
  Value<String?> avatarUrl,
  Value<bool> isPeeapUser,
  Value<bool> isFavorite,
  Value<int> transactionCount,
  Value<double> totalSent,
  Value<double> totalReceived,
  Value<DateTime?> lastTransactionAt,
  Value<DateTime?> createdAt,
  Value<DateTime?> updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<int> rowid,
});

class $$ContactsTableFilterComposer
    extends Composer<_$AppDatabase, $ContactsTable> {
  $$ContactsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get userId => $composableBuilder(
      column: $table.userId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get contactUserId => $composableBuilder(
      column: $table.contactUserId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get phone => $composableBuilder(
      column: $table.phone, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get email => $composableBuilder(
      column: $table.email, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get avatarUrl => $composableBuilder(
      column: $table.avatarUrl, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isPeeapUser => $composableBuilder(
      column: $table.isPeeapUser, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isFavorite => $composableBuilder(
      column: $table.isFavorite, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get transactionCount => $composableBuilder(
      column: $table.transactionCount,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get totalSent => $composableBuilder(
      column: $table.totalSent, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get totalReceived => $composableBuilder(
      column: $table.totalReceived, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastTransactionAt => $composableBuilder(
      column: $table.lastTransactionAt,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => ColumnFilters(column));
}

class $$ContactsTableOrderingComposer
    extends Composer<_$AppDatabase, $ContactsTable> {
  $$ContactsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get userId => $composableBuilder(
      column: $table.userId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get contactUserId => $composableBuilder(
      column: $table.contactUserId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get phone => $composableBuilder(
      column: $table.phone, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get email => $composableBuilder(
      column: $table.email, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get avatarUrl => $composableBuilder(
      column: $table.avatarUrl, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isPeeapUser => $composableBuilder(
      column: $table.isPeeapUser, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isFavorite => $composableBuilder(
      column: $table.isFavorite, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get transactionCount => $composableBuilder(
      column: $table.transactionCount,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get totalSent => $composableBuilder(
      column: $table.totalSent, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get totalReceived => $composableBuilder(
      column: $table.totalReceived,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastTransactionAt => $composableBuilder(
      column: $table.lastTransactionAt,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt,
      builder: (column) => ColumnOrderings(column));
}

class $$ContactsTableAnnotationComposer
    extends Composer<_$AppDatabase, $ContactsTable> {
  $$ContactsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get userId =>
      $composableBuilder(column: $table.userId, builder: (column) => column);

  GeneratedColumn<String> get contactUserId => $composableBuilder(
      column: $table.contactUserId, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get phone =>
      $composableBuilder(column: $table.phone, builder: (column) => column);

  GeneratedColumn<String> get email =>
      $composableBuilder(column: $table.email, builder: (column) => column);

  GeneratedColumn<String> get avatarUrl =>
      $composableBuilder(column: $table.avatarUrl, builder: (column) => column);

  GeneratedColumn<bool> get isPeeapUser => $composableBuilder(
      column: $table.isPeeapUser, builder: (column) => column);

  GeneratedColumn<bool> get isFavorite => $composableBuilder(
      column: $table.isFavorite, builder: (column) => column);

  GeneratedColumn<int> get transactionCount => $composableBuilder(
      column: $table.transactionCount, builder: (column) => column);

  GeneratedColumn<double> get totalSent =>
      $composableBuilder(column: $table.totalSent, builder: (column) => column);

  GeneratedColumn<double> get totalReceived => $composableBuilder(
      column: $table.totalReceived, builder: (column) => column);

  GeneratedColumn<DateTime> get lastTransactionAt => $composableBuilder(
      column: $table.lastTransactionAt, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => column);
}

class $$ContactsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $ContactsTable,
    Contact,
    $$ContactsTableFilterComposer,
    $$ContactsTableOrderingComposer,
    $$ContactsTableAnnotationComposer,
    $$ContactsTableCreateCompanionBuilder,
    $$ContactsTableUpdateCompanionBuilder,
    (Contact, BaseReferences<_$AppDatabase, $ContactsTable, Contact>),
    Contact,
    PrefetchHooks Function()> {
  $$ContactsTableTableManager(_$AppDatabase db, $ContactsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ContactsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ContactsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ContactsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> userId = const Value.absent(),
            Value<String?> contactUserId = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String> phone = const Value.absent(),
            Value<String?> email = const Value.absent(),
            Value<String?> avatarUrl = const Value.absent(),
            Value<bool> isPeeapUser = const Value.absent(),
            Value<bool> isFavorite = const Value.absent(),
            Value<int> transactionCount = const Value.absent(),
            Value<double> totalSent = const Value.absent(),
            Value<double> totalReceived = const Value.absent(),
            Value<DateTime?> lastTransactionAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              ContactsCompanion(
            id: id,
            userId: userId,
            contactUserId: contactUserId,
            name: name,
            phone: phone,
            email: email,
            avatarUrl: avatarUrl,
            isPeeapUser: isPeeapUser,
            isFavorite: isFavorite,
            transactionCount: transactionCount,
            totalSent: totalSent,
            totalReceived: totalReceived,
            lastTransactionAt: lastTransactionAt,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String userId,
            Value<String?> contactUserId = const Value.absent(),
            required String name,
            required String phone,
            Value<String?> email = const Value.absent(),
            Value<String?> avatarUrl = const Value.absent(),
            Value<bool> isPeeapUser = const Value.absent(),
            Value<bool> isFavorite = const Value.absent(),
            Value<int> transactionCount = const Value.absent(),
            Value<double> totalSent = const Value.absent(),
            Value<double> totalReceived = const Value.absent(),
            Value<DateTime?> lastTransactionAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              ContactsCompanion.insert(
            id: id,
            userId: userId,
            contactUserId: contactUserId,
            name: name,
            phone: phone,
            email: email,
            avatarUrl: avatarUrl,
            isPeeapUser: isPeeapUser,
            isFavorite: isFavorite,
            transactionCount: transactionCount,
            totalSent: totalSent,
            totalReceived: totalReceived,
            lastTransactionAt: lastTransactionAt,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$ContactsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $ContactsTable,
    Contact,
    $$ContactsTableFilterComposer,
    $$ContactsTableOrderingComposer,
    $$ContactsTableAnnotationComposer,
    $$ContactsTableCreateCompanionBuilder,
    $$ContactsTableUpdateCompanionBuilder,
    (Contact, BaseReferences<_$AppDatabase, $ContactsTable, Contact>),
    Contact,
    PrefetchHooks Function()>;
typedef $$RecentRecipientsTableCreateCompanionBuilder
    = RecentRecipientsCompanion Function({
  Value<int> id,
  required String userId,
  required String contactId,
  required String contactPhone,
  required String contactName,
  Value<double?> lastAmount,
  Value<String?> lastCurrency,
  required DateTime usedAt,
});
typedef $$RecentRecipientsTableUpdateCompanionBuilder
    = RecentRecipientsCompanion Function({
  Value<int> id,
  Value<String> userId,
  Value<String> contactId,
  Value<String> contactPhone,
  Value<String> contactName,
  Value<double?> lastAmount,
  Value<String?> lastCurrency,
  Value<DateTime> usedAt,
});

class $$RecentRecipientsTableFilterComposer
    extends Composer<_$AppDatabase, $RecentRecipientsTable> {
  $$RecentRecipientsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get userId => $composableBuilder(
      column: $table.userId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get contactId => $composableBuilder(
      column: $table.contactId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get contactPhone => $composableBuilder(
      column: $table.contactPhone, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get contactName => $composableBuilder(
      column: $table.contactName, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get lastAmount => $composableBuilder(
      column: $table.lastAmount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastCurrency => $composableBuilder(
      column: $table.lastCurrency, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get usedAt => $composableBuilder(
      column: $table.usedAt, builder: (column) => ColumnFilters(column));
}

class $$RecentRecipientsTableOrderingComposer
    extends Composer<_$AppDatabase, $RecentRecipientsTable> {
  $$RecentRecipientsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get userId => $composableBuilder(
      column: $table.userId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get contactId => $composableBuilder(
      column: $table.contactId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get contactPhone => $composableBuilder(
      column: $table.contactPhone,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get contactName => $composableBuilder(
      column: $table.contactName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get lastAmount => $composableBuilder(
      column: $table.lastAmount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastCurrency => $composableBuilder(
      column: $table.lastCurrency,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get usedAt => $composableBuilder(
      column: $table.usedAt, builder: (column) => ColumnOrderings(column));
}

class $$RecentRecipientsTableAnnotationComposer
    extends Composer<_$AppDatabase, $RecentRecipientsTable> {
  $$RecentRecipientsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get userId =>
      $composableBuilder(column: $table.userId, builder: (column) => column);

  GeneratedColumn<String> get contactId =>
      $composableBuilder(column: $table.contactId, builder: (column) => column);

  GeneratedColumn<String> get contactPhone => $composableBuilder(
      column: $table.contactPhone, builder: (column) => column);

  GeneratedColumn<String> get contactName => $composableBuilder(
      column: $table.contactName, builder: (column) => column);

  GeneratedColumn<double> get lastAmount => $composableBuilder(
      column: $table.lastAmount, builder: (column) => column);

  GeneratedColumn<String> get lastCurrency => $composableBuilder(
      column: $table.lastCurrency, builder: (column) => column);

  GeneratedColumn<DateTime> get usedAt =>
      $composableBuilder(column: $table.usedAt, builder: (column) => column);
}

class $$RecentRecipientsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $RecentRecipientsTable,
    RecentRecipient,
    $$RecentRecipientsTableFilterComposer,
    $$RecentRecipientsTableOrderingComposer,
    $$RecentRecipientsTableAnnotationComposer,
    $$RecentRecipientsTableCreateCompanionBuilder,
    $$RecentRecipientsTableUpdateCompanionBuilder,
    (
      RecentRecipient,
      BaseReferences<_$AppDatabase, $RecentRecipientsTable, RecentRecipient>
    ),
    RecentRecipient,
    PrefetchHooks Function()> {
  $$RecentRecipientsTableTableManager(
      _$AppDatabase db, $RecentRecipientsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$RecentRecipientsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$RecentRecipientsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$RecentRecipientsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> userId = const Value.absent(),
            Value<String> contactId = const Value.absent(),
            Value<String> contactPhone = const Value.absent(),
            Value<String> contactName = const Value.absent(),
            Value<double?> lastAmount = const Value.absent(),
            Value<String?> lastCurrency = const Value.absent(),
            Value<DateTime> usedAt = const Value.absent(),
          }) =>
              RecentRecipientsCompanion(
            id: id,
            userId: userId,
            contactId: contactId,
            contactPhone: contactPhone,
            contactName: contactName,
            lastAmount: lastAmount,
            lastCurrency: lastCurrency,
            usedAt: usedAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String userId,
            required String contactId,
            required String contactPhone,
            required String contactName,
            Value<double?> lastAmount = const Value.absent(),
            Value<String?> lastCurrency = const Value.absent(),
            required DateTime usedAt,
          }) =>
              RecentRecipientsCompanion.insert(
            id: id,
            userId: userId,
            contactId: contactId,
            contactPhone: contactPhone,
            contactName: contactName,
            lastAmount: lastAmount,
            lastCurrency: lastCurrency,
            usedAt: usedAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$RecentRecipientsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $RecentRecipientsTable,
    RecentRecipient,
    $$RecentRecipientsTableFilterComposer,
    $$RecentRecipientsTableOrderingComposer,
    $$RecentRecipientsTableAnnotationComposer,
    $$RecentRecipientsTableCreateCompanionBuilder,
    $$RecentRecipientsTableUpdateCompanionBuilder,
    (
      RecentRecipient,
      BaseReferences<_$AppDatabase, $RecentRecipientsTable, RecentRecipient>
    ),
    RecentRecipient,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$UsersTableTableManager get users =>
      $$UsersTableTableManager(_db, _db.users);
  $$WalletsTableTableManager get wallets =>
      $$WalletsTableTableManager(_db, _db.wallets);
  $$TransactionsTableTableManager get transactions =>
      $$TransactionsTableTableManager(_db, _db.transactions);
  $$CardsTableTableManager get cards =>
      $$CardsTableTableManager(_db, _db.cards);
  $$SyncQueueTableTableManager get syncQueue =>
      $$SyncQueueTableTableManager(_db, _db.syncQueue);
  $$ContactsTableTableManager get contacts =>
      $$ContactsTableTableManager(_db, _db.contacts);
  $$RecentRecipientsTableTableManager get recentRecipients =>
      $$RecentRecipientsTableTableManager(_db, _db.recentRecipients);
}
