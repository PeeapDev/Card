// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'wallet_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$WalletModelImpl _$$WalletModelImplFromJson(Map<String, dynamic> json) =>
    _$WalletModelImpl(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      balance: (json['balance'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'SLE',
      isActive: json['isActive'] as bool? ?? true,
      isFrozen: json['isFrozen'] as bool? ?? false,
      isPrimary: json['isPrimary'] as bool? ?? false,
      accountNumber: json['accountNumber'] as String?,
      color: json['color'] as String?,
      icon: json['icon'] as String?,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      updatedAt: json['updatedAt'] == null
          ? null
          : DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$$WalletModelImplToJson(_$WalletModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'name': instance.name,
      'type': instance.type,
      'balance': instance.balance,
      'currency': instance.currency,
      'isActive': instance.isActive,
      'isFrozen': instance.isFrozen,
      'isPrimary': instance.isPrimary,
      'accountNumber': instance.accountNumber,
      'color': instance.color,
      'icon': instance.icon,
      'createdAt': instance.createdAt?.toIso8601String(),
      'updatedAt': instance.updatedAt?.toIso8601String(),
    };
