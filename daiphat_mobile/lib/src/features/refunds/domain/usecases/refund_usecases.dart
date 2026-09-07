import '../entities/refund_request.dart';
import '../repositories/refunds_repository.dart';

class GetMyRefunds {
  final RefundsRepository _repository;
  const GetMyRefunds(this._repository);
  Future<RefundPageResult> call({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
    String? orderId,
  }) => _repository.getMyRefunds(
    page: page,
    limit: limit,
    status: status,
    search: search,
    orderId: orderId,
  );
}

class GetRefundDetail {
  final RefundsRepository _repository;
  const GetRefundDetail(this._repository);
  Future<RefundRequestResponse> call(int id) => _repository.getRefundDetail(id);
}

class AttachRefundBankAccount {
  final RefundsRepository _repository;
  const AttachRefundBankAccount(this._repository);
  Future<RefundRequestResponse> call({required int id, required int bankAccountId}) =>
      _repository.attachBankAccount(id: id, bankAccountId: bankAccountId);
}
