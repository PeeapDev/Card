import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../home/presentation/widgets/transaction_item.dart';
import '../../providers/transaction_provider.dart';

class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});

  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends ConsumerState<TransactionsScreen> {
  String _selectedFilter = 'all';

  final _filters = [
    {'id': 'all', 'label': 'All'},
    {'id': 'transfer', 'label': 'Transfers'},
    {'id': 'deposit', 'label': 'Deposits'},
    {'id': 'withdrawal', 'label': 'Withdrawals'},
    {'id': 'payment', 'label': 'Payments'},
  ];

  @override
  Widget build(BuildContext context) {
    final transactions = ref.watch(transactionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Transactions'),
        actions: [
          IconButton(
            onPressed: () {
              // TODO: Search transactions
            },
            icon: const Icon(Icons.search),
          ),
          IconButton(
            onPressed: () {
              // TODO: Export transactions
            },
            icon: const Icon(Icons.download),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filters
          SizedBox(
            height: 50,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _filters.length,
              itemBuilder: (context, index) {
                final filter = _filters[index];
                final isSelected = _selectedFilter == filter['id'];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(filter['label']!),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() => _selectedFilter = filter['id']!);
                      ref
                          .read(transactionsProvider.notifier)
                          .setFilter(_selectedFilter);
                    },
                    selectedColor: AppColors.primary,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppColors.textPrimary,
                    ),
                  ),
                );
              },
            ),
          ),

          // Transaction list
          Expanded(
            child: transactions.when(
              data: (txList) {
                if (txList.isEmpty) {
                  return EmptyState(
                    icon: Icons.receipt_long_outlined,
                    title: 'No Transactions',
                    description: 'Your transactions will appear here',
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    ref
                        .read(transactionsProvider.notifier)
                        .loadTransactions(refresh: true);
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: txList.length,
                    itemBuilder: (context, index) {
                      final tx = txList[index];
                      return TransactionItem(
                        transaction: tx,
                        onTap: () => context.push(
                          '${RouteNames.transactionDetails}/${tx.id}',
                        ),
                      );
                    },
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => ErrorState(
                description: e.toString(),
                onRetry: () => ref
                    .read(transactionsProvider.notifier)
                    .loadTransactions(refresh: true),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
