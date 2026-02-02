import 'package:freezed_annotation/freezed_annotation.dart';

part 'wallet_model.freezed.dart';
part 'wallet_model.g.dart';

@freezed
class WalletModel with _$WalletModel {
  const factory WalletModel({
    required String id,
    required String userId,
    required String name,
    required String type,
    required double balance,
    @Default('SLE') String currency,
    @Default(true) bool isActive,
    @Default(false) bool isFrozen,
    @Default(false) bool isPrimary,
    String? accountNumber,
    String? color,
    String? icon,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _WalletModel;

  factory WalletModel.fromJson(Map<String, dynamic> json) =>
      _$WalletModelFromJson(json);
}

enum WalletType {
  primary,
  savings,
  business,
  usd,
  school,
  student,
}

extension WalletTypeExtension on String {
  WalletType get toWalletType {
    switch (toLowerCase()) {
      case 'primary':
        return WalletType.primary;
      case 'savings':
        return WalletType.savings;
      case 'business':
        return WalletType.business;
      case 'usd':
        return WalletType.usd;
      case 'school':
        return WalletType.school;
      case 'student':
        return WalletType.student;
      default:
        return WalletType.primary;
    }
  }
}
