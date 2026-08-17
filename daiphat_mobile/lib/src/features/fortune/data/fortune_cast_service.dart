import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/network/api_response.dart';

import 'models/fortune_cast_result.dart';

class FortuneCastService {
  FortuneCastService(this._apiClient);

  final ApiClient _apiClient;

  Future<FortuneCastResult> cast(CastFortunePayload payload) async {
    final response = await _apiClient.post(
      '/fortune/cast',
      data: payload.toJson(),
    );
    final apiResponse = ApiResponse<FortuneCastResult>.fromJson(
      response,
      (json) => FortuneCastResult.fromJson(json as Map<String, dynamic>),
    );
    if (!apiResponse.isSuccess || apiResponse.data == null) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không gieo được quẻ. Vui lòng thử lại.',
      );
    }
    return apiResponse.data!;
  }

  Future<FortuneCastResult?> getToday() async {
    final response = await _apiClient.get('/fortune/cast/today');
    final data = response['data'];
    if (data is! Map<String, dynamic>) return null;
    return FortuneCastResult.fromJson(data);
  }
}
