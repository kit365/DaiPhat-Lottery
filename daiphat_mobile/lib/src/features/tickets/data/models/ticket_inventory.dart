class TicketInventory {
  const TicketInventory({
    required this.id,
    required this.availableQuantity,
    required this.purchasable,
    required this.valid,
    this.message,
  });

  final int id;
  final int availableQuantity;
  final bool purchasable;
  final bool valid;
  final String? message;

  factory TicketInventory.fromJson(Map<String, dynamic> json) =>
      TicketInventory(
        id: (json['lotteryTicketId'] as num).toInt(),
        availableQuantity: (json['availableQuantity'] as num).toInt(),
        purchasable: json['purchasable'] == true,
        valid: json['valid'] == true,
        message: json['message'] as String?,
      );
}
