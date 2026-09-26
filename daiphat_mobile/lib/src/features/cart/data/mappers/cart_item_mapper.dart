import '../../domain/entities/cart_item.dart';

class CartItemMapper {
  static Map<String, dynamic> toMap(CartItemData item) {
    return {
      'lotteryTicketId': item.lotteryTicketId,
      'province': item.province,
      'dateLabel': item.dateLabel,
      'drawTime': item.drawTime,
      'kyHieu': item.kyHieu,
      'number': item.number,
      'quantity': item.quantity,
      'unitPrice': item.unitPrice,
      'logoText': item.logoText,
      'ticketImageUrl': item.ticketImageUrl,
      'drawDateIso': item.drawDateIso,
      'maxStock': item.maxStock,
    };
  }

  static CartItemData fromMap(Map<dynamic, dynamic> map) {
    var province = map['province'] as String? ?? '';
    final logo = map['logoText'] as String? ?? '';
    if (province.trim().isEmpty || province.trim() == 'Đang cập nhật') {
      province = logo.trim().isNotEmpty ? logo.trim() : 'Đài Miền Nam';
    }

    return CartItemData(
      lotteryTicketId: map['lotteryTicketId'] as int? ?? 0,
      province: province,
      dateLabel: map['dateLabel'] as String? ?? '',
      drawTime: map['drawTime'] as String? ?? '',
      kyHieu: map['kyHieu'] as String? ?? '',
      number: map['number'] as String? ?? '',
      quantity: map['quantity'] as int? ?? 1,
      unitPrice: map['unitPrice'] as int? ?? 0,
      logoText: logo,
      ticketImageUrl: map['ticketImageUrl'] as String?,
      drawDateIso: map['drawDateIso'] as String?,
      maxStock: map['maxStock'] as int? ?? 1,
    );
  }
}
