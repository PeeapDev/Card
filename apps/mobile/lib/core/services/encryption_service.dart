import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:encrypt/encrypt.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pointycastle/export.dart';

/// Provider for the encryption service
final encryptionServiceProvider = Provider<EncryptionService>((ref) {
  return EncryptionService();
});

/// AES-256 encryption service for sensitive local data
/// Uses secure storage to store the encryption key
class EncryptionService {
  static const _keyStorageKey = 'peeap_encryption_key';
  static const _ivStorageKey = 'peeap_encryption_iv';

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  Key? _key;
  IV? _iv;
  Encrypter? _encrypter;

  /// Initialize the encryption service
  /// Must be called before any encryption/decryption operations
  Future<void> initialize() async {
    // Try to load existing key
    final storedKey = await _secureStorage.read(key: _keyStorageKey);
    final storedIv = await _secureStorage.read(key: _ivStorageKey);

    if (storedKey != null && storedIv != null) {
      _key = Key(base64Decode(storedKey));
      _iv = IV(base64Decode(storedIv));
    } else {
      // Generate new key and IV
      _key = Key.fromSecureRandom(32); // AES-256
      _iv = IV.fromSecureRandom(16);

      // Store securely
      await _secureStorage.write(
        key: _keyStorageKey,
        value: base64Encode(_key!.bytes),
      );
      await _secureStorage.write(
        key: _ivStorageKey,
        value: base64Encode(_iv!.bytes),
      );
    }

    _encrypter = Encrypter(AES(_key!, mode: AESMode.cbc));
  }

  /// Encrypt a string value
  String encrypt(String plainText) {
    if (_encrypter == null || _iv == null) {
      throw StateError('EncryptionService not initialized. Call initialize() first.');
    }
    final encrypted = _encrypter!.encrypt(plainText, iv: _iv);
    return encrypted.base64;
  }

  /// Decrypt an encrypted string value
  String decrypt(String encryptedText) {
    if (_encrypter == null || _iv == null) {
      throw StateError('EncryptionService not initialized. Call initialize() first.');
    }
    final decrypted = _encrypter!.decrypt64(encryptedText, iv: _iv);
    return decrypted;
  }

  /// Encrypt a map (JSON object)
  String encryptJson(Map<String, dynamic> data) {
    final jsonString = jsonEncode(data);
    return encrypt(jsonString);
  }

  /// Decrypt to a map (JSON object)
  Map<String, dynamic> decryptJson(String encryptedText) {
    final jsonString = decrypt(encryptedText);
    return jsonDecode(jsonString) as Map<String, dynamic>;
  }

  /// Hash a PIN or password using PBKDF2
  String hashPin(String pin, {String? salt}) {
    final saltBytes = salt != null
        ? base64Decode(salt)
        : _generateSalt();

    final pbkdf2 = PBKDF2KeyDerivator(HMac(SHA256Digest(), 64))
      ..init(Pbkdf2Parameters(saltBytes, 10000, 32));

    final pinBytes = Uint8List.fromList(utf8.encode(pin));
    final hashedBytes = pbkdf2.process(pinBytes);

    // Return salt:hash
    return '${base64Encode(saltBytes)}:${base64Encode(hashedBytes)}';
  }

  /// Verify a PIN against a stored hash
  bool verifyPin(String pin, String storedHash) {
    final parts = storedHash.split(':');
    if (parts.length != 2) return false;

    final salt = parts[0];
    final newHash = hashPin(pin, salt: salt);

    return newHash == storedHash;
  }

  /// Generate a secure random salt
  Uint8List _generateSalt() {
    final random = Random.secure();
    return Uint8List.fromList(
      List<int>.generate(16, (_) => random.nextInt(256)),
    );
  }

  /// Generate a secure random token
  String generateSecureToken({int length = 32}) {
    final random = Random.secure();
    final bytes = Uint8List.fromList(
      List<int>.generate(length, (_) => random.nextInt(256)),
    );
    return base64UrlEncode(bytes);
  }

  /// Clear all stored encryption keys (for logout)
  Future<void> clearKeys() async {
    await _secureStorage.delete(key: _keyStorageKey);
    await _secureStorage.delete(key: _ivStorageKey);
    _key = null;
    _iv = null;
    _encrypter = null;
  }

  /// Re-encrypt data with a new key (key rotation)
  Future<String> rotateKey(String encryptedData) async {
    // Decrypt with old key
    final plainText = decrypt(encryptedData);

    // Generate new key
    final newKey = Key.fromSecureRandom(32);
    final newIv = IV.fromSecureRandom(16);

    // Store new key
    await _secureStorage.write(
      key: _keyStorageKey,
      value: base64Encode(newKey.bytes),
    );
    await _secureStorage.write(
      key: _ivStorageKey,
      value: base64Encode(newIv.bytes),
    );

    // Update instance
    _key = newKey;
    _iv = newIv;
    _encrypter = Encrypter(AES(_key!, mode: AESMode.cbc));

    // Re-encrypt with new key
    return encrypt(plainText);
  }
}

/// Sensitive data that should be encrypted
class SensitiveData {
  final String pinHash;
  final String? biometricToken;
  final Map<String, String>? savedCards;
  final String? refreshToken;

  SensitiveData({
    required this.pinHash,
    this.biometricToken,
    this.savedCards,
    this.refreshToken,
  });

  Map<String, dynamic> toJson() => {
        'pinHash': pinHash,
        if (biometricToken != null) 'biometricToken': biometricToken,
        if (savedCards != null) 'savedCards': savedCards,
        if (refreshToken != null) 'refreshToken': refreshToken,
      };

  factory SensitiveData.fromJson(Map<String, dynamic> json) => SensitiveData(
        pinHash: json['pinHash'] as String,
        biometricToken: json['biometricToken'] as String?,
        savedCards: json['savedCards'] != null
            ? Map<String, String>.from(json['savedCards'] as Map)
            : null,
        refreshToken: json['refreshToken'] as String?,
      );
}
