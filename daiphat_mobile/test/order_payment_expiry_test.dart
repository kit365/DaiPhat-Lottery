import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/features/checkout/data/transaction_service.dart';
import 'package:daiphat_mobile/src/features/checkout/models/transaction_type.dart';
import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';
import 'package:daiphat_mobile/src/features/orders/domain/usecases/get_my_order_detail.dart';
import 'package:daiphat_mobile/src/features/orders/domain/usecases/get_order_refund_eligibility.dart';
import 'package:daiphat_mobile/src/features/orders/domain/usecases/request_order_refund.dart';
import 'package:daiphat_mobile/src/features/orders/presentation/viewmodels/order_detail_viewmodel.dart';
import 'package:daiphat_mobile/src/features/refunds/domain/usecases/refund_usecases.dart';

class Detail extends Fake implements GetMyOrderDetail {
  String status = 'PENDING_PAYMENT';
  int calls = 0;
  bool fail = false;
  Completer<OrderResponse>? pending;
  @override
  Future<OrderResponse> call(String id) async {
    calls++;
    if (fail) throw Exception('offline');
    if (pending != null) return pending!.future;
    return OrderResponse(
      id: id,
      orderCode: 'DP1',
      totalAmount: 10000,
      status: status,
    );
  }
}

class Transactions extends Fake implements TransactionService {
  int seconds = 1;
  bool fail = false;
  @override
  Future<PendingPaymentCountdownResult> getPendingPaymentCountdown(
    String id,
  ) async {
    if (fail) throw Exception('offline');
    return PendingPaymentCountdownResult(
      orderId: id,
      remainingSeconds: seconds,
      expired: seconds == 0,
    );
  }
}

class Eligibility extends Fake implements GetOrderRefundEligibility {}

class Refund extends Fake implements RequestOrderRefund {}

class Refunds extends Fake implements GetMyRefunds {}

void main() {
  late Detail detail;
  late Transactions transactions;
  OrderDetailViewModel create() => OrderDetailViewModel(
    getMyOrderDetail: detail,
    getOrderRefundEligibility: Eligibility(),
    requestOrderRefund: Refund(),
    transactionService: transactions,
    getMyRefunds: Refunds(),
    orderId: 'order',
    now: () => TestWidgetsFlutterBinding.instance.clock.now(),
  );
  setUp(() {
    detail = Detail();
    transactions = Transactions();
  });
  for (final status in ['CANCELLED', 'PAID']) {
    testWidgets('checks delayed status until $status then stops', (
      tester,
    ) async {
      final vm = create();
      await tester.pump();
      expect(vm.isPendingPayment, true);
      transactions.seconds = 0;
      await tester.pump(const Duration(seconds: 1));
      expect(vm.isConfirmingPayment, true);
      for (var i = 0; i < 24; i++) {
        await tester.pump(const Duration(seconds: 5));
      }
      expect(vm.order!.status, 'PENDING_PAYMENT');
      detail.status = status;
      await tester.pump(const Duration(seconds: 5));
      expect(vm.order!.status, status);
      expect(vm.isConfirmingPayment, false);
      final calls = detail.calls;
      await tester.pump(const Duration(seconds: 15));
      expect(detail.calls, calls);
      vm.dispose();
    });
  }
  testWidgets('recovers countdown and status after network errors', (
    tester,
  ) async {
    transactions.fail = true;
    final vm = create();
    await tester.pump();
    expect(vm.isConfirmingPayment, true);
    detail.fail = true;
    await tester.pump(const Duration(seconds: 5));
    detail.fail = false;
    transactions.fail = false;
    transactions.seconds = 30;
    await tester.pump(const Duration(seconds: 5));
    expect(vm.remainingSeconds, 30);
    expect(vm.isPendingPayment, true);
    vm.dispose();
  });
  testWidgets('dispose ignores in-flight status and stops retries', (
    tester,
  ) async {
    transactions.seconds = 0;
    final vm = create();
    await tester.pump();
    detail.pending = Completer<OrderResponse>();
    await tester.pump(const Duration(seconds: 5));
    final calls = detail.calls;
    vm.dispose();
    detail.pending!.complete(
      const OrderResponse(
        id: 'order',
        orderCode: 'DP1',
        totalAmount: 10000,
        status: 'CANCELLED',
      ),
    );
    await tester.pump(const Duration(seconds: 20));
    expect(detail.calls, calls);
    expect(tester.takeException(), isNull);
  });
}
