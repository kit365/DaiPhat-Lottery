import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../data/repositories/hive_cart_repository.dart';
import '../../domain/entities/cart_item.dart';
import '../../domain/repositories/cart_repository.dart';
import '../../domain/usecases/cart_usecases.dart';

final cartRepositoryProvider = Provider<CartRepository>((ref) {
  return HiveCartRepository(Hive.box('cartBox'));
});

final loadCartItemsProvider = Provider<LoadCartItems>((ref) {
  return LoadCartItems(ref.watch(cartRepositoryProvider));
});

final saveCartItemsProvider = Provider<SaveCartItems>((ref) {
  return SaveCartItems(ref.watch(cartRepositoryProvider));
});

final addCartItemProvider = Provider<AddCartItem>((ref) => AddCartItem());

final countCartTicketQuantityProvider = Provider<CountCartTicketQuantity>(
  (ref) => CountCartTicketQuantity(),
);

final removeCartItemAtIndexProvider = Provider<RemoveCartItemAtIndex>(
  (ref) => RemoveCartItemAtIndex(),
);

final removeCartItemsAtIndexesProvider = Provider<RemoveCartItemsAtIndexes>(
  (ref) => RemoveCartItemsAtIndexes(),
);

final updateCartItemQuantityAtIndexProvider =
    Provider<UpdateCartItemQuantityAtIndex>(
      (ref) => UpdateCartItemQuantityAtIndex(),
    );

final insertCartItemProvider = Provider<InsertCartItem>((ref) {
  return InsertCartItem();
});

final applyBuyNowPurchaseProvider = Provider<ApplyBuyNowPurchase>((ref) {
  return ApplyBuyNowPurchase();
});

final recordPendingPurchaseProvider = Provider<RecordPendingPurchase>((ref) {
  return RecordPendingPurchase(ref.watch(cartRepositoryProvider));
});

final loadPendingPurchaseProvider = Provider<LoadPendingPurchase>((ref) {
  return LoadPendingPurchase(ref.watch(cartRepositoryProvider));
});

final deletePendingPurchaseProvider = Provider<DeletePendingPurchase>((ref) {
  return DeletePendingPurchase(ref.watch(cartRepositoryProvider));
});

class CartNotifier extends Notifier<List<CartItemData>> {
  @override
  List<CartItemData> build() {
    return ref.watch(loadCartItemsProvider)();
  }

  void _save(List<CartItemData> items) {
    ref.read(saveCartItemsProvider)(items);
  }

  void _update(List<CartItemData> next) {
    state = next;
    _save(state);
  }

  void addItem(CartItemData item) {
    _update(ref.read(addCartItemProvider)(state, item));
  }

  int quantityForTicket(int lotteryTicketId) {
    return ref.read(countCartTicketQuantityProvider)(state, lotteryTicketId);
  }

  void removeAtIndex(int index) {
    final next = ref.read(removeCartItemAtIndexProvider)(state, index);
    if (!identical(next, state)) {
      _update(next);
    }
  }

  void removeAtIndexes(Iterable<int> indexes) {
    final next = ref.read(removeCartItemsAtIndexesProvider)(state, indexes);
    if (!identical(next, state)) {
      _update(next);
    }
  }

  void updateQuantityAtIndex(int index, int quantity) {
    final next = ref.read(updateCartItemQuantityAtIndexProvider)(
      state,
      index,
      quantity,
    );
    if (!identical(next, state)) {
      _update(next);
    }
  }

  void insertItem(int index, CartItemData item) {
    _update(ref.read(insertCartItemProvider)(state, index, item));
  }

  void clearCart() {
    _update([]);
  }

  void recordPendingPurchase(String orderId, List<CartItemData> items) {
    ref.read(recordPendingPurchaseProvider)(orderId, items);
  }

  bool finalizePendingPurchase(String orderId) {
    final purchased = ref.read(loadPendingPurchaseProvider)(orderId);
    if (purchased == null) return false;
    applyBuyNowPurchase(purchased);
    ref.read(deletePendingPurchaseProvider)(orderId);
    return true;
  }

  void applyBuyNowPurchase(List<CartItemData> purchased) {
    final next = ref.read(applyBuyNowPurchaseProvider)(state, purchased);
    if (!identical(next, state)) {
      _update(next);
    }
  }
}

class BuyNowNotifier extends Notifier<List<CartItemData>?> {
  @override
  List<CartItemData>? build() => null;

  void start(List<CartItemData> items) {
    state = items.where((item) => item.quantity > 0).toList(growable: false);
  }

  void clear() {
    state = null;
  }
}

final cartProvider = NotifierProvider<CartNotifier, List<CartItemData>>(
  CartNotifier.new,
);

final buyNowItemsProvider =
    NotifierProvider<BuyNowNotifier, List<CartItemData>?>(BuyNowNotifier.new);

final checkoutItemsProvider = Provider<List<CartItemData>>((ref) {
  final buyNow = ref.watch(buyNowItemsProvider);
  if (buyNow != null) return buyNow;
  return ref.watch(cartProvider);
});

final cartTicketCountProvider = Provider<int>((ref) {
  final items = ref.watch(cartProvider);
  return items.fold(0, (sum, item) => sum + item.quantity);
});
