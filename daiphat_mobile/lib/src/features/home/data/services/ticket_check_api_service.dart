import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/network/api_response.dart';

import '../models/ticket_check_models.dart';

class TicketCheckApiService {
  TicketCheckApiService(this._apiClient);

  final ApiClient _apiClient;

  Future<List<LotteryStationDraw>> getScheduleForDate(DateTime drawDate) async {
    final response = await _apiClient.get(
      '/lottery-stations/schedule',
      queryParameters: <String, dynamic>{
        'drawDate': _toApiDate(drawDate),
      },
    );

    final apiResponse = ApiResponse<List<LotteryStationDraw>>.fromJson(
      response,
      (json) {
        final list = json as List<dynamic>? ?? const [];
        return list
            .map((item) =>
                LotteryStationDraw.fromJson(item as Map<String, dynamic>))
            .where((s) => s.id > 0)
            .toList();
      },
    );

    if (!apiResponse.isSuccess) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không thể tải danh sách đài.',
      );
    }

    return apiResponse.data ?? const [];
  }

  Future<TicketCheckResult> checkWinning({
    required int stationId,
    required DateTime drawDate,
    required String ticketNumber,
  }) async {
    final response = await _apiClient.get(
      '/lottery-results/check',
      queryParameters: <String, dynamic>{
        'stationId': stationId,
        'drawDate': _toApiDate(drawDate),
        'ticketNumber': ticketNumber,
      },
    );

    final apiResponse = ApiResponse<TicketCheckResult>.fromJson(
      response,
      (json) => TicketCheckResult.fromJson(json as Map<String, dynamic>),
    );

    if (!apiResponse.isSuccess || apiResponse.data == null) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không tìm thấy kết quả quay số của đài này vào ngày đã chọn.',
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
