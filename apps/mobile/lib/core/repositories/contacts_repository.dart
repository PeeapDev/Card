import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../database/app_database.dart';
import '../database/tables/sync_queue_table.dart';
import '../services/sync_service.dart';

/// Provider for contacts repository
final contactsRepositoryProvider = Provider<ContactsRepository>((ref) {
  final db = ref.watch(appDatabaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  return ContactsRepository(db, syncService);
});

/// Offline-first contacts repository
/// Enables WhatsApp-style contact-based payments
class ContactsRepository {
  final AppDatabase _db;
  final SyncService _syncService;
  final _uuid = const Uuid();

  ContactsRepository(this._db, this._syncService);

  /// Watch contacts (reactive stream)
  Stream<List<Contact>> watchContacts(String userId) {
    return _db.watchContacts(userId);
  }

  /// Get contact by phone number
  Future<Contact?> getContactByPhone(String userId, String phone) {
    return _db.getContactByPhone(userId, _normalizePhone(phone));
  }

  /// Add or update contact
  Future<void> saveContact({
    required String userId,
    required String name,
    required String phone,
    String? email,
    String? avatarUrl,
    bool isPeeapUser = false,
    String? peeapUserId,
  }) async {
    final normalizedPhone = _normalizePhone(phone);
    final existing = await getContactByPhone(userId, normalizedPhone);

    final contactId = existing?.id ?? _uuid.v4();
    final now = DateTime.now();

    await _db.upsertContact(ContactsCompanion(
      id: Value(contactId),
      userId: Value(userId),
      contactUserId: Value(peeapUserId),
      name: Value(name),
      phone: Value(normalizedPhone),
      email: Value(email),
      avatarUrl: Value(avatarUrl),
      isPeeapUser: Value(isPeeapUser),
      createdAt: existing == null ? Value(now) : const Value.absent(),
      updatedAt: Value(now),
    ));

    // Queue sync if new contact
    if (existing == null) {
      await _syncService.queueSync(
        entityType: 'contacts',
        entityId: contactId,
        operation: SyncOperation.create,
        payload: {
          'id': contactId,
          'user_id': userId,
          'contact_user_id': peeapUserId,
          'name': name,
          'phone': normalizedPhone,
          'email': email,
          'avatar_url': avatarUrl,
          'is_peeap_user': isPeeapUser,
          'created_at': now.toIso8601String(),
        },
        priority: 5,
      );
    }
  }

  /// Toggle favorite status
  Future<void> toggleFavorite(String contactId) async {
    final contact = await (_db.select(_db.contacts)
          ..where((t) => t.id.equals(contactId)))
        .getSingleOrNull();

    if (contact != null) {
      await _db.upsertContact(ContactsCompanion(
        id: Value(contactId),
        isFavorite: Value(!contact.isFavorite),
        updatedAt: Value(DateTime.now()),
      ));

      await _syncService.queueSync(
        entityType: 'contacts',
        entityId: contactId,
        operation: SyncOperation.update,
        payload: {
          'is_favorite': !contact.isFavorite,
        },
        priority: 5,
      );
    }
  }

  /// Record transaction with contact
  Future<void> recordTransaction({
    required String contactId,
    required bool isSent,
    required double amount,
    required String currency,
  }) async {
    await _db.updateContactTransactionStats(
      contactId,
      isSent: isSent,
      amount: amount,
    );

    // Get contact for recent recipients
    final contact = await (_db.select(_db.contacts)
          ..where((t) => t.id.equals(contactId)))
        .getSingleOrNull();

    if (contact != null) {
      await _db.addRecentRecipient(RecentRecipientsCompanion(
        userId: Value(contact.userId),
        contactId: Value(contactId),
        contactPhone: Value(contact.phone),
        contactName: Value(contact.name),
        lastAmount: Value(amount),
        lastCurrency: Value(currency),
        usedAt: Value(DateTime.now()),
      ));
    }
  }

  /// Get recent recipients
  Future<List<RecentRecipient>> getRecentRecipients(
    String userId, {
    int limit = 10,
  }) {
    return _db.getRecentRecipients(userId, limit: limit);
  }

  /// Search contacts
  Future<List<Contact>> searchContacts(String userId, String query) async {
    final allContacts = await _db.watchContacts(userId).first;

    final lowerQuery = query.toLowerCase();
    return allContacts.where((c) {
      return c.name.toLowerCase().contains(lowerQuery) ||
          c.phone.contains(query) ||
          (c.email?.toLowerCase().contains(lowerQuery) ?? false);
    }).toList();
  }

  /// Get favorite contacts
  Future<List<Contact>> getFavorites(String userId) async {
    final allContacts = await _db.watchContacts(userId).first;
    return allContacts.where((c) => c.isFavorite).toList();
  }

  /// Get frequent contacts (by transaction count)
  Future<List<Contact>> getFrequentContacts(
    String userId, {
    int limit = 5,
  }) async {
    final allContacts = await _db.watchContacts(userId).first;
    final sorted = allContacts.toList()
      ..sort((a, b) => b.transactionCount.compareTo(a.transactionCount));
    return sorted.take(limit).toList();
  }

  /// Check if phone number is a Peeap user
  Future<bool> checkPeeapUser(String phone) async {
    // This would typically call the server
    // For now, return false (will be updated during sync)
    return false;
  }

  /// Sync contacts with device contacts
  Future<void> syncDeviceContacts(
    String userId,
    List<DeviceContact> deviceContacts,
  ) async {
    for (final contact in deviceContacts) {
      if (contact.phone != null) {
        final normalizedPhone = _normalizePhone(contact.phone!);
        final existing = await getContactByPhone(userId, normalizedPhone);

        if (existing == null) {
          await saveContact(
            userId: userId,
            name: contact.name,
            phone: normalizedPhone,
            email: contact.email,
          );
        }
      }
    }
  }

  /// Delete contact
  Future<void> deleteContact(String contactId) async {
    await (_db.delete(_db.contacts)..where((t) => t.id.equals(contactId))).go();

    await _syncService.queueSync(
      entityType: 'contacts',
      entityId: contactId,
      operation: SyncOperation.delete,
      payload: {'id': contactId},
      priority: 5,
    );
  }

  /// Normalize phone number
  String _normalizePhone(String phone) {
    // Remove spaces, dashes, and other formatting
    var normalized = phone.replaceAll(RegExp(r'[\s\-\(\)]'), '');

    // Add country code if missing (assuming Sierra Leone)
    if (!normalized.startsWith('+')) {
      if (normalized.startsWith('0')) {
        normalized = '+232${normalized.substring(1)}';
      } else if (!normalized.startsWith('232')) {
        normalized = '+232$normalized';
      } else {
        normalized = '+$normalized';
      }
    }

    return normalized;
  }
}

/// Device contact for syncing
class DeviceContact {
  final String name;
  final String? phone;
  final String? email;

  DeviceContact({
    required this.name,
    this.phone,
    this.email,
  });
}
