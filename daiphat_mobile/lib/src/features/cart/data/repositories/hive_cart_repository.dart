import 'package:hive_flutter/hive_flutter.dart';

import '../../domain/entities/cart_item.dart';
import '../../domain/repositories/cart_repository.dart';
import '../mappers/cart_item_mapper.dart';

class HiveCartRepository implements CartRepository {
  HiveCartRepository(this._cartBox);

  static const _itemsKey = 'items';
  static const _legacySeedFlag = 'seededExpiredTicket20260820';
  static const _pendingPurchasePrefix = 'pendingPurchase.';

  final Box _cartBox;

  @override
  List<CartItemData> loadItems() {
    final data = _cartBox.get(_itemsKey, defaultValue: <dynamic>[]);
    if (data is! List) return [];

    return data
        .whereType<Map>()
        .map(CartItemMapper.fromMap)
        .where((item) => item.lotteryTicketId > 0 && item.quantity > 0)
        .toList();
  }

  @override
  void saveItems(List<CartItemData> items) {
    _cartBox.put(_itemsKey, items.map(CartItemMapper.toMap).toList());
  }

  @override
  void clearLegacyExpiredSeedFlag() {
    _cartBox.delete(_legacySeedFlag);
  }

  @override
  void recordPendingPurchase(String orderId, List<CartItemData> items) {
    _cartBox.put(
      '$_pendingPurchasePrefix$orderId',
      items.map(CartItemMapper.toMap).toList(),
    );
  }

  @override
  List<CartItemData>? loadPendingPurchase(String orderId) {
    final raw = _cartBox.get('$_pendingPurchasePrefix$orderId');
    if (raw is! List) return null;

    final items = raw
        .whereType<Map>()
        .map(CartItemMapper.fromMap)
        .where((item) => item.lotteryTicketId > 0 && item.quantity > 0)
        .toList();
    return items.isEmpty ? null : items;
  }

  @override
  void deletePendingPurchase(String orderId) {
    _cartBox.delete('$_pendingPurchasePrefix$orderId');
  }
}
