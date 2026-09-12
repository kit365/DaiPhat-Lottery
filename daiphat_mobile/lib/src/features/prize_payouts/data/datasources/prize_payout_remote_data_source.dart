import 'package:dio/dio.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/domain/entities/prize_payout_request.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/network/api_response.dart';

class PrizePayoutRemoteDataSource {
  static const _basePrizePayoutRequests = '/prize-payout-requests';

  final ApiClient _apiClient;

  PrizePayoutRemoteDataSource(this._apiClient);

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
      '$_basePrizePayoutRequests/preview',
      queryParameters: {
        'orderDetailId': ?orderDetailId,
        'serialId': ?serialId,
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

  Future<String> uploadRecipientIdImage(String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
    });
    final response = await _apiClient.post(
      '$_basePrizePayoutRequests/recipient-id/upload',
      data: formData,
    );
    final data = response['data'];
    final url = data is Map<String, dynamic> ? data['url']?.toString() : null;
    if (url == null || url.isEmpty) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không nhận được URL ảnh CCCD từ server.',
      );
    }
    return url;
  }

  Future<PrizePayoutRequestResult> create({
    int? orderDetailId,
    int? serialId,
    required int bankAccountId,
    required String recipientIdNumber,
    required String recipientIdImageUrl,
    required String recipientIdImageBackUrl,
  }) async {
    if (orderDetailId == null && serialId == null) {
      throw const ApiException('Thiếu thông tin vé để gửi yêu cầu trả thưởng.');
    }

    final response = await _apiClient.post(
      _basePrizePayoutRequests,
      data: {
        'orderDetailId': ?orderDetailId,
        'serialId': ?serialId,
        'bankAccountId': bankAccountId,
        'recipientIdNumber': recipientIdNumber,
        'recipientIdImageUrl': recipientIdImageUrl,
        'recipientIdImageBackUrl': recipientIdImageBackUrl,
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
      '$_basePrizePayoutRequests/my',
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
    final response = await _apiClient.get('$_basePrizePayoutRequests/$id');
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
    final response = await _apiClient.patch('$_basePrizePayoutRequests/$id/cancel');
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
