import 'package:daiphat_mobile/src/features/profile/data/models/refund_request.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';

class RefundService {
  static const _baseRefundRequests = '/refund-requests';

  final ApiClient _apiClient;

  RefundService(this._apiClient);

  Future<RefundPageResult> getMyRefunds({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
    String? orderId,
  }) async {
    final response = await _apiClient.get(
      '$_baseRefundRequests/my',
      queryParameters: {
        'page': page,
        'limit': limit,
        if (status != null && status.isNotEmpty) 'status': status,
        if (search != null && search.isNotEmpty) 'search': search,
        if (orderId != null && orderId.isNotEmpty) 'orderId': orderId,
      },
    );

    final data = response['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không thể tải danh sách yêu cầu hoàn tiền.',
      );
    }
    return RefundPageResult.fromJson(data);
  }

  Future<RefundRequestResponse> getRefundDetail(int id) async {
    final response = await _apiClient.get('$_baseRefundRequests/$id');
    final data = response['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không tìm thấy yêu cầu hoàn tiền.',
      );
    }
    return RefundRequestResponse.fromJson(data);
  }

  Future<RefundRequestResponse> attachBankAccount({
    required int id,
    required int bankAccountId,
  }) async {
    final response = await _apiClient.patch(
      '$_baseRefundRequests/$id/bank-account',
      data: {'bankAccountId': bankAccountId},
    );
    final data = response['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không thể cập nhật tài khoản ngân hàng.',
      );
    }
    return RefundRequestResponse.fromJson(data);
  }
}
