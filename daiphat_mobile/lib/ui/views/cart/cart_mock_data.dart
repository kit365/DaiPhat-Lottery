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
    dateLabel: 'Thứ hai, 27/05/2024',
    prizeLabel: 'Giải đặc biệt',
    number: '123456',
    quantity: 1,
    unitPrice: 10000,
    logoText: 'TP',
  ),
  CartItemData(
    province: 'Đồng Nai',
    dateLabel: 'Thứ ba, 28/05/2024',
    prizeLabel: 'Giải đặc biệt',
    number: '853913',
    quantity: 2,
    unitPrice: 10000,
    logoText: 'ĐN',
  ),
  CartItemData(
    province: 'Cần Thơ',
    dateLabel: 'Thứ tư, 29/05/2024',
    prizeLabel: 'Giải đặc biệt',
    number: '246801',
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
