import '../entities/prize_payout_request.dart';

abstract interface class PrizePayoutsRepository {
  Future<PrizePayoutPreview> preview({int? orderDetailId, int? serialId});
  Future<PrizePayoutRequestResult> create({
    int? orderDetailId,
    int? serialId,
    required int bankAccountId,
  });
  Future<PrizePayoutPageResult> getMyRequests({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
  });
  Future<PrizePayoutRequestResponse> getById(int id);
  Future<PrizePayoutRequestResponse> cancel(int id);
}
