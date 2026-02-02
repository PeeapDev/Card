import 'package:freezed_annotation/freezed_annotation.dart';

part 'transaction_model.freezed.dart';
part 'transaction_model.g.dart';

@freezed
class TransactionModel with _$TransactionModel {
  const factory TransactionModel({
    required String id,
    required String type,
    required double amount,
    required String currency,
    required String status,
    String? description,
    String? reference,
    String? senderWalletId,
    String? receiverWalletId,
    String? senderName,
    String? receiverName,
    String? receiverPhone,
    String? merchantName,
    String? merchantLogo,
    String? category,
    double? fee,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? updatedAt,
    /// Sync status for offline-first (pending, syncing, synced, failed)
    String? syncStatus,
    String? syncError,
  }) = _TransactionModel;

  factory TransactionModel.fromJson(Map<String, dynamic> json) =>
      _$TransactionModelFromJson(json);
}

enum TransactionType {
  transfer,
  deposit,
  withdrawal,
  payment,
  refund,
  fee,
  reversal,
  cashback,
}

enum TransactionStatus {
  pending,
  processing,
  completed,
  failed,
  cancelled,
  reversed,
}

extension TransactionModelExtension on TransactionModel {
  bool get isCredit {
    return type == 'deposit' ||
        type == 'refund' ||
        type == 'cashback' ||
        (type == 'transfer' && receiverWalletId != null);
  }

  bool get isDebit {
    return type == 'withdrawal' ||
        type == 'payment' ||
        type == 'fee' ||
        (type == 'transfer' && senderWalletId != null);
  }

  String get displayAmount {
    final prefix = isCredit ? '+' : '-';
    return '$prefix${amount.toStringAsFixed(2)}';
  }

  String get displayTitle {
    switch (type) {
      case 'transfer':
        return isCredit
            ? 'Received from ${senderName ?? 'Unknown'}'
            : 'Sent to ${receiverName ?? 'Unknown'}';
      case 'deposit':
        return description ?? 'Deposit';
      case 'withdrawal':
        return description ?? 'Withdrawal';
      case 'payment':
        return merchantName ?? description ?? 'Payment';
      case 'refund':
        return 'Refund from ${merchantName ?? 'Merchant'}';
      case 'fee':
        return description ?? 'Fee';
      case 'cashback':
        return 'Cashback';
      default:
        return description ?? type;
    }
  }

  /// Whether transaction is synced to server
  bool get isSynced => syncStatus == 'synced';

  /// Whether transaction is pending sync
  bool get isPendingSync => syncStatus == 'pending' || syncStatus == 'syncing';

  /// Whether sync failed
  bool get isSyncFailed => syncStatus == 'failed';

  /// Display sync status text
  String get syncStatusText {
    switch (syncStatus) {
      case 'pending':
        return 'Pending sync';
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return 'Synced';
      case 'failed':
        return 'Sync failed';
      default:
        return 'Unknown';
    }
  }
}
