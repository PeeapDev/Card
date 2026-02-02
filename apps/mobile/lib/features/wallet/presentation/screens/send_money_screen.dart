import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/validators.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../providers/wallet_provider.dart';

class SendMoneyScreen extends ConsumerStatefulWidget {
  const SendMoneyScreen({super.key});

  @override
  ConsumerState<SendMoneyScreen> createState() => _SendMoneyScreenState();
}

class _SendMoneyScreenState extends ConsumerState<SendMoneyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  int _step = 0; // 0: Enter details, 1: Confirm

  @override
  void dispose() {
    _phoneController.dispose();
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  void _proceed() {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _step = 1);
  }

  Future<void> _sendMoney() async {
    final wallets = await ref.read(walletsProvider.future);
    if (wallets.isEmpty) return;

    final primaryWallet =
        wallets.firstWhere((w) => w.isPrimary, orElse: () => wallets.first);

    final notifier = ref.read(walletOperationsProvider.notifier);
    final success = await notifier.sendMoney(
      recipientPhone: _phoneController.text,
      amount: double.parse(_amountController.text.replaceAll(',', '')),
      walletId: primaryWallet.id,
      note: _noteController.text.isNotEmpty ? _noteController.text : null,
    );

    if (success && mounted) {
      _showSuccessDialog();
    }
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check,
                color: Colors.white,
                size: 40,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Money Sent!',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'You sent ${CurrencyFormatter.format(double.parse(_amountController.text.replaceAll(',', '')))} to ${_phoneController.text}',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                context.pop();
              },
              child: const Text('Done'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final operationState = ref.watch(walletOperationsProvider);
    final primaryWallet = ref.watch(primaryWalletProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Send Money'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_step == 1) {
              setState(() => _step = 0);
            } else {
              context.pop();
            }
          },
        ),
      ),
      body: SafeArea(
        child: _step == 0
            ? _buildDetailsStep(primaryWallet)
            : _buildConfirmStep(operationState, primaryWallet),
      ),
    );
  }

  Widget _buildDetailsStep(AsyncValue primaryWallet) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Balance info
            primaryWallet.when(
              data: (wallet) => Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.account_balance_wallet,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Available Balance',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                        Text(
                          CurrencyFormatter.format(
                            wallet?.balance ?? 0,
                            currency: wallet?.currency ?? 'SLE',
                          ),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              loading: () => const SizedBox(),
              error: (_, __) => const SizedBox(),
            ),

            const SizedBox(height: 24),

            // Recipient phone
            PhoneTextField(
              controller: _phoneController,
              validator: Validators.phone,
            ),

            const SizedBox(height: 16),

            // Amount
            AmountTextField(
              controller: _amountController,
              validator: (value) => Validators.amount(value, min: 100),
            ),

            const SizedBox(height: 16),

            // Note (optional)
            AppTextField(
              label: 'Note (Optional)',
              hint: 'Add a note',
              controller: _noteController,
              maxLines: 2,
            ),

            const SizedBox(height: 32),

            AppButton(
              text: 'Continue',
              onPressed: _proceed,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConfirmStep(
      WalletOperationsState state, AsyncValue primaryWallet) {
    final amount = double.parse(_amountController.text.replaceAll(',', ''));

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Icon(
            Icons.send,
            size: 64,
            color: AppColors.primary,
          ),

          const SizedBox(height: 16),

          const Text(
            'You are sending',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 14,
            ),
          ),

          const SizedBox(height: 8),

          Text(
            CurrencyFormatter.format(amount),
            style: const TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),

          const SizedBox(height: 8),

          Text(
            'to ${_phoneController.text}',
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 16,
            ),
          ),

          const SizedBox(height: 32),

          // Transaction details
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.inputFill,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                _buildDetailRow('Amount', CurrencyFormatter.format(amount)),
                const Divider(),
                _buildDetailRow('Fee', 'Le 0.00'),
                const Divider(),
                _buildDetailRow('Total', CurrencyFormatter.format(amount)),
                if (_noteController.text.isNotEmpty) ...[
                  const Divider(),
                  _buildDetailRow('Note', _noteController.text),
                ],
              ],
            ),
          ),

          if (state.error != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.error.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error, color: AppColors.error, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      state.error!,
                      style: const TextStyle(color: AppColors.error),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 32),

          AppButton(
            text: 'Confirm & Send',
            onPressed: _sendMoney,
            isLoading: state.isLoading,
          ),

          const SizedBox(height: 16),

          AppButton(
            text: 'Cancel',
            variant: AppButtonVariant.outline,
            onPressed: () => context.pop(),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textSecondary,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
