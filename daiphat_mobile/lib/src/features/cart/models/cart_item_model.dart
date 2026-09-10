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
  /// Số serial còn IN_STOCK (giống maxStock trên website).
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
      'ticketImageUrl': ticketImageUrl,
      'drawDateIso': drawDateIso,
      'maxStock': maxStock,
    };
  }

  factory CartItemData.fromMap(Map<dynamic, dynamic> map) {
    var prov = map['province'] as String? ?? '';
    final logo = map['logoText'] as String? ?? '';
    if (prov.trim().isEmpty || prov.trim() == 'Đang cập nhật') {
      prov = logo.trim().isNotEmpty ? logo.trim() : 'Đài Miền Nam';
    }
    return CartItemData(
      lotteryTicketId: map['lotteryTicketId'] as int? ?? 0,
      province: prov,
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
