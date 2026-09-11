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
  final String? ticketImageUrl;
  final String? drawDateIso;
  final int maxStock;

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
    this.ticketImageUrl,
    this.drawDateIso,
    this.maxStock = 1,
  });

  int get subtotal => quantity * unitPrice;

  CartItemData copyWith({
    int? quantity,
    int? maxStock,
    String? ticketImageUrl,
    String? drawDateIso,
  }) {
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
      ticketImageUrl: ticketImageUrl ?? this.ticketImageUrl,
      drawDateIso: drawDateIso ?? this.drawDateIso,
      maxStock: maxStock ?? this.maxStock,
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
          logoText == other.logoText &&
          ticketImageUrl == other.ticketImageUrl &&
          drawDateIso == other.drawDateIso &&
          maxStock == other.maxStock;

  @override
  int get hashCode =>
      lotteryTicketId.hashCode ^
      province.hashCode ^
      dateLabel.hashCode ^
      number.hashCode ^
      quantity.hashCode ^
      unitPrice.hashCode ^
      logoText.hashCode ^
      ticketImageUrl.hashCode ^
      drawDateIso.hashCode ^
      maxStock.hashCode;
}
