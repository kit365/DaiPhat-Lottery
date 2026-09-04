import '../entities/prize_payout_request.dart';
import '../repositories/prize_payouts_repository.dart';

class PreviewPrizePayout {
  final PrizePayoutsRepository _repository;
  const PreviewPrizePayout(this._repository);
  Future<PrizePayoutPreview> call({int? orderDetailId, int? serialId}) =>
      _repository.preview(orderDetailId: orderDetailId, serialId: serialId);
}

class CreatePrizePayout {
  final PrizePayoutsRepository _repository;
  const CreatePrizePayout(this._repository);
  Future<PrizePayoutRequestResult> call({
    int? orderDetailId,
    int? serialId,
    required int bankAccountId,
  }) => _repository.create(
    orderDetailId: orderDetailId,
    serialId: serialId,
    bankAccountId: bankAccountId,
  );
}

class GetMyPrizePayouts {
  final PrizePayoutsRepository _repository;
  const GetMyPrizePayouts(this._repository);
  Future<PrizePayoutPageResult> call({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
  }) => _repository.getMyRequests(
    page: page,
    limit: limit,
    status: status,
    search: search,
  );
}

class GetPrizePayoutDetail {
  final PrizePayoutsRepository _repository;
  const GetPrizePayoutDetail(this._repository);
  Future<PrizePayoutRequestResponse> call(int id) => _repository.getById(id);
}

class CancelPrizePayout {
  final PrizePayoutsRepository _repository;
  const CancelPrizePayout(this._repository);
  Future<PrizePayoutRequestResponse> call(int id) => _repository.cancel(id);
}
