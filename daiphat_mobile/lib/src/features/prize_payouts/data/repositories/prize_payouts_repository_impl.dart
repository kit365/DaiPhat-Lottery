import '../../domain/entities/prize_payout_request.dart';
import '../../domain/repositories/prize_payouts_repository.dart';
import '../datasources/prize_payout_remote_data_source.dart';

class PrizePayoutsRepositoryImpl implements PrizePayoutsRepository {
  final PrizePayoutRemoteDataSource _remoteDataSource;
  const PrizePayoutsRepositoryImpl(this._remoteDataSource);

  @override
  Future<PrizePayoutPreview> preview({int? orderDetailId, int? serialId}) =>
      _remoteDataSource.preview(orderDetailId: orderDetailId, serialId: serialId);

  @override
  Future<PrizePayoutRequestResult> create({
    int? orderDetailId,
    int? serialId,
    required int bankAccountId,
  }) => _remoteDataSource.create(
    orderDetailId: orderDetailId,
    serialId: serialId,
    bankAccountId: bankAccountId,
  );

  @override
  Future<PrizePayoutPageResult> getMyRequests({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
  }) => _remoteDataSource.getMyRequests(
    page: page,
    limit: limit,
    status: status,
    search: search,
  );

  @override
  Future<PrizePayoutRequestResponse> getById(int id) => _remoteDataSource.getById(id);

  @override
  Future<PrizePayoutRequestResponse> cancel(int id) => _remoteDataSource.cancel(id);
}
