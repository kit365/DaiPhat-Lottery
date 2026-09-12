import '../entities/cart_item.dart';
import '../repositories/cart_repository.dart';

const _legacySeedTicketId = 202608200001;

bool isLegacyExpiredSeedTicket(CartItemData item) {
  return item.lotteryTicketId == _legacySeedTicketId &&
      item.number == '208620' &&
      item.drawDateIso == '2026-08-20' &&
      item.province == 'Hồ Chí Minh';
}

class LoadCartItems {
  LoadCartItems(this._repository);

  final CartRepository _repository;

  List<CartItemData> call() {
    final items = _repository.loadItems();
    final cleaned = items.where((item) => !isLegacyExpiredSeedTicket(item)).toList();
    if (cleaned.length != items.length) {
      _repository.saveItems(cleaned);
    }
    _repository.clearLegacyExpiredSeedFlag();
    return cleaned;
  }
}

class SaveCartItems {
  SaveCartItems(this._repository);

  final CartRepository _repository;

  void call(List<CartItemData> items) {
    _repository.saveItems(items);
  }
}

class AddCartItem {
  List<CartItemData> call(List<CartItemData> current, CartItemData item) {
    final maxStock = item.maxStock > 0 ? item.maxStock : 1;
    final existingIndex = current.indexWhere(
      (entry) => entry.lotteryTicketId == item.lotteryTicketId,
    );

    if (existingIndex < 0) {
      final qty = item.quantity.clamp(1, maxStock);
      return [
        ...current,
        item.copyWith(quantity: qty, maxStock: maxStock),
      ];
    }

    final existing = current[existingIndex];
    final resolvedMax = maxStock > existing.maxStock ? maxStock : existing.maxStock;
    final nextQty = (existing.quantity + item.quantity).clamp(1, resolvedMax);
    final next = List<CartItemData>.from(current);
    next[existingIndex] = existing.copyWith(
      quantity: nextQty,
      maxStock: resolvedMax,
    );
    return next;
  }
}

class CountCartTicketQuantity {
  int call(List<CartItemData> current, int lotteryTicketId) {
    return current
        .where((item) => item.lotteryTicketId == lotteryTicketId)
        .fold(0, (sum, item) => sum + item.quantity);
  }
}

class RemoveCartItemAtIndex {
  List<CartItemData> call(List<CartItemData> current, int index) {
    if (index < 0 || index >= current.length) return current;
    final next = List<CartItemData>.from(current)..removeAt(index);
    return next;
  }
}

class RemoveCartItemsAtIndexes {
  List<CartItemData> call(List<CartItemData> current, Iterable<int> indexes) {
    final toRemove = indexes.toSet();
    if (toRemove.isEmpty) return current;
    return [
      for (var i = 0; i < current.length; i++)
        if (!toRemove.contains(i)) current[i],
    ];
  }
}

class UpdateCartItemQuantityAtIndex {
  List<CartItemData> call(List<CartItemData> current, int index, int quantity) {
    if (index < 0 || index >= current.length) return current;
    final item = current[index];
    final maxStock = item.maxStock > 0 ? item.maxStock : 1;
    final qty = quantity.clamp(1, maxStock);
    final next = List<CartItemData>.from(current);
    next[index] = item.copyWith(quantity: qty);
    return next;
  }
}

class InsertCartItem {
  List<CartItemData> call(List<CartItemData> current, int index, CartItemData item) {
    final next = List<CartItemData>.from(current);
    final resolvedIndex = index.clamp(0, next.length);
    next.insert(resolvedIndex, item);
    return next;
  }
}

class ApplyBuyNowPurchase {
  List<CartItemData> call(List<CartItemData> current, List<CartItemData> purchased) {
    if (purchased.isEmpty) return current;

    final remainToSubtract = <int, int>{};
    for (final item in purchased) {
      remainToSubtract.update(
        item.lotteryTicketId,
        (qty) => qty + item.quantity,
        ifAbsent: () => item.quantity,
      );
    }

    final next = <CartItemData>[];
    for (final item in current) {
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

    return next;
  }
}

class RecordPendingPurchase {
  RecordPendingPurchase(this._repository);

  final CartRepository _repository;

  void call(String orderId, List<CartItemData> items) {
    if (orderId.isEmpty || items.isEmpty) return;
    _repository.recordPendingPurchase(orderId, items);
  }
}

class LoadPendingPurchase {
  LoadPendingPurchase(this._repository);

  final CartRepository _repository;

  List<CartItemData>? call(String orderId) {
    if (orderId.isEmpty) return null;
    return _repository.loadPendingPurchase(orderId);
  }
}

class DeletePendingPurchase {
  DeletePendingPurchase(this._repository);

  final CartRepository _repository;

  void call(String orderId) {
    if (orderId.isEmpty) return;
    _repository.deletePendingPurchase(orderId);
  }
}
