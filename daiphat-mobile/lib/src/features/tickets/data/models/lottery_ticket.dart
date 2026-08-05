class LotteryTicket {
  const LotteryTicket({
    required this.id,
    required this.stationId,
    required this.stationName,
    required this.ticketImg,
    required this.serialNumber,
    required this.numbers,
    required this.drawDate,
    required this.quantity,
    required this.batchCode,
    required this.status,
    required this.statusDisplayName,
    required this.verified,
    this.priceSnapshot,
    this.importedById,
    this.importedAt,
    this.verifiedById,
    this.verifiedAt,
    this.returnedAt,
    this.createdAt,
    this.updatedAt,
    this.createdBy,
    this.lastModifiedBy,
  });

  final int id;
  final int? stationId;
  final String stationName;
  final String? ticketImg;
  final String serialNumber;
  final String numbers;
  final DateTime? drawDate;
  final int quantity;
  final String? batchCode;
  final String status;
  final String statusDisplayName;
  final bool verified;
  final int? priceSnapshot;
  final String? importedById;
  final DateTime? importedAt;
  final String? verifiedById;
  final DateTime? verifiedAt;
  final DateTime? returnedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? createdBy;
  final String? lastModifiedBy;

  factory LotteryTicket.fromJson(Map<String, dynamic> json) {
    return LotteryTicket(
      id: (json['id'] as num?)?.toInt() ?? 0,
      stationId: (json['stationId'] as num?)?.toInt(),
      stationName: json['stationName']?.toString() ?? '',
      ticketImg: json['ticketImg']?.toString(),
      serialNumber: json['serialNumber']?.toString() ?? '',
      numbers: json['numbers']?.toString() ?? '',
      drawDate: _parseDateTime(json['drawDate']),
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      batchCode: json['batchCode']?.toString(),
      status: json['status']?.toString() ?? '',
      statusDisplayName: json['statusDisplayName']?.toString() ?? '',
      verified: json['verified'] as bool? ?? false,
      priceSnapshot: _parsePrice(json['priceSnapshot']),
      importedById: json['importedById']?.toString(),
      importedAt: _parseDateTime(json['importedAt']),
      verifiedById: json['verifiedById']?.toString(),
      verifiedAt: _parseDateTime(json['verifiedAt']),
      returnedAt: _parseDateTime(json['returnedAt']),
      createdAt: _parseDateTime(json['createdAt']),
      updatedAt: _parseDateTime(json['updatedAt']),
      createdBy: json['createdBy']?.toString(),
      lastModifiedBy: json['lastModifiedBy']?.toString(),
    );
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString());
  }

  static int? _parsePrice(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toInt();
    return int.tryParse(value.toString().split('.').first);
  }
}
