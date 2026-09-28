import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/features/auth/domain/entities/user.dart';
import 'package:daiphat_mobile/src/features/profile/domain/entities/update_profile_request.dart';
import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';
import 'package:daiphat_mobile/src/features/orders/domain/repositories/orders_repository.dart';
import 'package:daiphat_mobile/src/features/orders/presentation/providers/orders_providers.dart';
import 'package:daiphat_mobile/src/features/orders/presentation/widgets/payment_timeout_complaint_dialog.dart';
import 'package:daiphat_mobile/src/features/refunds/domain/entities/refund_request.dart';
import 'package:daiphat_mobile/src/features/checkout/models/transaction_type.dart';

class FakeOrdersRepository implements OrdersRepository {
  String? lastSubmittedOrderId;
  String? lastSubmittedFilePath;

  @override
  Future<OrderResponse> submitPaymentTimeoutComplaint(
    String orderId,
    String filePath,
  ) async {
    lastSubmittedOrderId = orderId;
    lastSubmittedFilePath = filePath;
    return OrderResponse(
      id: orderId,
      orderCode: 'ORD-12345',
      totalAmount: 50000,
      status: 'PAYMENT_COMPLAINT_PENDING',
      cancelType: 'SYSTEM_PAYMENT_TIMEOUT',
    );
  }

  @override
  Future<OrderResponse> createOnlineOrder(CreateOnlineOrderRequest request) =>
      throw UnimplementedError();
  @override
  Future<OrderResponse> getMyOrderDetail(String id) =>
      throw UnimplementedError();
  @override
  Future<OrdersPageResponse> getMyOrders({
    int page = 1,
    int size = 10,
    String? status,
    String? search,
    String sortBy = 'createdAt',
    String direction = 'desc',
  }) =>
      throw UnimplementedError();
  @override
  Future<List<EnumOption>> getOrderReceiveTypes() =>
      throw UnimplementedError();
  @override
  Future<OrderRefundEligibilityResponse> getRefundEligibility(String orderId) =>
      throw UnimplementedError();
  @override
  Future<void> requestOrderRefund(
    String id,
    CreateOrderRefundRequest request,
  ) =>
      throw UnimplementedError();
}

void main() {
  group('Profile Update Request Tests', () {
    test('User entity parses firstName and lastName correctly', () {
      final json = {
        'id': 'u1',
        'username': 'member',
        'email': 'member1@daiphat.com',
        'firstName': 'Phat Member1',
        'lastName': 'Dai1',
        'fullName': 'Dai1 Phat Member1',
        'phone': '0912345671',
        'dob': '2010-09-04',
        'gender': 'OTHER',
      };

      final user = User.fromJson(json);
      expect(user.firstName, 'Phat Member1');
      expect(user.lastName, 'Dai1');
      expect(user.phone, '0912345671');
      expect(user.dob, '2010-09-04');
      expect(user.gender, 'OTHER');
    });

    test('UpdateProfileRequest.toJson excludes email and serializes valid fields', () {
      const request = UpdateProfileRequest(
        firstName: 'Phat Member1',
        lastName: 'Dai1',
        phone: '0912345671',
        email: 'member1@daiphat.com', // Should NOT be in toJson
        dob: '2010-09-04',
        gender: 'OTHER',
      );

      final json = request.toJson();
      expect(json.containsKey('email'), isFalse);
      expect(json['firstName'], 'Phat Member1');
      expect(json['lastName'], 'Dai1');
      expect(json['phone'], '0912345671');
      expect(json['dob'], '2010-09-04');
      expect(json['gender'], 'OTHER');
    });
  });

  group('Order Complaint Model Tests', () {
    test('OrderResponse handles payment timeout cancellation and complaint flags', () {
      final orderJson = {
        'id': 'ord-1',
        'orderCode': 'ORD-20260927-49F960E9',
        'totalAmount': 100000,
        'status': 'CANCELLED',
        'cancelType': 'SYSTEM_PAYMENT_TIMEOUT',
        'cancelReason': 'Hết hạn thanh toán',
      };

      final order = OrderResponse.fromJson(orderJson);
      expect(order.isPaymentTimeoutCancellation, isTrue);
      expect(order.canSubmitPaymentTimeoutComplaint, isTrue);
      expect(order.isPaymentComplaintPending, isFalse);

      final pendingOrderJson = {
        'id': 'ord-1',
        'orderCode': 'ORD-20260927-49F960E9',
        'totalAmount': 100000,
        'status': 'PAYMENT_COMPLAINT_PENDING',
        'cancelType': 'SYSTEM_PAYMENT_TIMEOUT',
      };
      final pendingOrder = OrderResponse.fromJson(pendingOrderJson);
      expect(pendingOrder.canSubmitPaymentTimeoutComplaint, isFalse);
      expect(pendingOrder.isPaymentComplaintPending, isTrue);
    });
  });

  group('PaymentTimeoutComplaintDialog Widget Tests', () {
    testWidgets('renders modal header, notice box, upload container, and action buttons', (tester) async {
      final fakeRepo = FakeOrdersRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            ordersRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: PaymentTimeoutComplaintDialog(
                orderId: 'ord-1',
                orderCode: 'ORD-20260927-49F960E9',
                totalAmount: 100000,
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Header check
      expect(find.text('Gửi khiếu nại thanh toán'), findsWidgets);
      expect(
        find.text('Gửi chứng từ để cửa hàng kiểm tra giao dịch đã thanh toán.'),
        findsOneWidget,
      );

      // Notice box check (rendered using RichText)
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is RichText &&
              widget.text.toPlainText().contains('#ORD-20260927-49F960E9') &&
              widget.text.toPlainText().contains('100.000'),
        ),
        findsOneWidget,
      );

      // Upload box label & content check
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is RichText &&
              widget.text.toPlainText().contains('Ảnh biên lai thanh toán'),
        ),
        findsOneWidget,
      );
      expect(find.text('Chọn ảnh biên lai'), findsOneWidget);
      expect(find.text('JPG, PNG hoặc WEBP · tối đa 10MB'), findsOneWidget);

      // Buttons check
      expect(find.text('Hủy'), findsOneWidget);
      expect(find.text('Gửi khiếu nại'), findsOneWidget);
    });
  });
}
