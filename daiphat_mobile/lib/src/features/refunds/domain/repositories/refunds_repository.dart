import '../entities/refund_request.dart';

abstract interface class RefundsRepository {
  Future<RefundPageResult> getMyRefunds({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
    String? orderId,
  });
  Future<RefundRequestResponse> getRefundDetail(int id);
  Future<RefundRequestResponse> attachBankAccount({
    required int id,
    required int bankAccountId,
  });
}
