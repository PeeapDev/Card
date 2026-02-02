import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/tables/sync_queue_table.dart';
import '../../../core/services/sync_service.dart';
import '../../../shared/models/card_model.dart';

/// Stream provider for cards from local database (reactive, offline-first)
final cardsStreamProvider = StreamProvider<List<Card>>((ref) {
  final db = ref.watch(appDatabaseProvider);
  final userId = Supabase.instance.client.auth.currentUser?.id;

  if (userId == null) return Stream.value([]);

  return db.watchCards(userId);
});

/// User cards list provider (offline-first, from local DB)
final cardsProvider = FutureProvider<List<CardModel>>((ref) async {
  final db = ref.watch(appDatabaseProvider);
  final userId = Supabase.instance.client.auth.currentUser?.id;

  if (userId == null) return [];

  final cards = await db.getCards(userId);
  return cards.map((c) => CardModel(
    id: c.id,
    userId: c.userId,
    type: c.type,
    status: c.status,
    maskedPan: c.maskedPan,
    cardholderName: c.cardholderName,
    expiryMonth: c.expiryMonth,
    expiryYear: c.expiryYear,
    brand: c.brand,
    walletId: c.walletId,
    isFrozen: c.isFrozen,
    isVirtual: c.isVirtual,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  )).toList();
});

/// Single card provider (from local DB)
final cardProvider =
    FutureProvider.family<CardModel?, String>((ref, cardId) async {
  final db = ref.watch(appDatabaseProvider);

  final card = await db.getCard(cardId);
  if (card == null) return null;

  return CardModel(
    id: card.id,
    userId: card.userId,
    type: card.type,
    status: card.status,
    maskedPan: card.maskedPan,
    cardholderName: card.cardholderName,
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
    brand: card.brand,
    walletId: card.walletId,
    isFrozen: card.isFrozen,
    isVirtual: card.isVirtual,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  );
});

/// Card products provider (for marketplace - still from server)
final cardProductsProvider = FutureProvider<List<CardProduct>>((ref) async {
  final supabase = Supabase.instance.client;

  final response = await supabase
      .from('card_products')
      .select()
      .eq('is_active', true)
      .order('name');

  return (response as List).map((json) => CardProduct.fromJson(json)).toList();
});

/// Card operations state
class CardOperationsState {
  final bool isLoading;
  final String? error;
  final String? successMessage;

  const CardOperationsState({
    this.isLoading = false,
    this.error,
    this.successMessage,
  });

  CardOperationsState copyWith({
    bool? isLoading,
    String? error,
    String? successMessage,
  }) {
    return CardOperationsState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      successMessage: successMessage,
    );
  }
}

/// Card operations notifier (offline-first)
final cardOperationsProvider =
    StateNotifierProvider<CardOperationsNotifier, CardOperationsState>((ref) {
  return CardOperationsNotifier(ref);
});

class CardOperationsNotifier extends StateNotifier<CardOperationsState> {
  final Ref _ref;
  final _supabase = Supabase.instance.client;
  final _uuid = const Uuid();

  CardOperationsNotifier(this._ref) : super(const CardOperationsState());

  AppDatabase get _db => _ref.read(appDatabaseProvider);
  SyncService get _syncService => _ref.read(syncServiceProvider);

  /// Create virtual card (offline-first)
  Future<bool> createVirtualCard({
    required String productId,
    required String walletId,
    String? name,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        state = state.copyWith(isLoading: false, error: 'Not authenticated');
        return false;
      }

      final cardId = _uuid.v4();
      final now = DateTime.now();

      // Create card locally first
      await _db.upsertCard(CardsCompanion(
        id: Value(cardId),
        userId: Value(userId),
        type: const Value('virtual'),
        status: const Value('pending'),
        maskedPan: const Value('**** **** **** ****'),
        cardholderName: Value(name),
        walletId: Value(walletId),
        isFrozen: const Value(false),
        isVirtual: const Value(true),
        createdAt: Value(now),
        updatedAt: Value(now),
      ));

      // Queue for server sync
      await _syncService.queueSync(
        entityType: 'cards',
        entityId: cardId,
        operation: SyncOperation.create,
        payload: {
          'id': cardId,
          'user_id': userId,
          'product_id': productId,
          'wallet_id': walletId,
          'card_name': name,
          'created_at': now.toIso8601String(),
        },
        priority: 2,
      );

      state = state.copyWith(
        isLoading: false,
        successMessage: 'Virtual card created. Pending activation.',
      );
      _ref.invalidate(cardsProvider);
      _ref.invalidate(cardsStreamProvider);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to create card: ${e.toString()}',
      );
      return false;
    }
  }

  /// Freeze card (offline-first)
  Future<bool> freezeCard(String cardId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // Update locally first
      await _db.upsertCard(CardsCompanion(
        id: Value(cardId),
        isFrozen: const Value(true),
        updatedAt: Value(DateTime.now()),
      ));

      // Queue for sync
      await _syncService.queueSync(
        entityType: 'cards',
        entityId: cardId,
        operation: SyncOperation.update,
        payload: {'is_frozen': true},
        priority: 3,
      );

      state = state.copyWith(
        isLoading: false,
        successMessage: 'Card frozen',
      );
      _ref.invalidate(cardsProvider);
      _ref.invalidate(cardProvider(cardId));
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to freeze card',
      );
      return false;
    }
  }

  /// Unfreeze card (offline-first)
  Future<bool> unfreezeCard(String cardId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // Update locally first
      await _db.upsertCard(CardsCompanion(
        id: Value(cardId),
        isFrozen: const Value(false),
        updatedAt: Value(DateTime.now()),
      ));

      // Queue for sync
      await _syncService.queueSync(
        entityType: 'cards',
        entityId: cardId,
        operation: SyncOperation.update,
        payload: {'is_frozen': false},
        priority: 3,
      );

      state = state.copyWith(
        isLoading: false,
        successMessage: 'Card unfrozen',
      );
      _ref.invalidate(cardsProvider);
      _ref.invalidate(cardProvider(cardId));
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to unfreeze card',
      );
      return false;
    }
  }

  /// Set spending limit (offline-first)
  Future<bool> setSpendingLimit(String cardId, double limit) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // Update locally first
      await _db.upsertCard(CardsCompanion(
        id: Value(cardId),
        spendingLimit: Value(limit),
        updatedAt: Value(DateTime.now()),
      ));

      // Queue for sync
      await _syncService.queueSync(
        entityType: 'cards',
        entityId: cardId,
        operation: SyncOperation.update,
        payload: {'spending_limit': limit},
        priority: 3,
      );

      state = state.copyWith(
        isLoading: false,
        successMessage: 'Spending limit updated',
      );
      _ref.invalidate(cardProvider(cardId));
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to update spending limit',
      );
      return false;
    }
  }

  void clearMessages() {
    state = state.copyWith(error: null, successMessage: null);
  }
}

/// Card product model
class CardProduct {
  final String id;
  final String name;
  final String type;
  final String description;
  final double price;
  final String currency;
  final String? imageUrl;
  final Map<String, dynamic>? features;
  final bool isActive;

  CardProduct({
    required this.id,
    required this.name,
    required this.type,
    required this.description,
    required this.price,
    this.currency = 'SLE',
    this.imageUrl,
    this.features,
    this.isActive = true,
  });

  factory CardProduct.fromJson(Map<String, dynamic> json) {
    return CardProduct(
      id: json['id'],
      name: json['name'],
      type: json['type'],
      description: json['description'] ?? '',
      price: (json['price'] as num).toDouble(),
      currency: json['currency'] ?? 'SLE',
      imageUrl: json['image_url'],
      features: json['features'],
      isActive: json['is_active'] ?? true,
    );
  }
}
