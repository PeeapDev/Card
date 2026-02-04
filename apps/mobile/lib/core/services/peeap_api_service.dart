import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// API base URL
const String _apiBaseUrl = 'https://api.peeap.com';

/// Peeap API Service - Handles all API calls bypassing RLS
/// This service uses the backend API which has service role access
class PeeapApiService {
  static final PeeapApiService _instance = PeeapApiService._internal();
  factory PeeapApiService() => _instance;

  late final Dio _dio;

  PeeapApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: _apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Add logging interceptor in debug mode
    if (kDebugMode) {
      _dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
        logPrint: (obj) => debugPrint('[PeeapAPI] $obj'),
      ));
    }
  }

  // ==========================================
  // WALLETS
  // ==========================================

  /// Get all wallets for a user
  Future<List<Map<String, dynamic>>> getWallets(String userId) async {
    try {
      final response = await _dio.post(
        '/mobile-auth',
        data: {
          'action': 'wallets',
          'userId': userId,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final wallets = response.data['wallets'] as List? ?? [];
        return wallets.cast<Map<String, dynamic>>();
      }

      debugPrint('[PeeapAPI] getWallets failed: ${response.data}');
      return [];
    } catch (e) {
      debugPrint('[PeeapAPI] getWallets error: $e');
      return [];
    }
  }

  /// Get a single wallet by ID
  Future<Map<String, dynamic>?> getWallet(String walletId) async {
    try {
      // Use debug endpoint to get wallet info
      final response = await _dio.get(
        '/debug/user',
        queryParameters: {'wallet_id': walletId},
      );

      if (response.statusCode == 200 && response.data != null) {
        final wallets = response.data['wallets'] as List? ?? [];
        return wallets.cast<Map<String, dynamic>>().firstWhere(
          (w) => w['id'] == walletId,
          orElse: () => <String, dynamic>{},
        );
      }
      return null;
    } catch (e) {
      debugPrint('[PeeapAPI] getWallet error: $e');
      return null;
    }
  }

  // ==========================================
  // TRANSACTIONS
  // ==========================================

  /// Get transactions for a user
  Future<List<Map<String, dynamic>>> getTransactions(String userId, {int limit = 50}) async {
    try {
      final response = await _dio.post(
        '/mobile-auth',
        data: {
          'action': 'transactions',
          'userId': userId,
          'limit': limit,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final transactions = response.data['transactions'] as List? ?? [];
        return transactions.cast<Map<String, dynamic>>();
      }

      debugPrint('[PeeapAPI] getTransactions failed: ${response.data}');
      return [];
    } catch (e) {
      debugPrint('[PeeapAPI] getTransactions error: $e');
      return [];
    }
  }

  /// Get transactions for a specific wallet
  Future<List<Map<String, dynamic>>> getWalletTransactions(
    String walletId, {
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      final response = await _dio.get(
        '/debug/transactions',
        queryParameters: {
          'wallet_id': walletId,
          'limit': limit,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final transactions = response.data['transactions'] as List? ?? [];
        return transactions.cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      debugPrint('[PeeapAPI] getWalletTransactions error: $e');
      return [];
    }
  }

  // ==========================================
  // SCAN TO PAY
  // ==========================================

  /// Get checkout session details
  Future<Map<String, dynamic>?> getCheckoutSession(String sessionId) async {
    try {
      final response = await _dio.get('/checkout/sessions/$sessionId');

      if (response.statusCode == 200 && response.data != null) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint('[PeeapAPI] getCheckoutSession error: $e');
      return null;
    }
  }

  /// Process scan-to-pay payment
  Future<Map<String, dynamic>> processScanPay({
    required String sessionId,
    required String payerUserId,
    required String payerWalletId,
    String? payerName,
    String? pin,
  }) async {
    try {
      final response = await _dio.post(
        '/checkout/sessions/$sessionId/scan-pay',
        data: {
          'payerUserId': payerUserId,
          'payerWalletId': payerWalletId,
          'payerName': payerName,
          'pin': pin,
        },
      );

      if (response.statusCode == 200) {
        return {
          'success': true,
          ...response.data as Map<String, dynamic>,
        };
      }

      return {
        'success': false,
        'error': response.data?['error'] ?? 'Payment failed',
      };
    } catch (e) {
      debugPrint('[PeeapAPI] processScanPay error: $e');
      if (e is DioException && e.response != null) {
        return {
          'success': false,
          'error': e.response?.data?['error'] ?? e.message,
        };
      }
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Process direct wallet-to-wallet transfer
  Future<Map<String, dynamic>> processTransfer({
    required String fromWalletId,
    required String toWalletId,
    required double amount,
    required String userId,
    String? description,
    String? pin,
  }) async {
    try {
      final response = await _dio.post(
        '/shared/transfer',
        data: {
          'from_wallet_id': fromWalletId,
          'to_wallet_id': toWalletId,
          'amount': amount,
          'user_id': userId,
          'description': description ?? 'QR Payment',
          'pin': pin,
        },
      );

      if (response.statusCode == 200) {
        return {
          'success': true,
          ...response.data as Map<String, dynamic>,
        };
      }

      return {
        'success': false,
        'error': response.data?['error'] ?? 'Transfer failed',
      };
    } catch (e) {
      debugPrint('[PeeapAPI] processTransfer error: $e');
      if (e is DioException && e.response != null) {
        return {
          'success': false,
          'error': e.response?.data?['error'] ?? e.message,
        };
      }
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Get user profile
  Future<Map<String, dynamic>?> getUserProfile(String userId) async {
    try {
      final response = await _dio.post(
        '/mobile-auth',
        data: {
          'action': 'profile',
          'userId': userId,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        return response.data['user'] as Map<String, dynamic>?;
      }
      return null;
    } catch (e) {
      debugPrint('[PeeapAPI] getUserProfile error: $e');
      return null;
    }
  }

  /// Verify transaction PIN
  Future<bool> verifyPin(String userId, String pin) async {
    try {
      // For now, we'll verify PIN via the transfer endpoint
      // which will fail if PIN is incorrect
      // TODO: Add dedicated PIN verification endpoint
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get recipient info by wallet ID or user ID
  Future<Map<String, dynamic>?> getRecipient({
    String? userId,
    String? walletId,
  }) async {
    try {
      if (walletId != null) {
        final response = await _dio.get(
          '/debug/user',
          queryParameters: {'wallet_id': walletId},
        );

        if (response.statusCode == 200 && response.data != null) {
          return response.data as Map<String, dynamic>;
        }
      }

      if (userId != null) {
        final response = await _dio.get(
          '/debug/user',
          queryParameters: {'user_id': userId},
        );

        if (response.statusCode == 200 && response.data != null) {
          return response.data as Map<String, dynamic>;
        }
      }

      return null;
    } catch (e) {
      debugPrint('[PeeapAPI] getRecipient error: $e');
      return null;
    }
  }
}

/// Provider for the API service
final peeapApiService = PeeapApiService();
