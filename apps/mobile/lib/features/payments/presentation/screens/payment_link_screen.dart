import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/validators.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';

class PaymentLinkScreen extends ConsumerStatefulWidget {
  const PaymentLinkScreen({super.key});

  @override
  ConsumerState<PaymentLinkScreen> createState() => _PaymentLinkScreenState();
}

class _PaymentLinkScreenState extends ConsumerState<PaymentLinkScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _generatedLink;
  bool _isGenerating = false;

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _generateLink() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isGenerating = true);

    // Simulate link generation
    await Future.delayed(const Duration(seconds: 1));

    setState(() {
      _generatedLink =
          'https://pay.peeap.com/l/${DateTime.now().millisecondsSinceEpoch}';
      _isGenerating = false;
    });
  }

  void _copyLink() {
    if (_generatedLink != null) {
      Clipboard.setData(ClipboardData(text: _generatedLink!));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Link copied to clipboard'),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  void _shareLink() {
    // TODO: Implement share functionality
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Share feature coming soon'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Link'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Create Payment Link',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Generate a link that anyone can use to pay you',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                  ),
                ),

                const SizedBox(height: 32),

                // Amount
                AmountTextField(
                  controller: _amountController,
                  validator: (value) => Validators.amount(value, min: 100),
                ),

                const SizedBox(height: 16),

                // Description
                AppTextField(
                  label: 'Description (Optional)',
                  hint: 'What is this payment for?',
                  controller: _descriptionController,
                  maxLines: 2,
                ),

                const SizedBox(height: 24),

                AppButton(
                  text: 'Generate Link',
                  onPressed: _generateLink,
                  isLoading: _isGenerating,
                ),

                // Generated link section
                if (_generatedLink != null) ...[
                  const SizedBox(height: 32),
                  const Divider(),
                  const SizedBox(height: 24),

                  const Text(
                    'Your Payment Link',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 16),

                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.inputFill,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(
                              Icons.link,
                              color: AppColors.primary,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _generatedLink!,
                                style: const TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Amount: ${CurrencyFormatter.format(double.parse(_amountController.text.replaceAll(',', '')))}',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                        if (_descriptionController.text.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            'For: ${_descriptionController.text}',
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  Row(
                    children: [
                      Expanded(
                        child: AppButton(
                          text: 'Copy Link',
                          icon: Icons.copy,
                          variant: AppButtonVariant.outline,
                          onPressed: _copyLink,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: AppButton(
                          text: 'Share',
                          icon: Icons.share,
                          onPressed: _shareLink,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // QR Code
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.divider),
                      ),
                      child: Column(
                        children: [
                          Container(
                            width: 180,
                            height: 180,
                            decoration: BoxDecoration(
                              border: Border.all(color: AppColors.divider),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.qr_code_2,
                                size: 140,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Scan to pay',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
