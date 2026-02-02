class RouteNames {
  // Auth Routes
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String otpVerification = '/auth/otp-verification';
  static const String forgotPassword = '/auth/forgot-password';
  static const String createPin = '/auth/create-pin';

  // Main Routes (Bottom Navigation)
  static const String home = '/';
  static const String wallets = '/wallets';
  static const String cards = '/cards';
  static const String merchant = '/merchant';
  static const String settings = '/settings';

  // Wallet Routes
  static const String walletDetails = '/wallet';
  static const String sendMoney = '/send-money';
  static const String receiveMoney = '/receive-money';
  static const String deposit = '/deposit';
  static const String withdraw = '/withdraw';
  static const String createWallet = '/create-wallet';

  // Card Routes
  static const String cardDetails = '/card';
  static const String createCard = '/create-card';
  static const String cardMarketplace = '/card-marketplace';

  // Payment Routes
  static const String scanPay = '/scan-pay';
  static const String paymentLink = '/payment-link';
  static const String nfcPay = '/nfc-pay';
  static const String checkout = '/checkout';

  // Transaction Routes
  static const String transactions = '/transactions';
  static const String transactionDetails = '/transaction';

  // Merchant Routes
  static const String merchantDashboard = '/merchant/dashboard';
  static const String business = '/merchant/business';
  static const String invoices = '/merchant/invoices';
  static const String createInvoice = '/merchant/invoices/create';
  static const String payouts = '/merchant/payouts';
  static const String apiKeys = '/merchant/api-keys';

  // POS Routes
  static const String posTerminal = '/pos/terminal';
  static const String posProducts = '/pos/products';
  static const String posSales = '/pos/sales';
  static const String posInventory = '/pos/inventory';
  static const String posStaff = '/pos/staff';
  static const String posCustomers = '/pos/customers';
  static const String posReports = '/pos/reports';
  static const String posSettings = '/pos/settings';

  // School Routes
  static const String schoolDashboard = '/school/dashboard';
  static const String payFees = '/school/pay-fees';
  static const String myChildren = '/school/my-children';
  static const String schoolChat = '/school/chat';

  // Settings Routes
  static const String profile = '/settings/profile';
  static const String security = '/settings/security';
  static const String notifications = '/notifications';
  static const String help = '/settings/help';
  static const String about = '/settings/about';
}
