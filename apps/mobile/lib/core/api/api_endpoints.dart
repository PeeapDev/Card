class ApiEndpoints {
  // Base paths
  static const String api = '/api';

  // Auth endpoints
  static const String auth = '$api/auth';
  static const String login = '$auth/login';
  static const String register = '$auth/register';
  static const String verifyOtp = '$auth/verify-otp';
  static const String resendOtp = '$auth/resend-otp';
  static const String forgotPassword = '$auth/forgot-password';
  static const String resetPassword = '$auth/reset-password';
  static const String refreshToken = '$auth/refresh';
  static const String logout = '$auth/logout';

  // User endpoints
  static const String users = '$api/users';
  static const String profile = '$users/profile';
  static const String updateProfile = '$users/profile';
  static const String changePin = '$users/change-pin';
  static const String verifyPin = '$users/verify-pin';

  // Wallet endpoints
  static const String wallets = '$api/wallets';
  static String walletById(String id) => '$wallets/$id';
  static const String walletBalance = '$wallets/balance';
  static const String createWallet = '$wallets/create';
  static const String transfer = '$wallets/transfer';
  static const String deposit = '$wallets/deposit';
  static const String withdraw = '$wallets/withdraw';

  // Card endpoints
  static const String cards = '$api/cards';
  static String cardById(String id) => '$cards/$id';
  static const String createCard = '$cards/create';
  static const String cardProducts = '$cards/products';
  static String freezeCard(String id) => '$cards/$id/freeze';
  static String unfreezeCard(String id) => '$cards/$id/unfreeze';
  static String cardTransactions(String id) => '$cards/$id/transactions';

  // Transaction endpoints
  static const String transactions = '$api/transactions';
  static String transactionById(String id) => '$transactions/$id';
  static const String transactionHistory = '$transactions/history';

  // Payment endpoints
  static const String payments = '$api/payments';
  static const String initializePayment = '$payments/initialize';
  static const String verifyPayment = '$payments/verify';
  static const String paymentLink = '$payments/link';
  static const String qrPayment = '$payments/qr';

  // Mobile Money endpoints
  static const String mobileMoney = '$api/mobile-money';
  static const String mobileMoneyDeposit = '$mobileMoney/deposit';
  static const String mobileMoneyWithdraw = '$mobileMoney/withdraw';
  static const String mobileMoneyProviders = '$mobileMoney/providers';

  // Merchant endpoints
  static const String merchants = '$api/merchants';
  static const String merchantProfile = '$merchants/profile';
  static const String merchantTransactions = '$merchants/transactions';
  static const String merchantPayouts = '$merchants/payouts';
  static const String merchantInvoices = '$merchants/invoices';

  // Business endpoints
  static const String businesses = '$api/businesses';
  static String businessById(String id) => '$businesses/$id';
  static const String createBusiness = '$businesses/create';

  // POS endpoints
  static const String pos = '$api/pos';
  static const String posProducts = '$pos/products';
  static const String posCategories = '$pos/categories';
  static const String posSales = '$pos/sales';
  static const String posCreateSale = '$pos/sales/create';
  static const String posInventory = '$pos/inventory';
  static const String posCustomers = '$pos/customers';
  static const String posReports = '$pos/reports';

  // Invoice endpoints
  static const String invoices = '$api/invoices';
  static String invoiceById(String id) => '$invoices/$id';
  static const String createInvoice = '$invoices/create';
  static String sendInvoice(String id) => '$invoices/$id/send';

  // School endpoints
  static const String school = '$api/school';
  static const String schoolFees = '$school/fees';
  static const String schoolChildren = '$school/children';
  static const String schoolPayFee = '$school/pay-fee';
  static const String schoolWallet = '$school/wallet';
  static const String schoolChat = '$school/chat';

  // Notification endpoints
  static const String notifications = '$api/notifications';
  static const String markNotificationRead = '$notifications/read';
  static const String notificationSettings = '$notifications/settings';

  // Settings endpoints
  static const String settings = '$api/settings';
  static const String updateSettings = '$settings/update';

  // KYC endpoints
  static const String kyc = '$api/kyc';
  static const String submitKyc = '$kyc/submit';
  static const String kycStatus = '$kyc/status';
}
