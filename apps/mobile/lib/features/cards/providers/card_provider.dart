import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../shared/models/card_model.dart';

// User cards list provider
final cardsProvider = FutureProvider<List<CardModel>>((ref) async {
  final supabase = Supabase.instance.client;
  final userId = supabase.auth.currentUser?.id;

  if (userId == null) return [];

  final response = await supabase
      .from('cards')
      .select()
      .eq('user_id', userId)
      .order('created_at', ascending: false);

  return (response as List).map((json) => CardModel.fromJson(json)).toList();
});

// Single card provider
final cardProvider =
    FutureProvider.family<CardModel?, String>((ref, cardId) async {
  final supabase = Supabase.instance.client;

  final response = await supabase
      .from('cards')
      .select()
      .eq('id', cardId)
      .single();

  return CardModel.fromJson(response);
});

// Card products provider (for marketplace)
final cardProductsProvider = FutureProvider<List<CardProduct>>((ref) async {
  final supabase = Supabase.instance.client;

  final response = await supabase
      .from('card_products')
      .select()
      .eq('is_active', true)
      .order('name');

  return (response as List).map((json) => CardProduct.fromJson(json)).toList();
});

// Card operations notifier
final cardOperationsProvider =
    StateNotifierProvider<CardOperationsNotifier, CardOperationsState>((ref) {
  return CardOperationsNotifier(ref);
});

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

class CardOperationsNotifier extends StateNotifier<CardOperationsState> {
  final Ref _ref;
  final _supabase = Supabase.instance.client;

  CardOperationsNotifier(this._ref) : super(const CardOperationsState());

  // Create virtual card
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

      final response = await _supabase.rpc('create_virtual_card', params: {
        'user_id': userId,
        'product_id': productId,
        'wallet_id': walletId,
        'card_name': name,
      });

      if (response['success'] == true) {
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Virtual card created successfully',
        );
        _ref.invalidate(cardsProvider);
        return true;
      }

      state = state.copyWith(
        isLoading: false,
        error: response['message'] ?? 'Failed to create card',
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'An error occurred: ${e.toString()}',
      );
      return false;
    }
  }

  // Freeze card
  Future<bool> freezeCard(String cardId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _supabase
          .from('cards')
          .update({'is_frozen': true})
          .eq('id', cardId);

      state = state.copyWith(
        isLoading: false,
        successMessage: 'Card frozen successfully',
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

  // Unfreeze card
  Future<bool> unfreezeCard(String cardId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _supabase
          .from('cards')
          .update({'is_frozen': false})
          .eq('id', cardId);

      state = state.copyWith(
        isLoading: false,
        successMessage: 'Card unfrozen successfully',
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

  // Set spending limit
  Future<bool> setSpendingLimit(String cardId, double limit) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _supabase
          .from('cards')
          .update({'spending_limit': limit})
          .eq('id', cardId);

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

// Card product model
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
