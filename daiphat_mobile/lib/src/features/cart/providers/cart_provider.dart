import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../models/cart_item_model.dart';

const cartHandlingFee = 2000;

class CartNotifier extends Notifier<List<CartItemData>> {
  Box get _cartBox => Hive.box('cartBox');

  @override
  List<CartItemData> build() {
    return _loadFromHive();
  }

  List<CartItemData> _loadFromHive() {
    final data = _cartBox.get('items', defaultValue: <dynamic>[]);
    final List<CartItemData> items = (data as List).map((e) {
      if (e is Map) {
        return CartItemData.fromMap(e);
      }
      return null;
    }).whereType<CartItemData>().toList();
    return items;
  }

  void _saveToHive(List<CartItemData> items) {
    _cartBox.put('items', items.map((e) => e.toMap()).toList());
  }

  void addItem(CartItemData item) {
    state = [...state, item];
    _saveToHive(state);
  }

  void removeItem(CartItemData item) {
    state = state.where((element) => element != item).toList();
    _saveToHive(state);
  }
  
  void removeAtIndex(int index) {
    if (index >= 0 && index < state.length) {
      final newState = List<CartItemData>.from(state);
      newState.removeAt(index);
      state = newState;
      _saveToHive(state);
    }
  }

  void insertItem(int index, CartItemData item) {
    final newState = List<CartItemData>.from(state);
    newState.insert(index, item);
    state = newState;
    _saveToHive(state);
  }

  void clearCart() {
    state = [];
    _saveToHive(state);
  }
}

final cartProvider = NotifierProvider<CartNotifier, List<CartItemData>>(CartNotifier.new);

final cartSubtotalProvider = Provider<int>((ref) {
  final items = ref.watch(cartProvider);
  return items.fold(0, (sum, item) => sum + item.subtotal);
});

final cartTicketCountProvider = Provider<int>((ref) {
  final items = ref.watch(cartProvider);
  return items.fold(0, (sum, item) => sum + item.quantity);
});

final cartTotalProvider = Provider<int>((ref) {
  final subtotal = ref.watch(cartSubtotalProvider);
  final items = ref.watch(cartProvider);
  return items.isEmpty ? 0 : subtotal + cartHandlingFee;
});
