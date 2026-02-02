import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/validators.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../providers/wallet_provider.dart';

class WithdrawScreen extends ConsumerStatefulWidget {
  const WithdrawScreen({super.key});

  @override
  ConsumerState<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends ConsumerState<WithdrawScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _amountController = TextEditingController();
  String _selectedProvider = 'orange_money';

  final _providers = [
    {
      'id': 'orange_money',
      'name': 'Orange Money',
      'icon': Icons.phone_android,
      'color': AppColors.orangeMoney,
    },
    {
      'id': 'africell_money',
      'name': 'Africell Money',
      'icon': Icons.phone_android,
      'color': AppColors.africellMoney,
    },
    {
      'id': 'qmoney',
      'name': 'QMoney',
      'icon': Icons.phone_android,
      'color': AppColors.qMoney,
    },
  ];

  @override
  void dispose() {
    _phoneController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _withdraw() async {
    if (!_formKey.currentState!.validate()) return;

    final wallets = await ref.read(walletsProvider.future);
    if (wallets.isEmpty) return;

    final primaryWallet =
        wallets.firstWhere((w) => w.isPrimary, orElse: () => wallets.first);

    final notifier = ref.read(walletOperationsProvider.notifier);
    final success = await notifier.withdrawMobileMoney(
      provider: _selectedProvider,
      phoneNumber: _phoneController.text,
      amount: double.parse(_amountController.text.replaceAll(',', '')),
      walletId: primaryWallet.id,
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
              'Withdrawal Initiated',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your withdrawal of ${CurrencyFormatter.format(double.parse(_amountController.text.replaceAll(',', '')))} has been initiated. You will receive it shortly.',
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
        title: const Text('Withdraw'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Available balance
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

                const Text(
                  'Withdraw To',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),

                const SizedBox(height: 16),

                // Provider selection
                ...(_providers.map((provider) {
                  final isSelected = _selectedProvider == provider['id'];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: GestureDetector(
                      onTap: () {
                        setState(
                            () => _selectedProvider = provider['id'] as String);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: isSelected
                                ? provider['color'] as Color
                                : AppColors.divider,
                            width: isSelected ? 2 : 1,
                          ),
                          borderRadius: BorderRadius.circular(12),
                          color: isSelected
                              ? (provider['color'] as Color).withOpacity(0.05)
                              : null,
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: (provider['color'] as Color)
                                    .withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                provider['icon'] as IconData,
                                color: provider['color'] as Color,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              provider['name'] as String,
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                                fontSize: 15,
                              ),
                            ),
                            const Spacer(),
                            if (isSelected)
                              Icon(
                                Icons.check_circle,
                                color: provider['color'] as Color,
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                })),

                const SizedBox(height: 24),

                // Phone number
                PhoneTextField(
                  controller: _phoneController,
                  validator: Validators.phone,
                ),

                const SizedBox(height: 16),

                // Amount
                AmountTextField(
                  controller: _amountController,
                  validator: (value) {
                    final error = Validators.amount(value, min: 1000);
                    if (error != null) return error;

                    final amount =
                        double.tryParse(value?.replaceAll(',', '') ?? '0') ?? 0;
                    final balance = primaryWallet.valueOrNull?.balance ?? 0;
                    if (amount > balance) {
                      return 'Insufficient balance';
                    }
                    return null;
                  },
                ),

                const SizedBox(height: 8),

                const Text(
                  'Min: Le 1,000 | Fee: Le 0',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),

                if (operationState.error != null) ...[
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
                            operationState.error!,
                            style: const TextStyle(color: AppColors.error),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 32),

                AppButton(
                  text: 'Withdraw',
                  onPressed: _withdraw,
                  isLoading: operationState.isLoading,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
