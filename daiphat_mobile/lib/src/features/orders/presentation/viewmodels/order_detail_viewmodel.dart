import 'dart:async';

import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/features/checkout/data/transaction_service.dart';
import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';
import 'package:daiphat_mobile/src/features/refunds/domain/entities/refund_request.dart';
import 'package:daiphat_mobile/src/features/checkout/models/transaction_type.dart';
import 'package:daiphat_mobile/src/features/orders/domain/usecases/get_my_order_detail.dart';
import 'package:daiphat_mobile/src/features/orders/domain/usecases/get_order_refund_eligibility.dart';
import 'package:daiphat_mobile/src/features/orders/domain/usecases/request_order_refund.dart';
import 'package:daiphat_mobile/src/features/refunds/domain/usecases/refund_usecases.dart';

/// Chi tiết đơn — luồng hủy/hoàn tiền khớp web `OrderDetailTab`.
class OrderDetailViewModel extends ChangeNotifier {
  static const _refundCandidateStatuses = {
    'PAID',
    'PREPARING',
    'PENDING_PICKUP',
  };

  final GetMyOrderDetail _getMyOrderDetail;
  final GetOrderRefundEligibility _getOrderRefundEligibility;
  final RequestOrderRefund _requestOrderRefund;
  final TransactionService _transactionService;
  final GetMyRefunds _getMyRefunds;
  final String orderId;

  OrderResponse? _order;
  bool _isLoading = false;
  String? _error;
  bool _isProcessingPayment = false;
  bool _isRefunding = false;

  int _remainingSeconds = 0;
  Timer? _countdownTimer;

  OrderRefundEligibilityResponse? _eligibility;
  bool _isLoadingEligibility = false;
  int _refundSecondsLeft = 0;
  Timer? _refundCountdownTimer;
  RefundRequestResponse? _pendingFullOrderRefund;

  OrderDetailViewModel({
    required GetMyOrderDetail getMyOrderDetail,
    required GetOrderRefundEligibility getOrderRefundEligibility,
    required RequestOrderRefund requestOrderRefund,
    required TransactionService transactionService,
    required GetMyRefunds getMyRefunds,
    required this.orderId,
  })  : _getMyOrderDetail = getMyOrderDetail,
        _getOrderRefundEligibility = getOrderRefundEligibility,
        _requestOrderRefund = requestOrderRefund,
        _transactionService = transactionService,
        _getMyRefunds = getMyRefunds {
    fetchOrderDetail();
  }

  OrderResponse? get order => _order;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isProcessingPayment => _isProcessingPayment;
  bool get isRefunding => _isRefunding;
  int get remainingSeconds => _remainingSeconds;
  bool get isExpired => _remainingSeconds <= 0;
  bool get isPendingPayment => _order?.status == 'PENDING_PAYMENT';
  bool get isCancelled => _order?.status == 'CANCELLED';

  OrderRefundEligibilityResponse? get eligibility => _eligibility;
  bool get isLoadingEligibility => _isLoadingEligibility;
  int get refundSecondsLeft => _refundSecondsLeft;
  bool get isRefundLowTime =>
      _refundSecondsLeft > 0 && _refundSecondsLeft <= 5 * 60;
  bool get isRefundExpired => _refundSecondsLeft <= 0;
  RefundRequestResponse? get pendingFullOrderRefund => _pendingFullOrderRefund;

  bool get isRefundCandidate {
    final order = _order;
    if (order == null) return false;
    if (!_refundCandidateStatuses.contains(order.status)) return false;
    return _pendingFullOrderRefund == null;
  }

  bool get showRefundAction =>
      isRefundCandidate &&
      !_isLoadingEligibility &&
      (_eligibility?.eligible == true) &&
      !isRefundExpired;

  bool get showRefundUnavailable =>
      isRefundCandidate &&
      !_isLoadingEligibility &&
      ((_eligibility?.eligible != true) || isRefundExpired) &&
      _pendingFullOrderRefund == null;

  Future<void> fetchOrderDetail() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _order = await _getMyOrderDetail(orderId);
      _initPaymentCountdown();
      await _loadRefundContext();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _loadRefundContext() async {
    final order = _order;
    if (order == null) return;

    _pendingFullOrderRefund = null;
    _eligibility = null;
    _refundCountdownTimer?.cancel();
    _refundSecondsLeft = 0;

    try {
      final page = await _getMyRefunds(
        page: 1,
        limit: 50,
        orderId: order.id,
      );
      _pendingFullOrderRefund = _findPendingFullOrderRefund(page.records);
    } catch (_) {
      // Không chặn chi tiết đơn nếu danh sách hoàn lỗi tạm thời.
    }

    if (!isRefundCandidate) {
      notifyListeners();
      return;
    }

    _isLoadingEligibility = true;
    notifyListeners();
    try {
      _eligibility = await _getOrderRefundEligibility(order.id);
      _startRefundCountdown();
    } catch (_) {
      _eligibility = null;
    } finally {
      _isLoadingEligibility = false;
      notifyListeners();
    }
  }

  RefundRequestResponse? _findPendingFullOrderRefund(
    List<RefundRequestResponse> items,
  ) {
    for (final refund in items) {
      if (refund.refundType != RefundType.fullOrder) continue;
      if (refund.status == RefundRequestStatus.readyToPay ||
          refund.status == RefundRequestStatus.approved ||
          refund.status == RefundRequestStatus.waitingForInfo) {
        return refund;
      }
    }
    return null;
  }

  void _startRefundCountdown() {
    _refundCountdownTimer?.cancel();
    final eligibility = _eligibility;
    final order = _order;
    _refundSecondsLeft = computeRefundSecondsLeft(
      refundDeadlineAt: eligibility?.refundDeadlineAt ?? order?.refundDeadlineAt,
      paymentSuccessAt:
          eligibility?.paymentSuccessAt ?? order?.refundPaymentSuccessAt,
      graceMinutes: eligibility?.graceMinutes ?? order?.refundGraceMinutes,
      fallbackRemainingSeconds:
          eligibility?.remainingSeconds ?? order?.refundRemainingSeconds,
    );

    if (_refundSecondsLeft <= 0) return;

    _refundCountdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_refundSecondsLeft > 0) {
        _refundSecondsLeft--;
      } else {
        _refundCountdownTimer?.cancel();
      }
      notifyListeners();
    });
  }

  void _initPaymentCountdown() {
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

  Future<bool> requestRefund(CreateOrderRefundRequest request) async {
    if (_order == null) {
      throw Exception('Không tìm thấy thông tin đơn hàng');
    }
    _isRefunding = true;
    notifyListeners();
    try {
      await _requestOrderRefund(_order!.id, request);
      await fetchOrderDetail();
      return true;
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
    _refundCountdownTimer?.cancel();
    super.dispose();
  }
}
