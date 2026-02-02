import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../shared/widgets/app_card.dart';

class MerchantDashboardScreen extends ConsumerWidget {
  const MerchantDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Business'),
        actions: [
          IconButton(
            onPressed: () => context.push(RouteNames.notifications),
            icon: const Icon(Icons.notifications_outlined),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Revenue Card
            GradientCard(
              colors: AppColors.cardGradients[1],
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Today's Revenue",
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
                        child: const Row(
                          children: [
                            Icon(
                              Icons.trending_up,
                              color: Colors.white,
                              size: 14,
                            ),
                            SizedBox(width: 4),
                            Text(
                              '+12%',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    CurrencyFormatter.format(125000),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _buildStatChip('23 orders', Icons.shopping_bag),
                      const SizedBox(width: 12),
                      _buildStatChip('98% success', Icons.check_circle),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Quick Actions
            const Text(
              'Quick Actions',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 16),

            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 3,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              children: [
                _buildActionButton(
                  context,
                  icon: Icons.point_of_sale,
                  label: 'POS',
                  color: AppColors.primary,
                  onTap: () => context.push(RouteNames.posTerminal),
                ),
                _buildActionButton(
                  context,
                  icon: Icons.link,
                  label: 'Payment Link',
                  color: AppColors.info,
                  onTap: () => context.push(RouteNames.paymentLink),
                ),
                _buildActionButton(
                  context,
                  icon: Icons.qr_code,
                  label: 'QR Code',
                  color: AppColors.secondary,
                  onTap: () {},
                ),
                _buildActionButton(
                  context,
                  icon: Icons.receipt_long,
                  label: 'Invoices',
                  color: AppColors.warning,
                  onTap: () {},
                ),
                _buildActionButton(
                  context,
                  icon: Icons.account_balance_wallet,
                  label: 'Payouts',
                  color: AppColors.accent,
                  onTap: () {},
                ),
                _buildActionButton(
                  context,
                  icon: Icons.analytics,
                  label: 'Reports',
                  color: AppColors.textSecondary,
                  onTap: () {},
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Recent Transactions
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Recent Sales',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                TextButton(
                  onPressed: () => context.push(RouteNames.posSales),
                  child: const Text('See All'),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Sample transactions
            ..._buildRecentTransactions(),

            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _buildStatChip(String text, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 14),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(
    BuildContext context, {
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildRecentTransactions() {
    final transactions = [
      {'name': 'John Doe', 'amount': 15000.0, 'time': '2 min ago'},
      {'name': 'Jane Smith', 'amount': 8500.0, 'time': '15 min ago'},
      {'name': 'Mike Wilson', 'amount': 32000.0, 'time': '1 hour ago'},
    ];

    return transactions.map((tx) {
      return ListTileCard(
        leading: CircleAvatar(
          backgroundColor: AppColors.success.withOpacity(0.1),
          child: const Icon(
            Icons.arrow_downward,
            color: AppColors.success,
            size: 20,
          ),
        ),
        title: tx['name'] as String,
        subtitle: tx['time'] as String,
        trailing: Text(
          '+${CurrencyFormatter.format(tx['amount'] as double)}',
          style: const TextStyle(
            color: AppColors.success,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }).toList();
  }
}
