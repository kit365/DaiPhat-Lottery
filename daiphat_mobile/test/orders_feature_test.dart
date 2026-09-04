import 'package:flutter_test/flutter_test.dart';

import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/features/checkout/models/transaction_type.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';
import 'package:daiphat_mobile/src/features/orders/domain/repositories/orders_repository.dart';
import 'package:daiphat_mobile/src/features/orders/domain/usecases/get_my_order_detail.dart';
import 'package:daiphat_mobile/src/features/orders/domain/usecases/get_my_orders.dart';
import 'package:daiphat_mobile/src/features/orders/presentation/viewmodels/my_orders_viewmodel.dart';

class _FakeOrdersRepository implements OrdersRepository {
  String? detailId;
  int? page;
  int? size;
  String? status;
  String? search;
  String? sortBy;
  String? direction;

  final order = const OrderResponse(
    id: 'internal-order-uuid',
    orderCode: 'DP123',
    totalAmount: 10000,
    status: 'PAID',
  );

  @override
  Future<OrderResponse> createOnlineOrder(
    CreateOnlineOrderRequest request,
  ) async =>
      order;

  @override
  Future<List<EnumOption>> getOrderReceiveTypes() async => const [];

  @override
  Future<OrderResponse> getMyOrderDetail(String id) async {
    detailId = id;
    return order;
  }

  @override
  Future<OrdersPageResponse> getMyOrders({
    int page = 1,
    int size = 10,
    String? status,
    String? search,
    String sortBy = 'createdAt',
    String direction = 'desc',
  }) async {
    this.page = page;
    this.size = size;
    this.status = status;
    this.search = search;
    this.sortBy = sortBy;
    this.direction = direction;
    return OrdersPageResponse(
      records: [order],
      pagination: const PaginationMeta(
        totalRecords: 1,
        totalPages: 1,
        currentPage: 1,
        limit: 10,
        isLast: true,
      ),
    );
  }

  @override
  Future<OrderRefundEligibilityResponse> getRefundEligibility(
    String orderId,
  ) async {
    return const OrderRefundEligibilityResponse(
      eligible: false,
      graceMinutes: 0,
      refundTickets: [],
    );
  }

  @override
  Future<void> requestOrderRefund(
    String id,
    CreateOrderRefundRequest request,
  ) async {}
}

void main() {
  test('order parser keeps the internal id returned as orderId', () {
    final order = OrderResponse.fromJson({
      'id': '',
      'orderId': 'internal-order-uuid',
      'orderCode': 'DP123',
      'totalAmount': 10000,
      'status': 'PAID',
    });

    expect(order.id, 'internal-order-uuid');
  });

  test('a new checkout clears identifiers from the previous order', () {
    const previous = CheckoutState(
      checkoutUrl: 'https://pay.example/old',
      orderId: 'old-order-id',
      orderCode: 'DP-OLD',
    );

    final next = previous.copyWith(
      isSubmitting: true,
      clearCheckoutResult: true,
    );

    expect(next.checkoutUrl, isNull);
    expect(next.orderId, isNull);
    expect(next.orderCode, isNull);
    expect(next.isSubmitting, isTrue);
  });

  test('order detail use case forwards the internal id unchanged', () async {
    final repository = _FakeOrdersRepository();

    final order = await GetMyOrderDetail(repository)('internal-order-uuid');

    expect(repository.detailId, 'internal-order-uuid');
    expect(order.id, 'internal-order-uuid');
  });

  test('orders view model preserves list query behavior', () async {
    final repository = _FakeOrdersRepository();
    final viewModel = MyOrdersViewModel(GetMyOrders(repository));
    addTearDown(viewModel.dispose);

    await Future<void>.delayed(Duration.zero);
    expect(viewModel.orders, [repository.order]);
    expect(repository.page, 1);
    expect(repository.size, 10);
    expect(repository.sortBy, 'createdAt');
    expect(repository.direction, 'desc');

    viewModel.setSearch('DP 123');
    await Future<void>.delayed(Duration.zero);
    expect(repository.search, '123');
  });
}
