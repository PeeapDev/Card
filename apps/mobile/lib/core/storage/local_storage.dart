import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final localStorageProvider = Provider<LocalStorageService>((ref) {
  return LocalStorageService();
});

class LocalStorageService {
  SharedPreferences? _prefs;

  // Keys
  static const String _onboardingCompleteKey = 'onboarding_complete';
  static const String _themeKey = 'theme_mode';
  static const String _languageKey = 'language';
  static const String _notificationsEnabledKey = 'notifications_enabled';
  static const String _lastSyncKey = 'last_sync';
  static const String _selectedWalletKey = 'selected_wallet';
  static const String _selectedBusinessKey = 'selected_business';

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  SharedPreferences get prefs {
    if (_prefs == null) {
      throw Exception('LocalStorageService not initialized. Call init() first.');
    }
    return _prefs!;
  }

  // Onboarding
  Future<void> setOnboardingComplete(bool complete) async {
    await prefs.setBool(_onboardingCompleteKey, complete);
  }

  bool isOnboardingComplete() {
    return prefs.getBool(_onboardingCompleteKey) ?? false;
  }

  // Theme
  Future<void> setThemeMode(String mode) async {
    await prefs.setString(_themeKey, mode);
  }

  String getThemeMode() {
    return prefs.getString(_themeKey) ?? 'system';
  }

  // Language
  Future<void> setLanguage(String language) async {
    await prefs.setString(_languageKey, language);
  }

  String getLanguage() {
    return prefs.getString(_languageKey) ?? 'en';
  }

  // Notifications
  Future<void> setNotificationsEnabled(bool enabled) async {
    await prefs.setBool(_notificationsEnabledKey, enabled);
  }

  bool areNotificationsEnabled() {
    return prefs.getBool(_notificationsEnabledKey) ?? true;
  }

  // Last sync timestamp
  Future<void> setLastSync(DateTime dateTime) async {
    await prefs.setString(_lastSyncKey, dateTime.toIso8601String());
  }

  DateTime? getLastSync() {
    final value = prefs.getString(_lastSyncKey);
    if (value != null) {
      return DateTime.tryParse(value);
    }
    return null;
  }

  // Selected wallet
  Future<void> setSelectedWallet(String walletId) async {
    await prefs.setString(_selectedWalletKey, walletId);
  }

  String? getSelectedWallet() {
    return prefs.getString(_selectedWalletKey);
  }

  // Selected business (for merchants)
  Future<void> setSelectedBusiness(String businessId) async {
    await prefs.setString(_selectedBusinessKey, businessId);
  }

  String? getSelectedBusiness() {
    return prefs.getString(_selectedBusinessKey);
  }

  // Generic methods
  Future<void> setString(String key, String value) async {
    await prefs.setString(key, value);
  }

  String? getString(String key) {
    return prefs.getString(key);
  }

  Future<void> setBool(String key, bool value) async {
    await prefs.setBool(key, value);
  }

  bool? getBool(String key) {
    return prefs.getBool(key);
  }

  Future<void> setInt(String key, int value) async {
    await prefs.setInt(key, value);
  }

  int? getInt(String key) {
    return prefs.getInt(key);
  }

  Future<void> remove(String key) async {
    await prefs.remove(key);
  }

  Future<void> clear() async {
    await prefs.clear();
  }
}
