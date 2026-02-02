import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../shared/widgets/app_button.dart';

// Cart state provider
final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((ref) {
  return CartNotifier();
});

class CartItem {
  final String id;
  final String name;
  final double price;
  int quantity;

  CartItem({
    required this.id,
    required this.name,
    required this.price,
    this.quantity = 1,
  });

  double get total => price * quantity;
}

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]);

  void addItem(CartItem item) {
    final existingIndex = state.indexWhere((i) => i.id == item.id);
    if (existingIndex != -1) {
      state[existingIndex].quantity++;
      state = [...state];
    } else {
      state = [...state, item];
    }
  }

  void removeItem(String id) {
    state = state.where((i) => i.id != id).toList();
  }

  void updateQuantity(String id, int quantity) {
    if (quantity <= 0) {
      removeItem(id);
    } else {
      final index = state.indexWhere((i) => i.id == id);
      if (index != -1) {
        state[index].quantity = quantity;
        state = [...state];
      }
    }
  }

  void clear() {
    state = [];
  }

  double get total => state.fold(0, (sum, item) => sum + item.total);
}

class PosTerminalScreen extends ConsumerStatefulWidget {
  const PosTerminalScreen({super.key});

  @override
  ConsumerState<PosTerminalScreen> createState() => _PosTerminalScreenState();
}

class _PosTerminalScreenState extends ConsumerState<PosTerminalScreen> {
  String _selectedCategory = 'All';

  final _categories = ['All', 'Food', 'Drinks', 'Snacks', 'Other'];

  final _products = [
    {'id': '1', 'name': 'Burger', 'price': 15000.0, 'category': 'Food'},
    {'id': '2', 'name': 'Pizza', 'price': 25000.0, 'category': 'Food'},
    {'id': '3', 'name': 'Sandwich', 'price': 8000.0, 'category': 'Food'},
    {'id': '4', 'name': 'Cola', 'price': 3000.0, 'category': 'Drinks'},
    {'id': '5', 'name': 'Water', 'price': 1500.0, 'category': 'Drinks'},
    {'id': '6', 'name': 'Juice', 'price': 5000.0, 'category': 'Drinks'},
    {'id': '7', 'name': 'Chips', 'price': 2000.0, 'category': 'Snacks'},
    {'id': '8', 'name': 'Cookies', 'price': 3500.0, 'category': 'Snacks'},
  ];

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);

    final filteredProducts = _selectedCategory == 'All'
        ? _products
        : _products.where((p) => p['category'] == _selectedCategory).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('POS Terminal'),
        actions: [
          IconButton(
            onPressed: () {
              // TODO: Search products
            },
            icon: const Icon(Icons.search),
          ),
          IconButton(
            onPressed: () {
              // TODO: Show held orders
            },
            icon: const Icon(Icons.pause_circle_outline),
          ),
        ],
      ),
      body: Row(
        children: [
          // Products section
          Expanded(
            flex: 2,
            child: Column(
              children: [
                // Categories
                SizedBox(
                  height: 50,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _categories.length,
                    itemBuilder: (context, index) {
                      final category = _categories[index];
                      final isSelected = _selectedCategory == category;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(category),
                          selected: isSelected,
                          onSelected: (selected) {
                            setState(() => _selectedCategory = category);
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

                // Products grid
                Expanded(
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.9,
                    ),
                    itemCount: filteredProducts.length,
                    itemBuilder: (context, index) {
                      final product = filteredProducts[index];
                      return GestureDetector(
                        onTap: () {
                          cartNotifier.addItem(CartItem(
                            id: product['id'] as String,
                            name: product['name'] as String,
                            price: product['price'] as double,
                          ));
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.05),
                                blurRadius: 4,
                              ),
                            ],
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.fastfood,
                                size: 40,
                                color: AppColors.primary.withOpacity(0.5),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                product['name'] as String,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w500,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                CurrencyFormatter.format(product['price'] as double),
                                style: const TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),

          // Cart section
          Container(
            width: 300,
            color: Colors.white,
            child: Column(
              children: [
                // Cart header
                Container(
                  padding: const EdgeInsets.all(16),
                  color: AppColors.primary,
                  child: Row(
                    children: [
                      const Icon(Icons.shopping_cart, color: Colors.white),
                      const SizedBox(width: 8),
                      const Text(
                        'Current Order',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      if (cart.isNotEmpty)
                        GestureDetector(
                          onTap: () => cartNotifier.clear(),
                          child: const Text(
                            'Clear',
                            style: TextStyle(color: Colors.white70),
                          ),
                        ),
                    ],
                  ),
                ),

                // Cart items
                Expanded(
                  child: cart.isEmpty
                      ? const Center(
                          child: Text(
                            'No items in cart',
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: cart.length,
                          itemBuilder: (context, index) {
                            final item = cart[index];
                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.inputFill,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        Text(
                                          CurrencyFormatter.format(item.price),
                                          style: const TextStyle(
                                            color: AppColors.textSecondary,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Row(
                                    children: [
                                      IconButton(
                                        onPressed: () {
                                          cartNotifier.updateQuantity(
                                            item.id,
                                            item.quantity - 1,
                                          );
                                        },
                                        icon: const Icon(Icons.remove, size: 18),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                      ),
                                      Padding(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8),
                                        child: Text(
                                          '${item.quantity}',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      IconButton(
                                        onPressed: () {
                                          cartNotifier.updateQuantity(
                                            item.id,
                                            item.quantity + 1,
                                          );
                                        },
                                        icon: const Icon(Icons.add, size: 18),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    CurrencyFormatter.format(item.total),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),

                // Cart total and checkout
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Total',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            CurrencyFormatter.format(cartNotifier.total),
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      AppButton(
                        text: 'Checkout',
                        onPressed: cart.isEmpty
                            ? null
                            : () => _showPaymentOptions(context),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showPaymentOptions(BuildContext context) {
    final cartNotifier = ref.read(cartProvider.notifier);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Payment Method',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 24),
            _buildPaymentOption(
              icon: Icons.money,
              label: 'Cash',
              onTap: () {
                Navigator.pop(context);
                _showPaymentSuccess();
              },
            ),
            _buildPaymentOption(
              icon: Icons.phone_android,
              label: 'Mobile Money',
              onTap: () {
                Navigator.pop(context);
                // TODO: Mobile money payment
              },
            ),
            _buildPaymentOption(
              icon: Icons.credit_card,
              label: 'Card',
              onTap: () {
                Navigator.pop(context);
                // TODO: Card payment
              },
            ),
            _buildPaymentOption(
              icon: Icons.qr_code,
              label: 'QR Code',
              onTap: () {
                Navigator.pop(context);
                // TODO: QR payment
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentOption({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.divider),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(icon, color: AppColors.primary),
              const SizedBox(width: 16),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              const Icon(Icons.chevron_right, color: AppColors.textSecondary),
            ],
          ),
        ),
      ),
    );
  }

  void _showPaymentSuccess() {
    final cartNotifier = ref.read(cartProvider.notifier);

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
              'Payment Successful!',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              CurrencyFormatter.format(cartNotifier.total),
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                cartNotifier.clear();
              },
              child: const Text('Done'),
            ),
          ),
        ],
      ),
    );
  }
}
