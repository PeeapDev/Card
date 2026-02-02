import 'package:freezed_annotation/freezed_annotation.dart';

part 'card_model.freezed.dart';
part 'card_model.g.dart';

@freezed
class CardModel with _$CardModel {
  const factory CardModel({
    required String id,
    required String userId,
    required String type,
    required String status,
    required String maskedPan,
    String? cardholderName,
    String? expiryMonth,
    String? expiryYear,
    String? brand,
    String? walletId,
    double? balance,
    double? spendingLimit,
    @Default(false) bool isFrozen,
    @Default(false) bool isVirtual,
    String? color,
    String? designId,
    Map<String, dynamic>? settings,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _CardModel;

  factory CardModel.fromJson(Map<String, dynamic> json) =>
      _$CardModelFromJson(json);
}

enum CardType {
  virtual,
  physical,
  prepaid,
  debit,
}

enum CardStatus {
  active,
  inactive,
  frozen,
  expired,
  cancelled,
  pending,
}

extension CardModelExtension on CardModel {
  String get formattedPan {
    // Format as **** **** **** 1234
    if (maskedPan.length >= 4) {
      final lastFour = maskedPan.substring(maskedPan.length - 4);
      return '**** **** **** $lastFour';
    }
    return maskedPan;
  }

  String get expiryDate {
    if (expiryMonth != null && expiryYear != null) {
      return '$expiryMonth/$expiryYear';
    }
    return '--/--';
  }

  bool get isActive => status == 'active' && !isFrozen;

  String get brandIcon {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return 'assets/icons/visa.svg';
      case 'mastercard':
        return 'assets/icons/mastercard.svg';
      case 'verve':
        return 'assets/icons/verve.svg';
      default:
        return 'assets/icons/card.svg';
    }
  }
}
