import '../entities/prize_payout_request.dart';

abstract interface class PrizePayoutsRepository {
  Future<PrizePayoutPreview> preview({int? orderDetailId, int? serialId});
  Future<PrizePayoutRequestResult> create({
    int? orderDetailId,
    int? serialId,
    required int bankAccountId,
    required String recipientIdNumber,
    required String recipientIdImageUrl,
    required String recipientIdImageBackUrl,
  });
  Future<String> uploadRecipientIdImage(String filePath);
  Future<PrizePayoutPageResult> getMyRequests({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
  });
  Future<PrizePayoutRequestResponse> getById(int id);
  Future<PrizePayoutRequestResponse> cancel(int id);
}
