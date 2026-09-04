import 'package:flutter_test/flutter_test.dart';

import 'package:daiphat_mobile/src/shared/domain/entities/pagination_meta.dart';
import 'package:daiphat_mobile/src/features/refunds/domain/entities/refund_request.dart';
import 'package:daiphat_mobile/src/features/refunds/domain/repositories/refunds_repository.dart';
import 'package:daiphat_mobile/src/features/refunds/domain/usecases/refund_usecases.dart';

class _FakeRefundsRepository implements RefundsRepository {
  int? requestedId;
  int? page;
  int? limit;
  String? status;
  String? search;
  String? orderId;
  int? bankAccountId;

  final refund = const RefundRequestResponse(
    id: 17,
    refundType: RefundType.fullOrder,
    status: RefundRequestStatus.waitingForInfo,
    refundAmount: 10000,
    refundReason: 'Test',
    createdAt: '2026-09-04T10:00:00Z',
    updatedAt: '2026-09-04T10:00:00Z',
  );

  @override
  Future<RefundPageResult> getMyRefunds({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
    String? orderId,
  }) async {
    this.page = page;
    this.limit = limit;
    this.status = status;
    this.search = search;
    this.orderId = orderId;
    return RefundPageResult(
      records: [refund],
      pagination: const PaginationMeta(
        totalRecords: 1,
        totalPages: 1,
        currentPage: 1,
        limit: 25,
        isLast: true,
      ),
      statusCounts: const {'WAITING_FOR_INFO': 1},
    );
  }

  @override
  Future<RefundRequestResponse> getRefundDetail(int id) async {
    requestedId = id;
    return refund;
  }

  @override
  Future<RefundRequestResponse> attachBankAccount({
    required int id,
    required int bankAccountId,
  }) async {
    requestedId = id;
    this.bankAccountId = bankAccountId;
    return refund;
  }
}

void main() {
  test('refund parser preserves identifiers, status, and bank account', () {
    final refund = RefundRequestResponse.fromJson({
      'id': 17,
      'refundType': 'FULL_ORDER',
      'status': 'WAITING_FOR_INFO',
      'refundAmount': 10000,
      'refundReason': 'Sai vé',
      'createdAt': '2026-09-04T10:00:00Z',
      'updatedAt': '2026-09-04T10:00:00Z',
      'bankAccount': {
        'id': 9,
        'bankName': 'Test Bank',
        'bankBin': '970000',
        'bankAccountNo': '123456',
        'bankAccountName': 'NGUYEN VAN A',
        'isDefault': true,
      },
    });

    expect(refund.id, 17);
    expect(refund.status, RefundRequestStatus.waitingForInfo);
    expect(refund.bankAccount?.id, 9);
  });

  test('refund use cases forward list filters and attach payload', () async {
    final repository = _FakeRefundsRepository();

    await GetMyRefunds(repository)(
      page: 2,
      limit: 25,
      status: 'APPROVED',
      search: 'DP123',
      orderId: 'order-uuid',
    );
    await AttachRefundBankAccount(repository)(id: 17, bankAccountId: 9);

    expect(repository.page, 2);
    expect(repository.limit, 25);
    expect(repository.status, 'APPROVED');
    expect(repository.search, 'DP123');
    expect(repository.orderId, 'order-uuid');
    expect(repository.requestedId, 17);
    expect(repository.bankAccountId, 9);
  });
}
