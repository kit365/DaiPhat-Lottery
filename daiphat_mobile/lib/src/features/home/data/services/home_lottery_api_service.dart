import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/network/api_response.dart';

import '../models/lottery_result.dart';

class HomeLotteryApiService {
  HomeLotteryApiService(this._apiClient);

  final ApiClient _apiClient;
  static const _baseUrl = '/lottery-results';
  static const _defaultRegion = 'MIEN_NAM';

  Future<List<LotteryResultSummaryApiResponse>> getBoard(DateTime drawDate) async {
    final response = await _apiClient.get(
      '$_baseUrl/board',
      queryParameters: <String, dynamic>{
        'region': _defaultRegion,
        'drawDate': _toApiDate(drawDate),
      },
    );

    final apiResponse = ApiResponse<List<LotteryResultSummaryApiResponse>>.fromJson(
      response,
      (json) {
        final payload = json as Map<String, dynamic>? ?? const <String, dynamic>{};
        final results = payload['results'] as List<dynamic>? ?? const [];
        return results
            .map((item) => LotteryResultSummaryApiResponse.fromJson(item as Map<String, dynamic>))
            .toList();
      },
    );

    if (!apiResponse.isSuccess || apiResponse.data == null) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Khong the tai bang ket qua xo so.',
      );
    }

    return apiResponse.data!;
  }

  Future<List<LotteryResultLiveItemApiResponse>> getDetails(List<int> resultIds) async {
    if (resultIds.isEmpty) {
      return const [];
    }

    final response = await _apiClient.get(
      '$_baseUrl/details',
      queryParameters: <String, dynamic>{
        'resultIds': resultIds.join(','),
      },
    );

    final apiResponse = ApiResponse<List<LotteryResultLiveItemApiResponse>>.fromJson(
      response,
      (json) {
        final payload = json as Map<String, dynamic>? ?? const <String, dynamic>{};
        final results = payload['results'] as List<dynamic>? ?? const [];
        return results
            .map((item) => LotteryResultLiveItemApiResponse.fromJson(item as Map<String, dynamic>))
            .toList();
      },
    );

    if (!apiResponse.isSuccess || apiResponse.data == null) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Khong the tai chi tiet ket qua xo so.',
      );
    }

    return apiResponse.data!;
  }

  String _toApiDate(DateTime value) {
    final year = value.year.toString().padLeft(4, '0');
    final month = value.month.toString().padLeft(2, '0');
    final day = value.day.toString().padLeft(2, '0');
    return '$year-$month-$day';
  }
}
