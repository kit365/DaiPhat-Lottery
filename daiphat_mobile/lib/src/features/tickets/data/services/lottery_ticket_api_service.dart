import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/network/api_response.dart';
import 'package:daiphat_mobile/src/shared/network/page_response.dart';
import '../models/lottery_ticket.dart';

class LotteryTicketApiService {
  LotteryTicketApiService(this._apiClient);

  final ApiClient _apiClient;

  Future<PageResponse<LotteryTicket>> getLotteryTickets({
    int page = 1,
    int size = 100,
    int? stationId,
    String? status,
    String? drawDate,
    String? search,
    String? sortBy,
    String? direction,
  }) async {
    final queryParameters = <String, dynamic>{
      'page': page,
      'size': size,
    };

    if (stationId != null) queryParameters['stationId'] = stationId;
    if (status != null && status.trim().isNotEmpty) {
      queryParameters['status'] = status.trim();
    }
    if (drawDate != null && drawDate.trim().isNotEmpty) {
      queryParameters['drawDate'] = drawDate.trim();
    }
    if (search != null && search.trim().isNotEmpty) {
      queryParameters['search'] = search.trim();
    }
    if (sortBy != null && sortBy.trim().isNotEmpty) {
      queryParameters['sortBy'] = sortBy.trim();
    }
    if (direction != null && direction.trim().isNotEmpty) {
      queryParameters['direction'] = direction.trim();
    }

    final response = await _apiClient.get(
      '/lottery-tickets',
      queryParameters: queryParameters,
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

