// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'card_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

CardModel _$CardModelFromJson(Map<String, dynamic> json) {
  return _CardModel.fromJson(json);
}

/// @nodoc
mixin _$CardModel {
  String get id => throw _privateConstructorUsedError;
  String get userId => throw _privateConstructorUsedError;
  String get type => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  String get maskedPan => throw _privateConstructorUsedError;
  String? get cardholderName => throw _privateConstructorUsedError;
  String? get expiryMonth => throw _privateConstructorUsedError;
  String? get expiryYear => throw _privateConstructorUsedError;
  String? get brand => throw _privateConstructorUsedError;
  String? get walletId => throw _privateConstructorUsedError;
  double? get balance => throw _privateConstructorUsedError;
  double? get spendingLimit => throw _privateConstructorUsedError;
  bool get isFrozen => throw _privateConstructorUsedError;
  bool get isVirtual => throw _privateConstructorUsedError;
  String? get color => throw _privateConstructorUsedError;
  String? get designId => throw _privateConstructorUsedError;
  Map<String, dynamic>? get settings => throw _privateConstructorUsedError;
  DateTime? get createdAt => throw _privateConstructorUsedError;
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  /// Serializes this CardModel to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CardModel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CardModelCopyWith<CardModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CardModelCopyWith<$Res> {
  factory $CardModelCopyWith(CardModel value, $Res Function(CardModel) then) =
      _$CardModelCopyWithImpl<$Res, CardModel>;
  @useResult
  $Res call(
      {String id,
      String userId,
      String type,
      String status,
      String maskedPan,
      String? cardholderName,
      String? expiryMonth,
      String? expiryYear,
      String? brand,
      String? walletId,
      double? balance,
      double? spendingLimit,
      bool isFrozen,
      bool isVirtual,
      String? color,
      String? designId,
      Map<String, dynamic>? settings,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class _$CardModelCopyWithImpl<$Res, $Val extends CardModel>
    implements $CardModelCopyWith<$Res> {
  _$CardModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CardModel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? type = null,
    Object? status = null,
    Object? maskedPan = null,
    Object? cardholderName = freezed,
    Object? expiryMonth = freezed,
    Object? expiryYear = freezed,
    Object? brand = freezed,
    Object? walletId = freezed,
    Object? balance = freezed,
    Object? spendingLimit = freezed,
    Object? isFrozen = null,
    Object? isVirtual = null,
    Object? color = freezed,
    Object? designId = freezed,
    Object? settings = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      userId: null == userId
          ? _value.userId
          : userId // ignore: cast_nullable_to_non_nullable
              as String,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      maskedPan: null == maskedPan
          ? _value.maskedPan
          : maskedPan // ignore: cast_nullable_to_non_nullable
              as String,
      cardholderName: freezed == cardholderName
          ? _value.cardholderName
          : cardholderName // ignore: cast_nullable_to_non_nullable
              as String?,
      expiryMonth: freezed == expiryMonth
          ? _value.expiryMonth
          : expiryMonth // ignore: cast_nullable_to_non_nullable
              as String?,
      expiryYear: freezed == expiryYear
          ? _value.expiryYear
          : expiryYear // ignore: cast_nullable_to_non_nullable
              as String?,
      brand: freezed == brand
          ? _value.brand
          : brand // ignore: cast_nullable_to_non_nullable
              as String?,
      walletId: freezed == walletId
          ? _value.walletId
          : walletId // ignore: cast_nullable_to_non_nullable
              as String?,
      balance: freezed == balance
          ? _value.balance
          : balance // ignore: cast_nullable_to_non_nullable
              as double?,
      spendingLimit: freezed == spendingLimit
          ? _value.spendingLimit
          : spendingLimit // ignore: cast_nullable_to_non_nullable
              as double?,
      isFrozen: null == isFrozen
          ? _value.isFrozen
          : isFrozen // ignore: cast_nullable_to_non_nullable
              as bool,
      isVirtual: null == isVirtual
          ? _value.isVirtual
          : isVirtual // ignore: cast_nullable_to_non_nullable
              as bool,
      color: freezed == color
          ? _value.color
          : color // ignore: cast_nullable_to_non_nullable
              as String?,
      designId: freezed == designId
          ? _value.designId
          : designId // ignore: cast_nullable_to_non_nullable
              as String?,
      settings: freezed == settings
          ? _value.settings
          : settings // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CardModelImplCopyWith<$Res>
    implements $CardModelCopyWith<$Res> {
  factory _$$CardModelImplCopyWith(
          _$CardModelImpl value, $Res Function(_$CardModelImpl) then) =
      __$$CardModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String userId,
      String type,
      String status,
      String maskedPan,
      String? cardholderName,
      String? expiryMonth,
      String? expiryYear,
      String? brand,
      String? walletId,
      double? balance,
      double? spendingLimit,
      bool isFrozen,
      bool isVirtual,
      String? color,
      String? designId,
      Map<String, dynamic>? settings,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class __$$CardModelImplCopyWithImpl<$Res>
    extends _$CardModelCopyWithImpl<$Res, _$CardModelImpl>
    implements _$$CardModelImplCopyWith<$Res> {
  __$$CardModelImplCopyWithImpl(
      _$CardModelImpl _value, $Res Function(_$CardModelImpl) _then)
      : super(_value, _then);

  /// Create a copy of CardModel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? type = null,
    Object? status = null,
    Object? maskedPan = null,
    Object? cardholderName = freezed,
    Object? expiryMonth = freezed,
    Object? expiryYear = freezed,
    Object? brand = freezed,
    Object? walletId = freezed,
    Object? balance = freezed,
    Object? spendingLimit = freezed,
    Object? isFrozen = null,
    Object? isVirtual = null,
    Object? color = freezed,
    Object? designId = freezed,
    Object? settings = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$CardModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      userId: null == userId
          ? _value.userId
          : userId // ignore: cast_nullable_to_non_nullable
              as String,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      maskedPan: null == maskedPan
          ? _value.maskedPan
          : maskedPan // ignore: cast_nullable_to_non_nullable
              as String,
      cardholderName: freezed == cardholderName
          ? _value.cardholderName
          : cardholderName // ignore: cast_nullable_to_non_nullable
              as String?,
      expiryMonth: freezed == expiryMonth
          ? _value.expiryMonth
          : expiryMonth // ignore: cast_nullable_to_non_nullable
              as String?,
      expiryYear: freezed == expiryYear
          ? _value.expiryYear
          : expiryYear // ignore: cast_nullable_to_non_nullable
              as String?,
      brand: freezed == brand
          ? _value.brand
          : brand // ignore: cast_nullable_to_non_nullable
              as String?,
      walletId: freezed == walletId
          ? _value.walletId
          : walletId // ignore: cast_nullable_to_non_nullable
              as String?,
      balance: freezed == balance
          ? _value.balance
          : balance // ignore: cast_nullable_to_non_nullable
              as double?,
      spendingLimit: freezed == spendingLimit
          ? _value.spendingLimit
          : spendingLimit // ignore: cast_nullable_to_non_nullable
              as double?,
      isFrozen: null == isFrozen
          ? _value.isFrozen
          : isFrozen // ignore: cast_nullable_to_non_nullable
              as bool,
      isVirtual: null == isVirtual
          ? _value.isVirtual
          : isVirtual // ignore: cast_nullable_to_non_nullable
              as bool,
      color: freezed == color
          ? _value.color
          : color // ignore: cast_nullable_to_non_nullable
              as String?,
      designId: freezed == designId
          ? _value.designId
          : designId // ignore: cast_nullable_to_non_nullable
              as String?,
      settings: freezed == settings
          ? _value._settings
          : settings // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CardModelImpl implements _CardModel {
  const _$CardModelImpl(
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
      this.isFrozen = false,
      this.isVirtual = false,
      this.color,
      this.designId,
      final Map<String, dynamic>? settings,
      this.createdAt,
      this.updatedAt})
      : _settings = settings;

  factory _$CardModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$CardModelImplFromJson(json);

  @override
  final String id;
  @override
  final String userId;
  @override
  final String type;
  @override
  final String status;
  @override
  final String maskedPan;
  @override
  final String? cardholderName;
  @override
  final String? expiryMonth;
  @override
  final String? expiryYear;
  @override
  final String? brand;
  @override
  final String? walletId;
  @override
  final double? balance;
  @override
  final double? spendingLimit;
  @override
  @JsonKey()
  final bool isFrozen;
  @override
  @JsonKey()
  final bool isVirtual;
  @override
  final String? color;
  @override
  final String? designId;
  final Map<String, dynamic>? _settings;
  @override
  Map<String, dynamic>? get settings {
    final value = _settings;
    if (value == null) return null;
    if (_settings is EqualUnmodifiableMapView) return _settings;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  final DateTime? createdAt;
  @override
  final DateTime? updatedAt;

  @override
  String toString() {
    return 'CardModel(id: $id, userId: $userId, type: $type, status: $status, maskedPan: $maskedPan, cardholderName: $cardholderName, expiryMonth: $expiryMonth, expiryYear: $expiryYear, brand: $brand, walletId: $walletId, balance: $balance, spendingLimit: $spendingLimit, isFrozen: $isFrozen, isVirtual: $isVirtual, color: $color, designId: $designId, settings: $settings, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CardModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.userId, userId) || other.userId == userId) &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.maskedPan, maskedPan) ||
                other.maskedPan == maskedPan) &&
            (identical(other.cardholderName, cardholderName) ||
                other.cardholderName == cardholderName) &&
            (identical(other.expiryMonth, expiryMonth) ||
                other.expiryMonth == expiryMonth) &&
            (identical(other.expiryYear, expiryYear) ||
                other.expiryYear == expiryYear) &&
            (identical(other.brand, brand) || other.brand == brand) &&
            (identical(other.walletId, walletId) ||
                other.walletId == walletId) &&
            (identical(other.balance, balance) || other.balance == balance) &&
            (identical(other.spendingLimit, spendingLimit) ||
                other.spendingLimit == spendingLimit) &&
            (identical(other.isFrozen, isFrozen) ||
                other.isFrozen == isFrozen) &&
            (identical(other.isVirtual, isVirtual) ||
                other.isVirtual == isVirtual) &&
            (identical(other.color, color) || other.color == color) &&
            (identical(other.designId, designId) ||
                other.designId == designId) &&
            const DeepCollectionEquality().equals(other._settings, _settings) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hashAll([
        runtimeType,
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
        const DeepCollectionEquality().hash(_settings),
        createdAt,
        updatedAt
      ]);

  /// Create a copy of CardModel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CardModelImplCopyWith<_$CardModelImpl> get copyWith =>
      __$$CardModelImplCopyWithImpl<_$CardModelImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CardModelImplToJson(
      this,
    );
  }
}

abstract class _CardModel implements CardModel {
  const factory _CardModel(
      {required final String id,
      required final String userId,
      required final String type,
      required final String status,
      required final String maskedPan,
      final String? cardholderName,
      final String? expiryMonth,
      final String? expiryYear,
      final String? brand,
      final String? walletId,
      final double? balance,
      final double? spendingLimit,
      final bool isFrozen,
      final bool isVirtual,
      final String? color,
      final String? designId,
      final Map<String, dynamic>? settings,
      final DateTime? createdAt,
      final DateTime? updatedAt}) = _$CardModelImpl;

  factory _CardModel.fromJson(Map<String, dynamic> json) =
      _$CardModelImpl.fromJson;

  @override
  String get id;
  @override
  String get userId;
  @override
  String get type;
  @override
  String get status;
  @override
  String get maskedPan;
  @override
  String? get cardholderName;
  @override
  String? get expiryMonth;
  @override
  String? get expiryYear;
  @override
  String? get brand;
  @override
  String? get walletId;
  @override
  double? get balance;
  @override
  double? get spendingLimit;
  @override
  bool get isFrozen;
  @override
  bool get isVirtual;
  @override
  String? get color;
  @override
  String? get designId;
  @override
  Map<String, dynamic>? get settings;
  @override
  DateTime? get createdAt;
  @override
  DateTime? get updatedAt;

  /// Create a copy of CardModel
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CardModelImplCopyWith<_$CardModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
