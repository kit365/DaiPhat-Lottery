import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/network/api_response.dart';

import '../models/lottery_station_schedule.dart';

class ScheduleApiService {
  ScheduleApiService(this._apiClient);

  final ApiClient _apiClient;

  Future<List<LotteryStationSchedule>> fetchAll({String? region}) async {
    final response = await _apiClient.get(
      '/lottery-stations/schedule/all',
      queryParameters: region == null || region.isEmpty
          ? null
          : <String, dynamic>{'region': region},
    );

    final apiResponse = ApiResponse<List<LotteryStationSchedule>>.fromJson(
      response,
      (json) {
        final list = json as List<dynamic>? ?? const [];
        return list
            .whereType<Map<String, dynamic>>()
            .map(LotteryStationSchedule.fromJson)
            .where((item) => item.stationId > 0 && item.stationName.isNotEmpty)
            .toList();
      },
    );

    if (!apiResponse.isSuccess) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không thể tải lịch mở thưởng. Vui lòng thử lại sau.',
      );
    }

    return apiResponse.data ?? const [];
  }
}
