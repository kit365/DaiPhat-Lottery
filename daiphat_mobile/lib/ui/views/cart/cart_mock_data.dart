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
}

const cartMockItems = <CartItemData>[
  CartItemData(
    province: 'TP. Hồ Chí Minh',
    dateLabel: 'Hôm nay - 09/02/2025',
    prizeLabel: 'Vé số truyền thống',
    number: '853911',
    quantity: 1,
    unitPrice: 10000,
    logoText: 'HCM',
  ),
  CartItemData(
    province: 'Đồng Nai',
    dateLabel: 'Hôm nay - 09/02/2025',
    prizeLabel: 'Vé số truyền thống',
    number: '853912',
    quantity: 2,
    unitPrice: 10000,
    logoText: 'ĐN',
  ),
  CartItemData(
    province: 'Cần Thơ',
    dateLabel: 'Hôm nay - 09/02/2025',
    prizeLabel: 'Vé số truyền thống',
    number: '853913',
    quantity: 2,
    unitPrice: 10000,
    logoText: 'CT',
  ),
];

const cartHandlingFee = 2000;

int get cartSubtotal =>
    cartMockItems.fold(0, (sum, item) => sum + item.subtotal);

int get cartTicketCount =>
    cartMockItems.fold(0, (sum, item) => sum + item.quantity);

int get cartTotal => cartSubtotal + cartHandlingFee;
