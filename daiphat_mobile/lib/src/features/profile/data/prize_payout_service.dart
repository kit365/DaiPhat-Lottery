import 'package:daiphat_mobile/src/shared/network/api_client.dart';

class PrizePayoutPreview {
  final int orderDetailId;
  final int serialId;
  final String? prizeDisplayName;
  final int grossAmount;
  final int taxAmount;
  final int commissionAmount;
  final int netAmount;
  final bool canClaimOnline;

  const PrizePayoutPreview({
    required this.orderDetailId,
    required this.serialId,
    this.prizeDisplayName,
    required this.grossAmount,
    required this.taxAmount,
    required this.commissionAmount,
    required this.netAmount,
    required this.canClaimOnline,
  });

  factory PrizePayoutPreview.fromJson(Map<String, dynamic> json) {
    return PrizePayoutPreview(
      orderDetailId: json['orderDetailId'] as int? ?? 0,
      serialId: json['serialId'] as int? ?? 0,
      prizeDisplayName: json['prizeDisplayName']?.toString(),
      grossAmount: _parseInt(json['grossAmount']),
      taxAmount: _parseInt(json['taxAmount']),
      commissionAmount: _parseInt(json['commissionAmount']),
      netAmount: _parseInt(json['netAmount']),
      canClaimOnline: json['canClaimOnline'] as bool? ?? false,
    );
  }

  static int _parseInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is double) return value.toInt();
    return int.tryParse(value.toString()) ?? 0;
  }
}

class PrizePayoutRequestResult {
  final int id;
  final String requestCode;
  final String status;

  const PrizePayoutRequestResult({
    required this.id,
    required this.requestCode,
    required this.status,
  });

  factory PrizePayoutRequestResult.fromJson(Map<String, dynamic> json) {
    return PrizePayoutRequestResult(
      id: json['id'] as int? ?? 0,
      requestCode: json['requestCode']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
    );
  }
}

class PrizePayoutService {
  final ApiClient _apiClient;

  PrizePayoutService(this._apiClient);

  Future<PrizePayoutPreview> preview({
    int? orderDetailId,
    int? serialId,
  }) async {
    final response = await _apiClient.get(
      '/prize-payout-requests/preview',
      queryParameters: {
        if (orderDetailId != null) 'orderDetailId': orderDetailId,
        if (serialId != null) 'serialId': serialId,
      },
    );
    final data = response['data'] as Map<String, dynamic>;
    return PrizePayoutPreview.fromJson(data);
  }

  Future<PrizePayoutRequestResult> create({
    int? orderDetailId,
    int? serialId,
    required int bankAccountId,
  }) async {
    final response = await _apiClient.post(
      '/prize-payout-requests',
      data: {
        if (orderDetailId != null) 'orderDetailId': orderDetailId,
        if (serialId != null) 'serialId': serialId,
        'bankAccountId': bankAccountId,
      },
    );
    final data = response['data'] as Map<String, dynamic>;
    return PrizePayoutRequestResult.fromJson(data);
  }
}
