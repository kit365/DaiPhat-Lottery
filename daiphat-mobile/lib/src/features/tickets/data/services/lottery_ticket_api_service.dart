import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/network/api_response.dart';
import 'package:daiphat_mobile/src/shared/network/page_response.dart';
import '../models/lottery_ticket.dart';

class LotteryTicketApiService {
  LotteryTicketApiService(this._apiClient);

  final ApiClient _apiClient;

  /// Catalog vé đang bán — khớp FE `GET /lottery-tickets/public`.
  Future<PageResponse<LotteryTicket>> getPublicLotteryTickets({
    int page = 1,
    int size = 100,
    int? stationId,
    List<int>? stationIds,
    String? drawDate,
    String? search,
    String? searchMode,
    String? sortBy,
    String? direction,
  }) async {
    final queryParameters = <String, dynamic>{
      'page': page,
      'size': size,
    };

    if (stationId != null) queryParameters['stationId'] = stationId;
    if (stationIds != null && stationIds.isNotEmpty) {
      queryParameters['stationIds'] = stationIds;
    }
    if (drawDate != null && drawDate.trim().isNotEmpty) {
      queryParameters['drawDate'] = drawDate.trim();
    }
    if (search != null && search.trim().isNotEmpty) {
      queryParameters['search'] = search.trim();
      queryParameters['searchMode'] =
          (searchMode != null && searchMode.trim().isNotEmpty)
          ? searchMode.trim()
          : 'CONTAINS';
    }
    if (sortBy != null && sortBy.trim().isNotEmpty) {
      queryParameters['sortBy'] = sortBy.trim();
    }
    if (direction != null && direction.trim().isNotEmpty) {
      queryParameters['direction'] = direction.trim();
    }

    final response = await _apiClient.get(
      '/lottery-tickets/public',
      queryParameters: queryParameters,
      includeAuth: false,
    );

    final apiResponse = ApiResponse<PageResponse<LotteryTicket>>.fromJson(
      response,
      (json) => PageResponse<LotteryTicket>.fromJson(
        json as Map<String, dynamic>,
        (item) => LotteryTicket.fromJson(item as Map<String, dynamic>),
      ),
    );

    if (!apiResponse.isSuccess || apiResponse.data == null) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Khong the tai danh sach ve so.',
      );
    }

    return apiResponse.data!;
  }

  Future<LotteryTicket> getLotteryTicketDetail(int id) async {
    final response = await _apiClient.get('/lottery-tickets/$id');

    final apiResponse = ApiResponse<LotteryTicket>.fromJson(
      response,
      (json) => LotteryTicket.fromJson(json as Map<String, dynamic>),
    );

    if (!apiResponse.isSuccess || apiResponse.data == null) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Khong the tai chi tiet ve so.',
      );
    }

    return apiResponse.data!;
  }
}
