import 'package:flutter_test/flutter_test.dart';

import 'package:daiphat_mobile/src/shared/domain/entities/pagination_meta.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/domain/entities/prize_payout_request.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/domain/repositories/prize_payouts_repository.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/domain/usecases/prize_payout_usecases.dart';

class _FakePrizePayoutsRepository implements PrizePayoutsRepository {
  int? orderDetailId;
  int? serialId;
  int? bankAccountId;
  int? requestId;

  final payout = const PrizePayoutRequestResponse(
    id: 23,
    requestCode: 'TT-23',
    grossAmount: 100000,
    status: PrizePayoutRequestStatus.pending,
  );

  @override
  Future<PrizePayoutRequestResponse> cancel(int id) async {
    requestId = id;
    return payout;
  }

  @override
  Future<PrizePayoutRequestResult> create({
    int? orderDetailId,
    int? serialId,
    required int bankAccountId,
  }) async {
    this.orderDetailId = orderDetailId;
    this.serialId = serialId;
    this.bankAccountId = bankAccountId;
    return const PrizePayoutRequestResult(
      id: 23,
      requestCode: 'TT-23',
      status: 'PENDING',
    );
  }

  @override
  Future<PrizePayoutRequestResponse> getById(int id) async {
    requestId = id;
    return payout;
  }

  @override
  Future<PrizePayoutPageResult> getMyRequests({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
  }) async => PrizePayoutPageResult(
    records: [payout],
    pagination: const PaginationMeta(
      totalRecords: 1,
      totalPages: 1,
      currentPage: 1,
      limit: 10,
      isLast: true,
    ),
    statusCounts: const {'PENDING': 1},
  );

  @override
  Future<PrizePayoutPreview> preview({int? orderDetailId, int? serialId}) async {
    this.orderDetailId = orderDetailId;
    this.serialId = serialId;
    return const PrizePayoutPreview(
      orderDetailId: 42,
      serialId: 7,
      grossAmount: 100000,
      taxAmount: 0,
      commissionAmount: 0,
      netAmount: 100000,
      canClaimOnline: true,
    );
  }
}

void main() {
  test('prize payout parser preserves detail route id and status', () {
    final payout = PrizePayoutRequestResponse.fromJson({
      'id': 23,
      'requestCode': 'TT-23',
      'grossAmount': 100000,
      'status': 'APPROVED',
    });

    expect(payout.id, 23);
    expect(payout.requestCode, 'TT-23');
    expect(payout.status, PrizePayoutRequestStatus.approved);
  });

  test('prize payout use cases preserve ticket and bank identifiers', () async {
    final repository = _FakePrizePayoutsRepository();

    await PreviewPrizePayout(repository)(orderDetailId: 42, serialId: 7);
    await CreatePrizePayout(repository)(
      orderDetailId: 42,
      serialId: 7,
      bankAccountId: 9,
    );
    await CancelPrizePayout(repository)(23);

    expect(repository.orderDetailId, 42);
    expect(repository.serialId, 7);
    expect(repository.bankAccountId, 9);
    expect(repository.requestId, 23);
  });
}
