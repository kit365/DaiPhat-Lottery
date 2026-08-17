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
    List<String>? tailRanges,
    List<String>? numberTypes,
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
    if (tailRanges != null && tailRanges.isNotEmpty) {
      queryParameters['tailRanges'] = tailRanges;
    }
    if (numberTypes != null && numberTypes.isNotEmpty) {
      queryParameters['numberTypes'] = numberTypes;
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

  /// Đài mở bán theo ngày — không phụ thuộc kết quả search vé.
  Future<List<String>> getStationNamesForDrawDate(String drawDate) async {
    final response = await _apiClient.get(
      '/lottery-stations/schedule',
      queryParameters: <String, dynamic>{'drawDate': drawDate},
    );

    final apiResponse = ApiResponse<List<String>>.fromJson(
      response,
      (json) {
        final list = json as List<dynamic>? ?? const [];
        final names = <String>{};
        for (final item in list) {
          if (item is! Map<String, dynamic>) continue;
          final name =
              (item['name'] ?? item['province'] ?? item['stationName'] ?? '')
                  .toString()
                  .trim();
          if (name.isNotEmpty) {
            names.add(name);
          }
        }
        return names.toList();
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
}
