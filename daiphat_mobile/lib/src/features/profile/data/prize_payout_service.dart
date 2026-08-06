import 'package:daiphat_mobile/src/features/profile/data/models/prize_payout_request.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/network/api_response.dart';

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
    if (orderDetailId == null && serialId == null) {
      throw const ApiException(
        'Thiếu thông tin vé để xem trước trả thưởng.',
      );
    }

    final response = await _apiClient.get(
      '/prize-payout-requests/preview',
      queryParameters: {
        if (orderDetailId != null) 'orderDetailId': orderDetailId,
        if (serialId != null) 'serialId': serialId,
      },
    );

    final apiResponse = ApiResponse<PrizePayoutPreview>.fromJson(
      response,
      (json) => PrizePayoutPreview.fromJson(json as Map<String, dynamic>),
    );

    if (!apiResponse.isSuccess || apiResponse.data == null) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không thể xem trước số tiền trả thưởng.',
      );
    }

    return apiResponse.data!;
  }

  Future<PrizePayoutRequestResult> create({
    int? orderDetailId,
    int? serialId,
    required int bankAccountId,
  }) async {
    if (orderDetailId == null && serialId == null) {
      throw const ApiException('Thiếu thông tin vé để gửi yêu cầu trả thưởng.');
    }

    final response = await _apiClient.post(
      '/prize-payout-requests',
      data: {
        if (orderDetailId != null) 'orderDetailId': orderDetailId,
        if (serialId != null) 'serialId': serialId,
        'bankAccountId': bankAccountId,
      },
    );

    final apiResponse = ApiResponse<PrizePayoutRequestResult>.fromJson(
      response,
      (json) => PrizePayoutRequestResult.fromJson(json as Map<String, dynamic>),
    );

    if (!apiResponse.isSuccess || apiResponse.data == null) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không thể gửi yêu cầu trả thưởng.',
      );
    }

    return apiResponse.data!;
  }

  Future<PrizePayoutPageResult> getMyRequests({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
  }) async {
    final response = await _apiClient.get(
      '/prize-payout-requests/my',
      queryParameters: {
        'page': page,
        'limit': limit,
        if (status != null && status.isNotEmpty) 'status': status,
        if (search != null && search.isNotEmpty) 'search': search,
      },
    );

    final data = response['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không thể tải danh sách yêu cầu trả thưởng.',
      );
    }
    return PrizePayoutPageResult.fromJson(data);
  }

  Future<PrizePayoutRequestResponse> getById(int id) async {
    final response = await _apiClient.get('/prize-payout-requests/$id');
    final data = response['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không tìm thấy yêu cầu trả thưởng.',
      );
    }
    return PrizePayoutRequestResponse.fromJson(data);
  }

  Future<PrizePayoutRequestResponse> cancel(int id) async {
    final response = await _apiClient.patch('/prize-payout-requests/$id/cancel');
    final data = response['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không thể hủy yêu cầu trả thưởng.',
      );
    }
    return PrizePayoutRequestResponse.fromJson(data);
  }
}
