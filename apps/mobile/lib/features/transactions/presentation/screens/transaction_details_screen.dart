import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../shared/models/transaction_model.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../providers/transaction_provider.dart';

class TransactionDetailsScreen extends ConsumerWidget {
  final String transactionId;

  const TransactionDetailsScreen({super.key, required this.transactionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final transaction = ref.watch(transactionProvider(transactionId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Transaction Details'),
        actions: [
          IconButton(
            onPressed: () {
              // TODO: Share transaction
            },
            icon: const Icon(Icons.share),
          ),
        ],
      ),
      body: transaction.when(
        data: (tx) {
          if (tx == null) {
            return const Center(child: Text('Transaction not found'));
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Status icon
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: _getStatusColor(tx.status).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _getStatusIcon(tx.status),
                    color: _getStatusColor(tx.status),
                    size: 48,
                  ),
                ),

                const SizedBox(height: 24),

                // Amount
                Text(
                  '${tx.isCredit ? '+' : '-'}${CurrencyFormatter.format(tx.amount, currency: tx.currency)}',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color:
                        tx.isCredit ? AppColors.success : AppColors.textPrimary,
                  ),
                ),

                const SizedBox(height: 8),

                // Status badge
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: _getStatusColor(tx.status).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    tx.status.toUpperCase(),
                    style: TextStyle(
                      color: _getStatusColor(tx.status),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),

                const SizedBox(height: 32),

                // Details card
                AppCard(
                  child: Column(
                    children: [
                      _buildDetailRow('Type', tx.type.toUpperCase()),
                      const Divider(),
                      _buildDetailRow('Description', tx.displayTitle),
                      const Divider(),
                      _buildDetailRow(
                        'Date',
                        tx.createdAt != null
                            ? DateFormatter.dateTime(tx.createdAt!)
                            : '-',
                      ),
                      if (tx.reference != null) ...[
                        const Divider(),
                        _buildDetailRow('Reference', tx.reference!, canCopy: true),
                      ],
                      if (tx.fee != null && tx.fee! > 0) ...[
                        const Divider(),
                        _buildDetailRow(
                          'Fee',
                          CurrencyFormatter.format(tx.fee!, currency: tx.currency),
                        ),
                      ],
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // From/To details
                if (tx.senderName != null || tx.receiverName != null)
                  AppCard(
                    child: Column(
                      children: [
                        if (tx.senderName != null)
                          _buildDetailRow('From', tx.senderName!),
                        if (tx.senderName != null && tx.receiverName != null)
                          const Divider(),
                        if (tx.receiverName != null)
                          _buildDetailRow('To', tx.receiverName!),
                      ],
                    ),
                  ),

                const SizedBox(height: 32),

                // Action buttons
                if (tx.status == 'completed') ...[
                  Row(
                    children: [
                      Expanded(
                        child: AppButton(
                          text: 'Receipt',
                          icon: Icons.receipt,
                          variant: AppButtonVariant.outline,
                          onPressed: () {
                            // TODO: Show/download receipt
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: AppButton(
                          text: 'Report Issue',
                          icon: Icons.flag,
                          variant: AppButtonVariant.outline,
                          onPressed: () {
                            // TODO: Report issue
                          },
                        ),
                      ),
                    ],
                  ),
                ],

                if (tx.status == 'failed') ...[
                  AppButton(
                    text: 'Try Again',
                    icon: Icons.refresh,
                    onPressed: () {
                      // TODO: Retry transaction
                    },
                  ),
                ],
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool canCopy = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textSecondary,
            ),
          ),
          Row(
            children: [
              Text(
                value,
                style: const TextStyle(
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (canCopy) ...[
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: value));
                  },
                  child: const Icon(
                    Icons.copy,
                    size: 16,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return AppColors.success;
      case 'pending':
      case 'processing':
        return AppColors.warning;
      case 'failed':
      case 'cancelled':
        return AppColors.error;
      default:
        return AppColors.textSecondary;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return Icons.check_circle;
      case 'pending':
      case 'processing':
        return Icons.schedule;
      case 'failed':
      case 'cancelled':
        return Icons.cancel;
      default:
        return Icons.help;
    }
  }
}
