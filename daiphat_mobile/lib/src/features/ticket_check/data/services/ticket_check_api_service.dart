import 'package:daiphat_mobile/src/features/ticket_check/data/models/ticket_check_models.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/network/api_response.dart';

import '../../../../shared/network/api_client.dart';

class TicketCheckApiService {
  TicketCheckApiService(this._apiClient);

  final ApiClient _apiClient;

  static const _resultBaseUrl = '/lottery-results';
  static const _stationBaseUrl = '/lottery-stations';

  Future<List<LotteryStationDraw>> getScheduleForDate(DateTime drawDate) async {
    final response = await _apiClient.get(
      '$_stationBaseUrl/schedule',
      queryParameters: <String, dynamic>{'drawDate': _toApiDate(drawDate)},
    );

    final apiResponse = ApiResponse<List<LotteryStationDraw>>.fromJson(response, (
      json,
    ) {
      final items = json as List<dynamic>? ?? const [];
      return items
          .map((item) => LotteryStationDraw.fromJson(item as Map<String, dynamic>))
          .toList();
    });

    if (!apiResponse.isSuccess || apiResponse.data == null) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Khong the tai danh sach dai quay.',
      );
    }

    return apiResponse.data!;
  }

  Future<TicketCheckResult> checkWinning({
    required int stationId,
    required DateTime drawDate,
    required String ticketNumber,
  }) async {
    final response = await _apiClient.get(
      '$_resultBaseUrl/check',
      queryParameters: <String, dynamic>{
        'stationId': stationId,
        'drawDate': _toApiDate(drawDate),
        'ticketNumber': ticketNumber.trim(),
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
            : 'Khong the tra cuu ket qua ve so.',
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
