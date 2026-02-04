import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'peeap_api_service.dart';

/// QR Payment Service - Handles PEEAPPAY QR code parsing and payment processing
class QRPaymentService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final PeeapApiService _api = peeapApiService;

  static const String QR_PREFIX = 'PEEAPPAY';
  static const String QR_VERSION = '1.0';

  /// Parse and validate QR code data
  /// Supports multiple formats:
  /// 1. PEEAPPAY base64 encoded JSON
  /// 2. URL patterns (/pay, /scan-pay, /wallet, /user)
  /// 3. Event tickets (PEEAP-EVT-{eventId}-{ticketNumber})
  Future<QRPaymentData?> parseQRCode(String qrData) async {
    try {
      // Try PEEAPPAY encoded format first
      if (qrData.startsWith(QR_PREFIX)) {
        return _parsePeeapPayFormat(qrData);
      }

      // Try URL formats
      if (qrData.contains('peeap.com') || qrData.startsWith('/')) {
        return _parseUrlFormat(qrData);
      }

      // Try event ticket format
      if (qrData.startsWith('PEEAP-EVT-')) {
        return _parseEventTicket(qrData);
      }

      // Try base64 JSON directly
      try {
        final decoded = utf8.decode(base64.decode(qrData));
        final json = jsonDecode(decoded) as Map<String, dynamic>;
        if (json['p'] == QR_PREFIX) {
          return _parseJsonPayload(json);
        }
      } catch (_) {}

      return null;
    } catch (e) {
      print('Error parsing QR code: $e');
      return null;
    }
  }

  QRPaymentData? _parsePeeapPayFormat(String qrData) {
    try {
      // Remove prefix and decode
      final base64Data = qrData.substring(QR_PREFIX.length);
      final decoded = utf8.decode(base64.decode(base64Data));
      final json = jsonDecode(decoded) as Map<String, dynamic>;
      return _parseJsonPayload(json);
    } catch (e) {
      print('Error parsing PEEAPPAY format: $e');
      return null;
    }
  }

  QRPaymentData _parseJsonPayload(Map<String, dynamic> json) {
    return QRPaymentData(
      type: _parseQRType(json['t'] as String?),
      userId: json['u'] as String?,
      walletId: json['w'] as String?,
      amount: (json['a'] as num?)?.toDouble(),
      currency: json['c'] as String? ?? 'SLE',
      reference: json['r'] as String?,
      expiresAt: json['e'] != null ? DateTime.tryParse(json['e'] as String) : null,
      merchantName: json['m'] as String?,
      description: json['d'] as String?,
    );
  }

  QRPaymentData? _parseUrlFormat(String url) {
    try {
      Uri uri;
      if (url.startsWith('/')) {
        uri = Uri.parse('https://peeap.com$url');
      } else {
        uri = Uri.parse(url);
      }

      final path = uri.path;
      final query = uri.queryParameters;

      // /scan-pay/{sessionId}
      if (path.contains('/scan-pay/')) {
        final sessionId = path.split('/scan-pay/').last.split('/').first;
        return QRPaymentData(
          type: QRPaymentType.checkoutSession,
          sessionId: sessionId,
        );
      }

      // /checkout/pay/{sessionId}
      if (path.contains('/checkout/pay/')) {
        final sessionId = path.split('/checkout/pay/').last.split('/').first;
        return QRPaymentData(
          type: QRPaymentType.checkoutSession,
          sessionId: sessionId,
        );
      }

      // /pay?to={userId}&wallet={walletId}&amount={amount}&note={description}
      if (path.contains('/pay') && query.containsKey('to')) {
        return QRPaymentData(
          type: query.containsKey('amount')
              ? QRPaymentType.paymentRequest
              : QRPaymentType.staticPayment,
          userId: query['to'],
          walletId: query['wallet'],
          amount: double.tryParse(query['amount'] ?? ''),
          description: query['note'],
          merchantName: query['merchant'],
          currency: query['currency'] ?? 'SLE',
        );
      }

      // /wallet/{walletId}
      if (path.contains('/wallet/')) {
        final walletId = path.split('/wallet/').last.split('/').first;
        return QRPaymentData(
          type: QRPaymentType.staticPayment,
          walletId: walletId,
        );
      }

      // /user/{userId}
      if (path.contains('/user/')) {
        final userId = path.split('/user/').last.split('/').first;
        return QRPaymentData(
          type: QRPaymentType.staticPayment,
          userId: userId,
        );
      }

      return null;
    } catch (e) {
      print('Error parsing URL format: $e');
      return null;
    }
  }

  QRPaymentData? _parseEventTicket(String qrData) {
    try {
      // PEEAP-EVT-{eventId}-{ticketNumber}
      final parts = qrData.split('-');
      if (parts.length >= 4) {
        return QRPaymentData(
          type: QRPaymentType.eventTicket,
          eventId: parts[2],
          ticketNumber: parts.sublist(3).join('-'),
        );
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  QRPaymentType _parseQRType(String? type) {
    switch (type) {
      case 'payment':
        return QRPaymentType.staticPayment;
      case 'request':
        return QRPaymentType.paymentRequest;
      case 'merchant':
        return QRPaymentType.merchantPayment;
      case 'event_ticket':
        return QRPaymentType.eventTicket;
      default:
        return QRPaymentType.staticPayment;
    }
  }

  /// Fetch checkout session details via API
  Future<CheckoutSession?> getCheckoutSession(String sessionId) async {
    try {
      // Try API first (bypasses RLS)
      final apiResponse = await _api.getCheckoutSession(sessionId);
      if (apiResponse != null) {
        return CheckoutSession.fromJson(apiResponse);
      }

      // Fallback to direct Supabase
      final response = await _supabase
          .from('checkout_sessions')
          .select('''
            *,
            merchant:merchants(id, business_name, logo_url)
          ''')
          .or('id.eq.$sessionId,external_id.eq.$sessionId')
          .maybeSingle();

      if (response == null) return null;
      return CheckoutSession.fromJson(response);
    } catch (e) {
      print('Error fetching checkout session: $e');
      return null;
    }
  }

  /// Fetch recipient user details
  Future<PaymentRecipient?> getRecipient(String? userId, String? walletId) async {
    try {
      if (walletId != null) {
        // Get wallet with owner details
        final response = await _supabase
            .from('wallets')
            .select('''
              id, name, currency,
              user:users(id, first_name, last_name, email, profile_picture)
            ''')
            .eq('id', walletId)
            .maybeSingle();

        if (response != null) {
          final user = response['user'] as Map<String, dynamic>?;
          return PaymentRecipient(
            userId: user?['id'] as String?,
            walletId: response['id'] as String,
            walletName: response['name'] as String? ?? 'Wallet',
            currency: response['currency'] as String? ?? 'SLE',
            firstName: user?['first_name'] as String?,
            lastName: user?['last_name'] as String?,
            email: user?['email'] as String?,
            profilePicture: user?['profile_picture'] as String?,
          );
        }
      }

      if (userId != null) {
        // Get user with primary wallet
        final response = await _supabase
            .from('users')
            .select('''
              id, first_name, last_name, email, profile_picture,
              wallets(id, name, currency, is_primary)
            ''')
            .eq('id', userId)
            .maybeSingle();

        if (response != null) {
          final wallets = response['wallets'] as List<dynamic>? ?? [];
          final primaryWallet = wallets.firstWhere(
            (w) => w['is_primary'] == true,
            orElse: () => wallets.isNotEmpty ? wallets.first : null,
          );

          return PaymentRecipient(
            userId: response['id'] as String,
            walletId: primaryWallet?['id'] as String?,
            walletName: primaryWallet?['name'] as String? ?? 'Main Wallet',
            currency: primaryWallet?['currency'] as String? ?? 'SLE',
            firstName: response['first_name'] as String?,
            lastName: response['last_name'] as String?,
            email: response['email'] as String?,
            profilePicture: response['profile_picture'] as String?,
          );
        }
      }

      return null;
    } catch (e) {
      print('Error fetching recipient: $e');
      return null;
    }
  }

  /// Process scan-to-pay payment for checkout session via API
  Future<PaymentResult> processCheckoutPayment({
    required String sessionId,
    required String payerWalletId,
    required String pin,
    String? payerUserId,
    String? payerName,
  }) async {
    try {
      // Get user ID from custom auth or Supabase auth
      final userId = payerUserId ?? _supabase.auth.currentUser?.id;
      if (userId == null) {
        return const PaymentResult(success: false, error: 'Not authenticated');
      }

      // Process via API (bypasses RLS)
      final result = await _api.processScanPay(
        sessionId: sessionId,
        payerUserId: userId,
        payerWalletId: payerWalletId,
        payerName: payerName,
        pin: pin,
      );

      if (result['success'] == true) {
        return PaymentResult(
          success: true,
          transactionId: result['transaction_id'] as String? ?? result['transactionRef'] as String?,
          reference: result['reference'] as String? ?? result['transactionRef'] as String?,
        );
      } else {
        return PaymentResult(
          success: false,
          error: result['error'] as String? ?? 'Payment failed',
        );
      }
    } catch (e) {
      print('Error processing checkout payment: $e');
      return PaymentResult(success: false, error: e.toString());
    }
  }

  /// Process direct QR payment (user-to-user) via API
  Future<PaymentResult> processDirectPayment({
    required String recipientWalletId,
    required String payerWalletId,
    required double amount,
    required String pin,
    String? description,
    String? payerUserId,
  }) async {
    try {
      // Get user ID from custom auth or Supabase auth
      final userId = payerUserId ?? _supabase.auth.currentUser?.id;
      if (userId == null) {
        return const PaymentResult(success: false, error: 'Not authenticated');
      }

      // Process transfer via API (bypasses RLS)
      final result = await _api.processTransfer(
        fromWalletId: payerWalletId,
        toWalletId: recipientWalletId,
        amount: amount,
        userId: userId,
        description: description ?? 'QR Payment',
        pin: pin,
      );

      if (result['success'] == true) {
        return PaymentResult(
          success: true,
          transactionId: result['transaction_id'] as String?,
          reference: result['reference'] as String?,
        );
      }

      return PaymentResult(
        success: false,
        error: result['error'] as String? ?? 'Transfer failed',
      );
    } catch (e) {
      print('Error processing direct payment: $e');
      return PaymentResult(success: false, error: e.toString());
    }
  }

  /// Verify transaction PIN
  Future<bool> _verifyTransactionPin(String userId, String pin) async {
    try {
      final response = await _supabase
          .from('users')
          .select('transaction_pin')
          .eq('id', userId)
          .maybeSingle();

      if (response == null) return false;

      final storedPin = response['transaction_pin'] as String?;
      return storedPin == pin;
    } catch (e) {
      print('Error verifying PIN: $e');
      return false;
    }
  }

  /// Generate static QR code for receiving payments
  String generateReceiveQR({
    required String userId,
    required String walletId,
    String currency = 'SLE',
  }) {
    final payload = {
      'p': QR_PREFIX,
      'v': QR_VERSION,
      't': 'payment',
      'u': userId,
      'w': walletId,
      'c': currency,
      'r': _generateReference(),
    };

    final jsonString = jsonEncode(payload);
    final base64Data = base64.encode(utf8.encode(jsonString));
    return '$QR_PREFIX$base64Data';
  }

  /// Generate payment request QR code
  String generateRequestQR({
    required String userId,
    required String walletId,
    required double amount,
    String currency = 'SLE',
    String? description,
    int expirationMinutes = 15,
  }) {
    final expiresAt = DateTime.now().add(Duration(minutes: expirationMinutes));

    final payload = {
      'p': QR_PREFIX,
      'v': QR_VERSION,
      't': 'request',
      'u': userId,
      'w': walletId,
      'a': amount,
      'c': currency,
      'r': _generateReference(),
      'e': expiresAt.toIso8601String(),
      if (description != null) 'd': description,
    };

    final jsonString = jsonEncode(payload);
    final base64Data = base64.encode(utf8.encode(jsonString));
    return '$QR_PREFIX$base64Data';
  }

  String _generateReference() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = (timestamp % 10000).toString().padLeft(4, '0');
    return 'QR$timestamp$random';
  }
}

/// QR Payment Data Model
class QRPaymentData {
  final QRPaymentType type;
  final String? userId;
  final String? walletId;
  final double? amount;
  final String currency;
  final String? reference;
  final DateTime? expiresAt;
  final String? merchantName;
  final String? description;
  final String? sessionId;
  final String? eventId;
  final String? ticketNumber;

  const QRPaymentData({
    required this.type,
    this.userId,
    this.walletId,
    this.amount,
    this.currency = 'SLE',
    this.reference,
    this.expiresAt,
    this.merchantName,
    this.description,
    this.sessionId,
    this.eventId,
    this.ticketNumber,
  });

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }

  bool get hasAmount => amount != null && amount! > 0;
}

enum QRPaymentType {
  staticPayment,
  paymentRequest,
  merchantPayment,
  checkoutSession,
  eventTicket,
}

/// Checkout Session Model
class CheckoutSession {
  final String id;
  final String merchantId;
  final String? merchantName;
  final String? merchantLogo;
  final double amount;
  final String currency;
  final String? description;
  final String status;
  final String? successUrl;
  final String? cancelUrl;
  final DateTime? expiresAt;
  final DateTime createdAt;

  const CheckoutSession({
    required this.id,
    required this.merchantId,
    this.merchantName,
    this.merchantLogo,
    required this.amount,
    required this.currency,
    this.description,
    required this.status,
    this.successUrl,
    this.cancelUrl,
    this.expiresAt,
    required this.createdAt,
  });

  factory CheckoutSession.fromJson(Map<String, dynamic> json) {
    final merchant = json['merchant'] as Map<String, dynamic>?;
    return CheckoutSession(
      id: json['id'] as String,
      merchantId: json['merchant_id'] as String,
      merchantName: merchant?['business_name'] as String?,
      merchantLogo: merchant?['logo_url'] as String?,
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'SLE',
      description: json['description'] as String?,
      status: json['status'] as String? ?? 'pending',
      successUrl: json['success_url'] as String?,
      cancelUrl: json['cancel_url'] as String?,
      expiresAt: json['expires_at'] != null
          ? DateTime.parse(json['expires_at'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }

  bool get isPending => status == 'pending';
}

/// Payment Recipient Model
class PaymentRecipient {
  final String? userId;
  final String? walletId;
  final String walletName;
  final String currency;
  final String? firstName;
  final String? lastName;
  final String? email;
  final String? profilePicture;

  const PaymentRecipient({
    this.userId,
    this.walletId,
    required this.walletName,
    required this.currency,
    this.firstName,
    this.lastName,
    this.email,
    this.profilePicture,
  });

  String get displayName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName';
    }
    return firstName ?? lastName ?? email ?? 'Unknown';
  }

  String get initials {
    if (firstName != null && lastName != null) {
      return '${firstName![0]}${lastName![0]}'.toUpperCase();
    }
    if (firstName != null) return firstName![0].toUpperCase();
    if (email != null) return email!.substring(0, 2).toUpperCase();
    return '??';
  }
}

/// Payment Result Model
class PaymentResult {
  final bool success;
  final String? transactionId;
  final String? reference;
  final String? error;

  const PaymentResult({
    required this.success,
    this.transactionId,
    this.reference,
    this.error,
  });
}
