class EnvConfig {
  // Supabase Configuration
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://your-project.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'your-anon-key',
  );

  // API Configuration
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.peeap.com',
  );

  // App Configuration
  static const String appName = 'Peeap';
  static const String appVersion = '1.0.0';

  // Feature Flags
  static const bool enableNfc = true;
  static const bool enableBiometrics = true;
  static const bool enableOfflineMode = true;

  // Supported Currencies
  static const String defaultCurrency = 'SLE';
  static const List<String> supportedCurrencies = ['SLE', 'USD'];

  // Mobile Money Providers
  static const List<String> mobileMoneyProviders = [
    'orange_money',
    'africell_money',
    'qmoney',
  ];
}
