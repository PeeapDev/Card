import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/auth/presentation/screens/otp_verification_screen.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/create_pin_screen.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/home/presentation/screens/main_shell.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/wallet/presentation/screens/wallets_screen.dart';
import '../../features/wallet/presentation/screens/wallet_details_screen.dart';
import '../../features/wallet/presentation/screens/send_money_screen.dart';
import '../../features/wallet/presentation/screens/receive_money_screen.dart';
import '../../features/wallet/presentation/screens/deposit_screen.dart';
import '../../features/wallet/presentation/screens/withdraw_screen.dart';
import '../../features/cards/presentation/screens/cards_screen.dart';
import '../../features/cards/presentation/screens/card_details_screen.dart';
import '../../features/cards/presentation/screens/create_card_screen.dart';
import '../../features/payments/presentation/screens/scan_pay_screen.dart';
import '../../features/payments/presentation/screens/payment_link_screen.dart';
import '../../features/transactions/presentation/screens/transactions_screen.dart';
import '../../features/transactions/presentation/screens/transaction_details_screen.dart';
import '../../features/merchant/presentation/screens/merchant_dashboard_screen.dart';
import '../../features/merchant/presentation/screens/business_screen.dart';
import '../../features/pos/presentation/screens/pos_terminal_screen.dart';
import '../../features/pos/presentation/screens/pos_products_screen.dart';
import '../../features/pos/presentation/screens/pos_sales_screen.dart';
import '../../features/school/presentation/screens/school_dashboard_screen.dart';
import '../../features/school/presentation/screens/pay_fees_screen.dart';
import '../../features/school/presentation/screens/my_children_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';
import '../../features/settings/presentation/screens/profile_screen.dart';
import '../../features/settings/presentation/screens/security_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';
import 'route_names.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: RouteNames.home,
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final isAuthenticated = authState.valueOrNull != null;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');

      if (!isAuthenticated && !isAuthRoute) {
        return RouteNames.login;
      }

      if (isAuthenticated && isAuthRoute) {
        return RouteNames.home;
      }

      return null;
    },
    routes: [
      // Auth Routes
      GoRoute(
        path: RouteNames.login,
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: RouteNames.register,
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: RouteNames.otpVerification,
        name: 'otp-verification',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return OtpVerificationScreen(
            phoneNumber: extra?['phoneNumber'] ?? '',
            verificationId: extra?['verificationId'] ?? '',
          );
        },
      ),
      GoRoute(
        path: RouteNames.forgotPassword,
        name: 'forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: RouteNames.createPin,
        name: 'create-pin',
        builder: (context, state) => const CreatePinScreen(),
      ),

      // Main Shell with Bottom Navigation
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          // Home Tab
          GoRoute(
            path: RouteNames.home,
            name: 'home',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HomeScreen(),
            ),
          ),

          // Wallets Tab
          GoRoute(
            path: RouteNames.wallets,
            name: 'wallets',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: WalletsScreen(),
            ),
          ),

          // Cards Tab
          GoRoute(
            path: RouteNames.cards,
            name: 'cards',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: CardsScreen(),
            ),
          ),

          // Merchant Tab
          GoRoute(
            path: RouteNames.merchant,
            name: 'merchant',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: MerchantDashboardScreen(),
            ),
          ),

          // Settings Tab
          GoRoute(
            path: RouteNames.settings,
            name: 'settings',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SettingsScreen(),
            ),
          ),
        ],
      ),

      // Wallet Routes (outside shell for full screen)
      GoRoute(
        path: '${RouteNames.walletDetails}/:id',
        name: 'wallet-details',
        builder: (context, state) => WalletDetailsScreen(
          walletId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: RouteNames.sendMoney,
        name: 'send-money',
        builder: (context, state) => const SendMoneyScreen(),
      ),
      GoRoute(
        path: RouteNames.receiveMoney,
        name: 'receive-money',
        builder: (context, state) => const ReceiveMoneyScreen(),
      ),
      GoRoute(
        path: RouteNames.deposit,
        name: 'deposit',
        builder: (context, state) => const DepositScreen(),
      ),
      GoRoute(
        path: RouteNames.withdraw,
        name: 'withdraw',
        builder: (context, state) => const WithdrawScreen(),
      ),

      // Card Routes
      GoRoute(
        path: '${RouteNames.cardDetails}/:id',
        name: 'card-details',
        builder: (context, state) => CardDetailsScreen(
          cardId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: RouteNames.createCard,
        name: 'create-card',
        builder: (context, state) => const CreateCardScreen(),
      ),

      // Payment Routes
      GoRoute(
        path: RouteNames.scanPay,
        name: 'scan-pay',
        builder: (context, state) => const ScanPayScreen(),
      ),
      GoRoute(
        path: RouteNames.paymentLink,
        name: 'payment-link',
        builder: (context, state) => const PaymentLinkScreen(),
      ),

      // Transaction Routes
      GoRoute(
        path: RouteNames.transactions,
        name: 'transactions',
        builder: (context, state) => const TransactionsScreen(),
      ),
      GoRoute(
        path: '${RouteNames.transactionDetails}/:id',
        name: 'transaction-details',
        builder: (context, state) => TransactionDetailsScreen(
          transactionId: state.pathParameters['id']!,
        ),
      ),

      // Merchant Routes
      GoRoute(
        path: RouteNames.business,
        name: 'business',
        builder: (context, state) => const BusinessScreen(),
      ),
      GoRoute(
        path: RouteNames.posTerminal,
        name: 'pos-terminal',
        builder: (context, state) => const PosTerminalScreen(),
      ),
      GoRoute(
        path: RouteNames.posProducts,
        name: 'pos-products',
        builder: (context, state) => const PosProductsScreen(),
      ),
      GoRoute(
        path: RouteNames.posSales,
        name: 'pos-sales',
        builder: (context, state) => const PosSalesScreen(),
      ),

      // School Routes
      GoRoute(
        path: RouteNames.schoolDashboard,
        name: 'school-dashboard',
        builder: (context, state) => const SchoolDashboardScreen(),
      ),
      GoRoute(
        path: RouteNames.payFees,
        name: 'pay-fees',
        builder: (context, state) => const PayFeesScreen(),
      ),
      GoRoute(
        path: RouteNames.myChildren,
        name: 'my-children',
        builder: (context, state) => const MyChildrenScreen(),
      ),

      // Settings Routes
      GoRoute(
        path: RouteNames.profile,
        name: 'profile',
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: RouteNames.security,
        name: 'security',
        builder: (context, state) => const SecurityScreen(),
      ),

      // Notifications
      GoRoute(
        path: RouteNames.notifications,
        name: 'notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
    ],
  );
});
