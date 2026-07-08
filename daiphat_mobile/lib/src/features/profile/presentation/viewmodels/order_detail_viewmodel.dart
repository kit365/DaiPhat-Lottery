import 'dart:async';
import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/features/checkout/data/order_service.dart';
import 'package:daiphat_mobile/src/features/checkout/data/transaction_service.dart';
import 'package:daiphat_mobile/src/features/checkout/models/order_type.dart';
import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/features/checkout/models/transaction_type.dart';

class OrderDetailViewModel extends ChangeNotifier {
  final OrderService _orderService;
  final TransactionService _transactionService;
  final String orderId;

  OrderResponse? _order;
  bool _isLoading = false;
  String? _error;
  bool _isProcessingPayment = false;
  bool _isCancelling = false;
  bool _isRefunding = false;

  int _remainingSeconds = 0;
  Timer? _countdownTimer;

  OrderDetailViewModel({
    required OrderService orderService,
    required TransactionService transactionService,
    required this.orderId,
  })  : _orderService = orderService,
        _transactionService = transactionService {
    fetchOrderDetail();
  }

  OrderResponse? get order => _order;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isProcessingPayment => _isProcessingPayment;
  bool get isCancelling => _isCancelling;
  bool get isRefunding => _isRefunding;
  int get remainingSeconds => _remainingSeconds;
  bool get isExpired => _remainingSeconds <= 0;
  bool get isPendingPayment => _order?.status == 'PENDING_PAYMENT';
  bool get isCancelled => _order?.status == 'CANCELLED';
  bool get isCancellable => _order?.status == 'PAID';
  bool get isRefundable {
    final order = _order;
    if (order == null) return false;
    if (!const {'PAID', 'PREPARING', 'PENDING_PICKUP'}.contains(order.status)) {
      return false;
    }
    if (order.refundEligible == true) return true;
    if ((order.refundRemainingSeconds ?? 0) > 0) return true;
    return isRefundWindowOpen(
      refundDeadlineAt: order.refundDeadlineAt,
      paymentSuccessAt: order.refundPaymentSuccessAt,
      graceMinutes: order.refundGraceMinutes,
      remainingSeconds: order.refundRemainingSeconds,
    );
  }

  Future<void> fetchOrderDetail() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _order = await _orderService.getMyOrderDetail(orderId);
      _initCountdown();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _initCountdown() {
    _countdownTimer?.cancel();
    if (_order == null ||
        _order!.status != 'PENDING_PAYMENT' ||
        _order!.createdAt == null) {
      return;
    }

    try {
      final createdAt = DateTime.parse(_order!.createdAt!).toUtc();
      final expiresAt = createdAt.add(const Duration(minutes: 15));
      final diff = expiresAt.difference(DateTime.now().toUtc()).inSeconds;
      _remainingSeconds = diff > 0 ? diff : 0;
    } catch (_) {
      _remainingSeconds = 0;
    }

    if (_remainingSeconds <= 0) return;

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_remainingSeconds > 0) _remainingSeconds--;
      notifyListeners();
    });
  }

  Future<bool> cancelOrder() async {
    if (_order == null) return false;
    _isCancelling = true;
    notifyListeners();
    try {
      await _orderService.cancelOrder(_order!.id);
      await fetchOrderDetail();
      return true;
    } catch (_) {
      return false;
    } finally {
      _isCancelling = false;
      notifyListeners();
    }
  }

  Future<OrderRefundEligibilityResponse> getRefundEligibility() async {
    if (_order == null) {
      throw Exception('Không tìm thấy thông tin đơn hàng');
    }
    return _orderService.getRefundEligibility(_order!.id);
  }

  Future<bool> requestRefund(CreateOrderRefundRequest request) async {
    if (_order == null) return false;
    _isRefunding = true;
    notifyListeners();
    try {
      await _orderService.requestOrderRefund(_order!.id, request);
      await fetchOrderDetail();
      return true;
    } catch (_) {
      return false;
    } finally {
      _isRefunding = false;
      notifyListeners();
    }
  }

  Future<String?> getCheckoutUrl() async {
    if (_order == null) return null;
    final transactions = _order!.transactions;
    if (transactions == null || transactions.isEmpty) return null;

    final tx = transactions.firstWhere(
      (t) => t.status == 'PENDING',
      orElse: () => transactions.first,
    );

    _isProcessingPayment = true;
    notifyListeners();

    try {
      final result = await _transactionService.processPayment(
        orderId: _order!.id,
        request: ProcessPaymentRequest(
          transactionId: tx.id,
          gateway: 'PAYOS',
        ),
      );
      return result.checkoutUrl;
    } catch (_) {
      return null;
    } finally {
      _isProcessingPayment = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }
}
