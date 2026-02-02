import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../providers/wallet_provider.dart';

class WalletsScreen extends ConsumerWidget {
  const WalletsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wallets = ref.watch(walletsProvider);
    final totalBalance = ref.watch(totalBalanceProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Wallets'),
        actions: [
          IconButton(
            onPressed: () {
              // Show create wallet bottom sheet
              _showCreateWalletSheet(context, ref);
            },
            icon: const Icon(Icons.add),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(walletsProvider);
        },
        child: CustomScrollView(
          slivers: [
            // Total Balance Card
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: totalBalance.when(
                  data: (balance) => AppCard(
                    color: AppColors.primary.withOpacity(0.05),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Total Balance',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          CurrencyFormatter.format(balance),
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  loading: () => const AppCard(
                    child: SizedBox(
                      height: 80,
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  ),
                  error: (_, __) => const AppCard(
                    child: Text('Failed to load balance'),
                  ),
                ),
              ),
            ),

            // Wallets List
            wallets.when(
              data: (walletList) {
                if (walletList.isEmpty) {
                  return SliverFillRemaining(
                    child: EmptyState(
                      icon: Icons.account_balance_wallet_outlined,
                      title: 'No Wallets Yet',
                      description:
                          'Create your first wallet to start managing your money',
                      buttonText: 'Create Wallet',
                      onButtonPressed: () =>
                          _showCreateWalletSheet(context, ref),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final wallet = walletList[index];
                        final gradientIndex =
                            index % AppColors.cardGradients.length;

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: GradientCard(
                            colors: AppColors.cardGradients[gradientIndex],
                            onTap: () => context.push(
                              '${RouteNames.walletDetails}/${wallet.id}',
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          wallet.name,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          wallet.type.toUpperCase(),
                                          style: TextStyle(
                                            color:
                                                Colors.white.withOpacity(0.7),
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (wallet.isPrimary)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withOpacity(0.2),
                                          borderRadius:
                                              BorderRadius.circular(8),
                                        ),
                                        child: const Text(
                                          'PRIMARY',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 24),
                                Text(
                                  CurrencyFormatter.format(
                                    wallet.balance,
                                    currency: wallet.currency,
                                  ),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 28,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Row(
                                  children: [
                                    _buildWalletAction(
                                      icon: Icons.add,
                                      label: 'Add',
                                      onTap: () =>
                                          context.push(RouteNames.deposit),
                                    ),
                                    const SizedBox(width: 12),
                                    _buildWalletAction(
                                      icon: Icons.send,
                                      label: 'Send',
                                      onTap: () =>
                                          context.push(RouteNames.sendMoney),
                                    ),
                                    const SizedBox(width: 12),
                                    _buildWalletAction(
                                      icon: Icons.history,
                                      label: 'History',
                                      onTap: () =>
                                          context.push(RouteNames.transactions),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      childCount: walletList.length,
                    ),
                  ),
                );
              },
              loading: () => const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => SliverFillRemaining(
                child: ErrorState(
                  description: e.toString(),
                  onRetry: () => ref.invalidate(walletsProvider),
                ),
              ),
            ),

            // Bottom padding
            const SliverToBoxAdapter(
              child: SizedBox(height: 100),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWalletAction({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white, size: 16),
            const SizedBox(width: 4),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateWalletSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const CreateWalletSheet(),
    );
  }
}

class CreateWalletSheet extends ConsumerStatefulWidget {
  const CreateWalletSheet({super.key});

  @override
  ConsumerState<CreateWalletSheet> createState() => _CreateWalletSheetState();
}

class _CreateWalletSheetState extends ConsumerState<CreateWalletSheet> {
  final _nameController = TextEditingController();
  String _selectedType = 'savings';

  final _walletTypes = [
    {'type': 'savings', 'label': 'Savings', 'icon': Icons.savings},
    {'type': 'business', 'label': 'Business', 'icon': Icons.business},
    {'type': 'usd', 'label': 'USD', 'icon': Icons.attach_money},
  ];

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _createWallet() async {
    if (_nameController.text.isEmpty) return;

    final notifier = ref.read(walletOperationsProvider.notifier);
    final success = await notifier.createWallet(
      name: _nameController.text,
      type: _selectedType,
      currency: _selectedType == 'usd' ? 'USD' : 'SLE',
    );

    if (success && mounted) {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(walletOperationsProvider);

    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.divider,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Create New Wallet',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Wallet Name',
                hintText: 'e.g., My Savings',
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Wallet Type',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              children: _walletTypes.map((type) {
                final isSelected = _selectedType == type['type'];
                return ChoiceChip(
                  label: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        type['icon'] as IconData,
                        size: 16,
                        color: isSelected ? Colors.white : AppColors.primary,
                      ),
                      const SizedBox(width: 4),
                      Text(type['label'] as String),
                    ],
                  ),
                  selected: isSelected,
                  onSelected: (selected) {
                    setState(() => _selectedType = type['type'] as String);
                  },
                  selectedColor: AppColors.primary,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : AppColors.textPrimary,
                  ),
                );
              }).toList(),
            ),
            if (state.error != null) ...[
              const SizedBox(height: 16),
              Text(
                state.error!,
                style: const TextStyle(color: AppColors.error),
              ),
            ],
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: state.isLoading ? null : _createWallet,
                child: state.isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text('Create Wallet'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
