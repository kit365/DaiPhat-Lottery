import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../models/cart_item_model.dart';

class CartNotifier extends Notifier<List<CartItemData>> {
  Box get _cartBox => Hive.box('cartBox');

  @override
  List<CartItemData> build() {
    final items = _loadFromHive();
    return _ensureLocalExpiredSeedTicket(items);
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

  List<CartItemData> _ensureLocalExpiredSeedTicket(List<CartItemData> items) {
    const seedTicketId = 202608200001;
    const seedFlag = 'seededExpiredTicket20260820';
    if (_cartBox.get(seedFlag, defaultValue: false) == true) {
      return items;
    }
    if (items.any((item) => item.lotteryTicketId == seedTicketId)) {
      _cartBox.put(seedFlag, true);
      return items;
    }

    final seeded = [
      ...items,
      const CartItemData(
        lotteryTicketId: seedTicketId,
        province: 'Hồ Chí Minh',
        dateLabel: '20/08/2026',
        drawTime: '16:15',
        kyHieu: 'HCM',
        number: '208620',
        quantity: 1,
        unitPrice: 10000,
        logoText: 'HCM',
        drawDateIso: '2026-08-20',
        maxStock: 1,
      ),
    ];
    _cartBox.put(seedFlag, true);
    _saveToHive(seeded);
    return seeded;
  }

  void addItem(CartItemData item) {
    final maxStock = item.maxStock > 0 ? item.maxStock : 1;
    final existingIndex =
        state.indexWhere((e) => e.lotteryTicketId == item.lotteryTicketId);

    if (existingIndex >= 0) {
      final existing = state[existingIndex];
      final resolvedMax =
          maxStock > existing.maxStock ? maxStock : existing.maxStock;
      final nextQty = (existing.quantity + item.quantity).clamp(1, resolvedMax);
      final newState = List<CartItemData>.from(state);
      newState[existingIndex] = existing.copyWith(
        quantity: nextQty,
        maxStock: resolvedMax,
      );
      state = newState;
    } else {
      final qty = item.quantity.clamp(1, maxStock);
      state = [
        ...state,
        item.copyWith(quantity: qty, maxStock: maxStock),
      ];
    }
    _saveToHive(state);
  }

  /// Số lượng đang có trong giỏ cho 1 lotteryTicketId.
  int quantityForTicket(int lotteryTicketId) {
    return state
        .where((e) => e.lotteryTicketId == lotteryTicketId)
        .fold(0, (sum, e) => sum + e.quantity);
  }

  void removeAtIndex(int index) {
    if (index >= 0 && index < state.length) {
      final newState = List<CartItemData>.from(state);
      newState.removeAt(index);
      state = newState;
      _saveToHive(state);
    }
  }

  void removeAtIndexes(Iterable<int> indexes) {
    final toRemove = indexes.toSet();
    if (toRemove.isEmpty) return;
    state = [
      for (var i = 0; i < state.length; i++)
        if (!toRemove.contains(i)) state[i],
    ];
    _saveToHive(state);
  }

  void updateQuantityAtIndex(int index, int quantity) {
    if (index < 0 || index >= state.length) return;
    final item = state[index];
    final maxStock = item.maxStock > 0 ? item.maxStock : 1;
    final qty = quantity.clamp(1, maxStock);
    final newState = List<CartItemData>.from(state);
    newState[index] = item.copyWith(quantity: qty);
    state = newState;
    _saveToHive(state);
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

  /// Sau thanh toán "Mua ngay": chỉ trừ đúng vé vừa mua khỏi giỏ chính (nếu trùng).
  void applyBuyNowPurchase(List<CartItemData> purchased) {
    if (purchased.isEmpty) return;

    final remainToSubtract = <int, int>{};
    for (final item in purchased) {
      remainToSubtract.update(
        item.lotteryTicketId,
        (qty) => qty + item.quantity,
        ifAbsent: () => item.quantity,
      );
    }

    final next = <CartItemData>[];
    for (final item in state) {
      final subtract = remainToSubtract[item.lotteryTicketId] ?? 0;
      if (subtract <= 0) {
        next.add(item);
        continue;
      }
      if (item.quantity > subtract) {
        next.add(item.copyWith(quantity: item.quantity - subtract));
        remainToSubtract[item.lotteryTicketId] = 0;
      } else {
        remainToSubtract[item.lotteryTicketId] = subtract - item.quantity;
      }
    }

    state = next;
    _saveToHive(state);
  }
}

/// Phiên "Mua ngay" — `null` = không có phiên; list = đang thanh toán riêng.
class BuyNowNotifier extends Notifier<List<CartItemData>?> {
  @override
  List<CartItemData>? build() => null;

  void start(List<CartItemData> items) {
    state = items.where((e) => e.quantity > 0).toList(growable: false);
  }

  void clear() {
    state = null;
  }
}

final cartProvider =
    NotifierProvider<CartNotifier, List<CartItemData>>(CartNotifier.new);

final buyNowItemsProvider =
    NotifierProvider<BuyNowNotifier, List<CartItemData>?>(BuyNowNotifier.new);

/// Items dùng cho màn thanh toán: ưu tiên phiên mua ngay nếu đang có.
final checkoutItemsProvider = Provider<List<CartItemData>>((ref) {
  final buyNow = ref.watch(buyNowItemsProvider);
  if (buyNow != null) return buyNow;
  return ref.watch(cartProvider);
});

final cartTicketCountProvider = Provider<int>((ref) {
  final items = ref.watch(cartProvider);
  return items.fold(0, (sum, item) => sum + item.quantity);
});
