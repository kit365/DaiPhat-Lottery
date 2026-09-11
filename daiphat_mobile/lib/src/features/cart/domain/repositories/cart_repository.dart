import '../entities/cart_item.dart';

abstract class CartRepository {
  List<CartItemData> loadItems();

  void saveItems(List<CartItemData> items);

  void clearLegacyExpiredSeedFlag();

  void recordPendingPurchase(String orderId, List<CartItemData> items);

  List<CartItemData>? loadPendingPurchase(String orderId);

  void deletePendingPurchase(String orderId);
}
