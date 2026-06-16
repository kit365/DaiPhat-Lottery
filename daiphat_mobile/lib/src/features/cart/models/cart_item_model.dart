class CartItemData {
  final int lotteryTicketId;
  final String province;
  final String dateLabel;
  final String drawTime;
  final String kyHieu;
  final String number;
  final int quantity;
  final int unitPrice;
  final String logoText;

  const CartItemData({
    required this.lotteryTicketId,
    required this.province,
    required this.dateLabel,
    required this.drawTime,
    required this.kyHieu,
    required this.number,
    required this.quantity,
    required this.unitPrice,
    required this.logoText,
  });

  int get subtotal => quantity * unitPrice;

  Map<String, dynamic> toMap() {
    return {
      'lotteryTicketId': lotteryTicketId,
      'province': province,
      'dateLabel': dateLabel,
      'drawTime': drawTime,
      'kyHieu': kyHieu,
      'number': number,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'logoText': logoText,
    };
  }

  factory CartItemData.fromMap(Map<dynamic, dynamic> map) {
    return CartItemData(
      lotteryTicketId: map['lotteryTicketId'] as int? ?? 0,
      province: map['province'] as String? ?? '',
      dateLabel: map['dateLabel'] as String? ?? '',
      drawTime: map['drawTime'] as String? ?? '',
      kyHieu: map['kyHieu'] as String? ?? '',
      number: map['number'] as String? ?? '',
      quantity: map['quantity'] as int? ?? 1,
      unitPrice: map['unitPrice'] as int? ?? 0,
      logoText: map['logoText'] as String? ?? '',
    );
  }

  CartItemData copyWith({int? quantity}) {
    return CartItemData(
      lotteryTicketId: lotteryTicketId,
      province: province,
      dateLabel: dateLabel,
      drawTime: drawTime,
      kyHieu: kyHieu,
      number: number,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice,
      logoText: logoText,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CartItemData &&
          runtimeType == other.runtimeType &&
          lotteryTicketId == other.lotteryTicketId &&
          province == other.province &&
          dateLabel == other.dateLabel &&
          number == other.number &&
          quantity == other.quantity &&
          unitPrice == other.unitPrice &&
          logoText == other.logoText;

  @override
  int get hashCode =>
      lotteryTicketId.hashCode ^
      province.hashCode ^
      dateLabel.hashCode ^
      number.hashCode ^
      quantity.hashCode ^
      unitPrice.hashCode ^
      logoText.hashCode;
}
