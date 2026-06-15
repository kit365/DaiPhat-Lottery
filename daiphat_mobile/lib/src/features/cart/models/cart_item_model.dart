class CartItemData {
  final String province;
  final String dateLabel;
  final String prizeLabel;
  final String number;
  final int quantity;
  final int unitPrice;
  final String logoText;

  const CartItemData({
    required this.province,
    required this.dateLabel,
    required this.prizeLabel,
    required this.number,
    required this.quantity,
    required this.unitPrice,
    required this.logoText,
  });

  int get subtotal => quantity * unitPrice;

  Map<String, dynamic> toMap() {
    return {
      'province': province,
      'dateLabel': dateLabel,
      'prizeLabel': prizeLabel,
      'number': number,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'logoText': logoText,
    };
  }

  factory CartItemData.fromMap(Map<dynamic, dynamic> map) {
    return CartItemData(
      province: map['province'] as String? ?? '',
      dateLabel: map['dateLabel'] as String? ?? '',
      prizeLabel: map['prizeLabel'] as String? ?? '',
      number: map['number'] as String? ?? '',
      quantity: map['quantity'] as int? ?? 1,
      unitPrice: map['unitPrice'] as int? ?? 0,
      logoText: map['logoText'] as String? ?? '',
    );
  }

  // To allow comparison and correct removal
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CartItemData &&
          runtimeType == other.runtimeType &&
          province == other.province &&
          dateLabel == other.dateLabel &&
          prizeLabel == other.prizeLabel &&
          number == other.number &&
          quantity == other.quantity &&
          unitPrice == other.unitPrice &&
          logoText == other.logoText;

  @override
  int get hashCode =>
      province.hashCode ^
      dateLabel.hashCode ^
      prizeLabel.hashCode ^
      number.hashCode ^
      quantity.hashCode ^
      unitPrice.hashCode ^
      logoText.hashCode;
}
