// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'transaction_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TransactionModelImpl _$$TransactionModelImplFromJson(
        Map<String, dynamic> json) =>
    _$TransactionModelImpl(
      id: json['id'] as String,
      type: json['type'] as String,
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'] as String,
      status: json['status'] as String,
      description: json['description'] as String?,
      reference: json['reference'] as String?,
      senderWalletId: json['senderWalletId'] as String?,
      receiverWalletId: json['receiverWalletId'] as String?,
      senderName: json['senderName'] as String?,
      receiverName: json['receiverName'] as String?,
      receiverPhone: json['receiverPhone'] as String?,
      merchantName: json['merchantName'] as String?,
      merchantLogo: json['merchantLogo'] as String?,
      category: json['category'] as String?,
      fee: (json['fee'] as num?)?.toDouble(),
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      updatedAt: json['updatedAt'] == null
          ? null
          : DateTime.parse(json['updatedAt'] as String),
      syncStatus: json['syncStatus'] as String?,
      syncError: json['syncError'] as String?,
    );

Map<String, dynamic> _$$TransactionModelImplToJson(
        _$TransactionModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': instance.type,
      'amount': instance.amount,
      'currency': instance.currency,
      'status': instance.status,
      'description': instance.description,
      'reference': instance.reference,
      'senderWalletId': instance.senderWalletId,
      'receiverWalletId': instance.receiverWalletId,
      'senderName': instance.senderName,
      'receiverName': instance.receiverName,
      'receiverPhone': instance.receiverPhone,
      'merchantName': instance.merchantName,
      'merchantLogo': instance.merchantLogo,
      'category': instance.category,
      'fee': instance.fee,
      'metadata': instance.metadata,
      'createdAt': instance.createdAt?.toIso8601String(),
      'updatedAt': instance.updatedAt?.toIso8601String(),
      'syncStatus': instance.syncStatus,
      'syncError': instance.syncError,
    };
