import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../shared/models/user_model.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../../wallet/providers/wallet_provider.dart';
import '../../../transactions/providers/transaction_provider.dart';
import '../widgets/quick_action_button.dart';
import '../widgets/transaction_item.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final wallets = ref.watch(walletsProvider);
    final recentTransactions = ref.watch(recentTransactionsProvider);

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(walletsProvider);
            ref.invalidate(recentTransactionsProvider);
          },
          child: CustomScrollView(
            slivers: [
              // App Bar
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      // Avatar
                      GestureDetector(
                        onTap: () => context.push(RouteNames.profile),
                        child: CircleAvatar(
                          radius: 24,
                          backgroundColor: AppColors.primary,
                          child: user.when(
                            data: (u) => Text(
                              u?.initials ?? 'P',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            loading: () => const SizedBox(),
                            error: (_, __) => const Icon(
                              Icons.person,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Greeting
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _getGreeting(),
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            user.when(
                              data: (u) => Text(
                                u?.firstName ?? 'User',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              loading: () => const Text('Loading...'),
                              error: (_, __) => const Text('User'),
                            ),
                          ],
                        ),
                      ),

                      // Notification bell
                      IconButton(
                        onPressed: () => context.push(RouteNames.notifications),
                        icon: Stack(
                          children: [
                            const Icon(
                              Icons.notifications_outlined,
                              color: AppColors.textPrimary,
                              size: 28,
                            ),
                            Positioned(
                              right: 0,
                              top: 0,
                              child: Container(
                                width: 10,
                                height: 10,
                                decoration: const BoxDecoration(
                                  color: AppColors.error,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Balance Card
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: wallets.when(
                    data: (walletList) {
                      final primaryWallet = walletList.isNotEmpty
                          ? walletList.firstWhere(
                              (w) => w.isPrimary,
                              orElse: () => walletList.first,
                            )
                          : null;

                      return GradientCard(
                        colors: AppColors.cardGradients[0],
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Total Balance',
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 14,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    primaryWallet?.currency ?? 'SLE',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              CurrencyFormatter.format(
                                primaryWallet?.balance ?? 0,
                                currency: primaryWallet?.currency ?? 'SLE',
                              ),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                _buildBalanceAction(
                                  icon: Icons.add,
                                  label: 'Add Money',
                                  onTap: () => context.push(RouteNames.deposit),
                                ),
                                const SizedBox(width: 16),
                                _buildBalanceAction(
                                  icon: Icons.send,
                                  label: 'Send',
                                  onTap: () =>
                                      context.push(RouteNames.sendMoney),
                                ),
                                const SizedBox(width: 16),
                                _buildBalanceAction(
                                  icon: Icons.arrow_downward,
                                  label: 'Withdraw',
                                  onTap: () =>
                                      context.push(RouteNames.withdraw),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                    loading: () => const GradientCard(
                      colors: [AppColors.primary, AppColors.primaryDark],
                      child: SizedBox(
                        height: 140,
                        child: Center(
                          child: CircularProgressIndicator(
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    error: (_, __) => const GradientCard(
                      colors: [AppColors.primary, AppColors.primaryDark],
                      child: SizedBox(
                        height: 140,
                        child: Center(
                          child: Text(
                            'Failed to load balance',
                            style: TextStyle(color: Colors.white),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              // Quick Actions
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Quick Actions',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          QuickActionButton(
                            icon: Icons.phone_android,
                            label: 'Airtime',
                            color: AppColors.orangeMoney,
                            onTap: () {},
                          ),
                          QuickActionButton(
                            icon: Icons.receipt_long,
                            label: 'Bills',
                            color: AppColors.secondary,
                            onTap: () {},
                          ),
                          QuickActionButton(
                            icon: Icons.school,
                            label: 'School',
                            color: AppColors.info,
                            onTap: () => context.push(RouteNames.schoolDashboard),
                          ),
                          QuickActionButton(
                            icon: Icons.more_horiz,
                            label: 'More',
                            color: AppColors.textSecondary,
                            onTap: () {},
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Recent Transactions
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Recent Transactions',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.push(RouteNames.transactions),
                        child: const Text('See All'),
                      ),
                    ],
                  ),
                ),
              ),

              // Transaction List
              recentTransactions.when(
                data: (transactions) {
                  if (transactions.isEmpty) {
                    return SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(40),
                        child: Column(
                          children: [
                            Icon(
                              Icons.receipt_long_outlined,
                              size: 64,
                              color: AppColors.textSecondary.withOpacity(0.5),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'No transactions yet',
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final transaction = transactions[index];
                          return TransactionItem(
                            transaction: transaction,
                            onTap: () => context.push(
                              '${RouteNames.transactionDetails}/${transaction.id}',
                            ),
                          );
                        },
                        childCount: transactions.length.clamp(0, 5),
                      ),
                    ),
                  );
                },
                loading: () => const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                ),
                error: (_, __) => const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: Center(
                      child: Text('Failed to load transactions'),
                    ),
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
      ),
    );
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  Widget _buildBalanceAction({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white, size: 16),
            const SizedBox(width: 6),
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
}
