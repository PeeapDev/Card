import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../shared/models/transaction_model.dart';

class TransactionItem extends StatelessWidget {
  final TransactionModel transaction;
  final VoidCallback? onTap;

  const TransactionItem({
    super.key,
    required this.transaction,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: const BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: AppColors.divider,
              width: 1,
            ),
          ),
        ),
        child: Row(
          children: [
            // Icon
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: _getIconBackgroundColor().withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                _getIcon(),
                color: _getIconBackgroundColor(),
                size: 24,
              ),
            ),

            const SizedBox(width: 12),

            // Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    transaction.displayTitle,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    transaction.createdAt != null
                        ? DateFormatter.smart(transaction.createdAt!)
                        : '',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),

            // Amount
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${transaction.isCredit ? '+' : '-'}${CurrencyFormatter.format(transaction.amount, currency: transaction.currency)}',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: transaction.isCredit
                        ? AppColors.success
                        : AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                _buildStatusBadge(),
              ],
            ),
          ],
        ),
      ),
    );
  }

  IconData _getIcon() {
    switch (transaction.type) {
      case 'transfer':
        return transaction.isCredit
            ? Icons.arrow_downward
            : Icons.arrow_upward;
      case 'deposit':
        return Icons.add_circle_outline;
      case 'withdrawal':
        return Icons.remove_circle_outline;
      case 'payment':
        return Icons.shopping_bag_outlined;
      case 'refund':
        return Icons.replay;
      case 'cashback':
        return Icons.card_giftcard;
      default:
        return Icons.swap_horiz;
    }
  }

  Color _getIconBackgroundColor() {
    switch (transaction.type) {
      case 'transfer':
        return transaction.isCredit ? AppColors.success : AppColors.primary;
      case 'deposit':
        return AppColors.success;
      case 'withdrawal':
        return AppColors.warning;
      case 'payment':
        return AppColors.primary;
      case 'refund':
        return AppColors.info;
      case 'cashback':
        return AppColors.secondary;
      default:
        return AppColors.textSecondary;
    }
  }

  Widget _buildStatusBadge() {
    Color color;
    String text;

    switch (transaction.status) {
      case 'completed':
        color = AppColors.success;
        text = 'Completed';
        break;
      case 'pending':
        color = AppColors.warning;
        text = 'Pending';
        break;
      case 'failed':
        color = AppColors.error;
        text = 'Failed';
        break;
      case 'processing':
        color = AppColors.info;
        text = 'Processing';
        break;
      default:
        color = AppColors.textSecondary;
        text = transaction.status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
    );
  }
}
