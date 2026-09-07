import '../../domain/entities/refund_request.dart';
import '../../domain/repositories/refunds_repository.dart';
import '../datasources/refund_remote_data_source.dart';

class RefundsRepositoryImpl implements RefundsRepository {
  final RefundRemoteDataSource _remoteDataSource;
  const RefundsRepositoryImpl(this._remoteDataSource);

  @override
  Future<RefundPageResult> getMyRefunds({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
    String? orderId,
  }) => _remoteDataSource.getMyRefunds(
    page: page,
    limit: limit,
    status: status,
    search: search,
    orderId: orderId,
  );

  @override
  Future<RefundRequestResponse> getRefundDetail(int id) =>
      _remoteDataSource.getRefundDetail(id);

  @override
  Future<RefundRequestResponse> attachBankAccount({
    required int id,
    required int bankAccountId,
  }) => _remoteDataSource.attachBankAccount(id: id, bankAccountId: bankAccountId);
}
