import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../shared/models/user_model.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../providers/wallet_provider.dart';

class ReceiveMoneyScreen extends ConsumerStatefulWidget {
  const ReceiveMoneyScreen({super.key});

  @override
  ConsumerState<ReceiveMoneyScreen> createState() => _ReceiveMoneyScreenState();
}

class _ReceiveMoneyScreenState extends ConsumerState<ReceiveMoneyScreen> {
  final _amountController = TextEditingController();
  bool _showAmount = false;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _copyPhoneNumber(String phone) {
    Clipboard.setData(ClipboardData(text: phone));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Phone number copied'),
        backgroundColor: AppColors.success,
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _sharePaymentDetails() {
    // TODO: Implement share functionality
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Share feature coming soon'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final wallet = ref.watch(primaryWalletProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Receive Money'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // QR Code placeholder
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // User info
                    user.when(
                      data: (u) => Column(
                        children: [
                          CircleAvatar(
                            radius: 32,
                            backgroundColor: AppColors.primary,
                            child: Text(
                              u?.initials ?? 'P',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            u?.fullName ?? 'User',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                      loading: () => const SizedBox(),
                      error: (_, __) => const SizedBox(),
                    ),

                    const SizedBox(height: 24),

                    // QR Code
                    Container(
                      width: 200,
                      height: 200,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.divider, width: 2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.qr_code_2,
                              size: 120,
                              color: AppColors.textPrimary,
                            ),
                            SizedBox(height: 8),
                            Text(
                              'Scan to Pay',
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    if (_showAmount &&
                        _amountController.text.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Text(
                        'Amount: ${CurrencyFormatter.format(double.parse(_amountController.text.replaceAll(',', '')))}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),

                    // Phone number
                    user.when(
                      data: (u) => GestureDetector(
                        onTap: () => _copyPhoneNumber(u?.phone ?? ''),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.inputFill,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.phone,
                                size: 16,
                                color: AppColors.textSecondary,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                u?.phone ?? 'No phone number',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(
                                Icons.copy,
                                size: 16,
                                color: AppColors.primary,
                              ),
                            ],
                          ),
                        ),
                      ),
                      loading: () => const SizedBox(),
                      error: (_, __) => const SizedBox(),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Set amount section
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.divider),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Checkbox(
                          value: _showAmount,
                          onChanged: (value) {
                            setState(() => _showAmount = value ?? false);
                          },
                          activeColor: AppColors.primary,
                        ),
                        const Text(
                          'Request specific amount',
                          style: TextStyle(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    if (_showAmount) ...[
                      const SizedBox(height: 12),
                      AmountTextField(
                        controller: _amountController,
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Share button
              AppButton(
                text: 'Share Payment Details',
                icon: Icons.share,
                onPressed: _sharePaymentDetails,
              ),

              const SizedBox(height: 16),

              // Wallet info
              wallet.when(
                data: (w) => Text(
                  'Funds will be added to your ${w?.name ?? 'wallet'}',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
                loading: () => const SizedBox(),
                error: (_, __) => const SizedBox(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
