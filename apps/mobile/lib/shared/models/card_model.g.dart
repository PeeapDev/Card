// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'card_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CardModelImpl _$$CardModelImplFromJson(Map<String, dynamic> json) =>
    _$CardModelImpl(
      id: json['id'] as String,
      userId: json['userId'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      maskedPan: json['maskedPan'] as String,
      cardholderName: json['cardholderName'] as String?,
      expiryMonth: json['expiryMonth'] as String?,
      expiryYear: json['expiryYear'] as String?,
      brand: json['brand'] as String?,
      walletId: json['walletId'] as String?,
      balance: (json['balance'] as num?)?.toDouble(),
      spendingLimit: (json['spendingLimit'] as num?)?.toDouble(),
      isFrozen: json['isFrozen'] as bool? ?? false,
      isVirtual: json['isVirtual'] as bool? ?? false,
      color: json['color'] as String?,
      designId: json['designId'] as String?,
      settings: json['settings'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      updatedAt: json['updatedAt'] == null
          ? null
          : DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$$CardModelImplToJson(_$CardModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'type': instance.type,
      'status': instance.status,
      'maskedPan': instance.maskedPan,
      'cardholderName': instance.cardholderName,
      'expiryMonth': instance.expiryMonth,
      'expiryYear': instance.expiryYear,
      'brand': instance.brand,
      'walletId': instance.walletId,
      'balance': instance.balance,
      'spendingLimit': instance.spendingLimit,
      'isFrozen': instance.isFrozen,
      'isVirtual': instance.isVirtual,
      'color': instance.color,
      'designId': instance.designId,
      'settings': instance.settings,
      'createdAt': instance.createdAt?.toIso8601String(),
      'updatedAt': instance.updatedAt?.toIso8601String(),
    };
