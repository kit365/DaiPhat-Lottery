import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/system_config_service.dart';
import '../../data/transaction_service.dart';
import '../../domain/repositories/transaction_repository.dart';
import '../../domain/usecases/create_online_order.dart';
import '../../domain/usecases/process_payment.dart';
import '../../models/transaction_type.dart';
import '../../../cart/presentation/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';
import 'package:daiphat_mobile/src/features/orders/presentation/providers/orders_providers.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/utils/api_error_message.dart';

// ─── Dependencies ───────────────────────────────────────────────────────────

final transactionServiceProvider = Provider<TransactionService>((ref) {
  throw UnimplementedError('Must be overridden in main');
});

final transactionRepositoryProvider = Provider<TransactionRepository>((ref) {
  throw UnimplementedError('Must be overridden in main');
});

final createOnlineOrderProvider = Provider<CreateOnlineOrder>((ref) {
  return CreateOnlineOrder(ref.watch(ordersRepositoryProvider));
});

final processPaymentProvider = Provider<ProcessPayment>((ref) {
  return ProcessPayment(ref.watch(transactionRepositoryProvider));
});

final systemConfigServiceProvider = Provider<SystemConfigService>((ref) {
  final client = ref.watch(apiClientProvider);
  return SystemConfigService(apiClient: client);
});

final operatingHoursProvider = FutureProvider.autoDispose<SiteOperatingHours>((
  ref,
) async {
  final service = ref.watch(systemConfigServiceProvider);
  return service.getOperatingHours();
});

// ─── Enum options (fetch once) ──────────────────────────────────────────────

/// Mobile chỉ hỗ trợ nhận tại quầy + thanh toán online.
const defaultReceiveTypes = [
  EnumOption(value: 'COUNTER_PICKUP', label: 'Nhận tại quầy'),
];

const defaultTransactionTypes = [
  EnumOption(value: 'ONLINE', label: 'Chuyển khoản'),
];

final receiveTypesProvider = FutureProvider.autoDispose<List<EnumOption>>((
  ref,
) async {
  try {
    final types = await ref
        .watch(ordersRepositoryProvider)
        .getOrderReceiveTypes();
    if (types.isNotEmpty) return types;
  } catch (_) {
    // Fallback để không khóa màn thanh toán khi API/session lỗi tạm thời.
  }
  return defaultReceiveTypes;
});

final transactionTypesProvider = FutureProvider.autoDispose<List<EnumOption>>((
  ref,
) async {
  try {
    final types = await ref
        .watch(transactionRepositoryProvider)
        .getTransactionTypes();
    if (types.isNotEmpty) return types;
  } catch (_) {
    // Fallback: mobile chỉ dùng ONLINE.
  }
  return defaultTransactionTypes;
});

// ─── Checkout state ─────────────────────────────────────────────────────────

class CheckoutState {
  final String name;
  final String phone;
  final String? expectedPickupAt;
  final String note;
  final String? selectedReceiveType;
  final String? selectedTransactionType;
  final bool isSubmitting;
  final String? errorMessage;
  final String? checkoutUrl;
  final String? orderId;
  final String? orderCode;
  final String? pendingPaymentOrderId;
  final String? pendingPaymentOrderCode;
  final int? pendingPaymentTransactionId;
  final bool creationOutcomeUnknown;

  const CheckoutState({
    this.name = '',
    this.phone = '',
    this.expectedPickupAt,
    this.note = '',
    this.selectedReceiveType,
    this.selectedTransactionType,
    this.isSubmitting = false,
    this.errorMessage,
    this.checkoutUrl,
    this.orderId,
    this.orderCode,
    this.pendingPaymentOrderId,
    this.pendingPaymentOrderCode,
    this.pendingPaymentTransactionId,
    this.creationOutcomeUnknown = false,
  });

  CheckoutState copyWith({
    String? name,
    String? phone,
    String? expectedPickupAt,
    bool clearExpectedPickupAt = false,
    String? note,
    String? selectedReceiveType,
    String? selectedTransactionType,
    bool? isSubmitting,
    String? errorMessage,
    String? checkoutUrl,
    String? orderId,
    String? orderCode,
    bool clearCheckoutResult = false,
    String? pendingPaymentOrderId,
    String? pendingPaymentOrderCode,
    int? pendingPaymentTransactionId,
    bool clearPendingPayment = false,
    bool? creationOutcomeUnknown,
  }) {
    return CheckoutState(
      name: name ?? this.name,
      phone: phone ?? this.phone,
      expectedPickupAt: clearExpectedPickupAt
          ? null
          : (expectedPickupAt ?? this.expectedPickupAt),
      note: note ?? this.note,
      selectedReceiveType: selectedReceiveType ?? this.selectedReceiveType,
      selectedTransactionType:
          selectedTransactionType ?? this.selectedTransactionType,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: errorMessage,
      checkoutUrl: clearCheckoutResult
          ? null
          : (checkoutUrl ?? this.checkoutUrl),
      orderId: clearCheckoutResult ? null : (orderId ?? this.orderId),
      orderCode: clearCheckoutResult ? null : (orderCode ?? this.orderCode),
      pendingPaymentOrderId: clearPendingPayment
          ? null
          : (pendingPaymentOrderId ?? this.pendingPaymentOrderId),
      pendingPaymentOrderCode: clearPendingPayment
          ? null
          : (pendingPaymentOrderCode ?? this.pendingPaymentOrderCode),
      pendingPaymentTransactionId: clearPendingPayment
          ? null
          : (pendingPaymentTransactionId ?? this.pendingPaymentTransactionId),
      creationOutcomeUnknown:
          creationOutcomeUnknown ?? this.creationOutcomeUnknown,
    );
  }

  bool get isValid =>
      name.trim().isNotEmpty &&
      phone.trim().isNotEmpty &&
      expectedPickupAt != null &&
      expectedPickupAt!.isNotEmpty &&
      selectedReceiveType != null &&
      selectedTransactionType != null;
}

class CheckoutNotifier extends Notifier<CheckoutState> {
  @override
  CheckoutState build() {
    return const CheckoutState();
  }

  Future<void> loadUserProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedName = prefs.getString('user_name') ?? '';
      final savedPhone = prefs.getString('user_phone') ?? '';
      if (savedName.isNotEmpty || savedPhone.isNotEmpty) {
        state = state.copyWith(name: savedName, phone: savedPhone);
      }
    } catch (_) {}
  }

  void setName(String value) => state = state.copyWith(name: value);
  void setPhone(String value) => state = state.copyWith(phone: value);
  void setExpectedPickupAt(String value) =>
      state = state.copyWith(expectedPickupAt: value);

  void clearExpectedPickupAt() =>
      state = state.copyWith(clearExpectedPickupAt: true);

  void setNote(String value) => state = state.copyWith(note: value);

  void setSelectedReceiveType(String value) =>
      state = state.copyWith(selectedReceiveType: value);

  void setSelectedTransactionType(String value) =>
      state = state.copyWith(selectedTransactionType: value);

  void clearError() => state = state.copyWith(errorMessage: null);

  void beginCheckout() {
    state = state.copyWith(
      clearCheckoutResult: true,
      clearPendingPayment: true,
      creationOutcomeUnknown: false,
      errorMessage: null,
    );
  }

  Future<bool> submitOrder() async {
    state = state.copyWith(clearCheckoutResult: true, errorMessage: null);

    if (state.creationOutcomeUnknown) {
      state = state.copyWith(
        errorMessage:
            'Chưa xác định được trạng thái đơn vừa tạo. Vui lòng kiểm tra mục Đơn hàng trước khi thử lại.',
      );
      return false;
    }

    if (!state.isValid) {
      state = state.copyWith(
        errorMessage:
            'Vui lòng điền đầy đủ thông tin thanh toán (Tên, SĐT, Giờ nhận vé, Phương thức nhận/thanh toán)!',
      );
      return false;
    }

    final token = ref.read(apiClientProvider).accessToken;
    if (token == null || token.isEmpty) {
      state = state.copyWith(
        errorMessage: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      );
      return false;
    }

    state = state.copyWith(isSubmitting: true, errorMessage: null);

    var awaitingCreateResponse = false;
    try {
      final pendingOrderId = state.pendingPaymentOrderId;
      final pendingTransactionId = state.pendingPaymentTransactionId;
      if (pendingOrderId != null && pendingTransactionId != null) {
        return await _processPendingPayment(
          orderId: pendingOrderId,
          orderCode: state.pendingPaymentOrderCode ?? '',
          transactionId: pendingTransactionId,
        );
      }

      final items = ref.read(checkoutItemsProvider);
      if (items.isEmpty) {
        state = state.copyWith(
          isSubmitting: false,
          errorMessage: 'Không có vé để thanh toán!',
        );
        return false;
      }

      final createOnlineOrder = ref.read(createOnlineOrderProvider);

      // 1. Create order
      final request = CreateOnlineOrderRequest(
        name: state.name.trim(),
        phone: state.phone.trim(),
        items: items
            .map(
              (item) => OrderItemRequest(
                lotteryTicketId: item.lotteryTicketId,
                quantity: item.quantity,
              ),
            )
            .toList(),
        receiveType: state.selectedReceiveType ?? 'COUNTER_PICKUP',
        expectedPickupAt: state.expectedPickupAt!,
        note: state.note.isNotEmpty ? state.note.trim() : null,
      );

      awaitingCreateResponse = true;
      final orderResponse = await createOnlineOrder(request);
      awaitingCreateResponse = false;

      // 2. Check if online payment
      final transactionId = orderResponse.transactions?.firstOrNull?.id;

      if (state.selectedTransactionType == 'ONLINE') {
        ref
            .read(cartProvider.notifier)
            .recordPendingPurchase(orderResponse.id, items);
        state = state.copyWith(
          orderId: orderResponse.id,
          orderCode: orderResponse.orderCode,
          pendingPaymentOrderId: orderResponse.id,
          pendingPaymentOrderCode: orderResponse.orderCode,
          pendingPaymentTransactionId: transactionId,
        );
        if (transactionId == null) {
          state = state.copyWith(
            isSubmitting: false,
            errorMessage:
                'Đơn đã được tạo nhưng chưa có giao dịch thanh toán. Vui lòng kiểm tra chi tiết đơn hàng.',
          );
          return false;
        }
        return _processPendingPayment(
          orderId: orderResponse.id,
          orderCode: orderResponse.orderCode,
          transactionId: transactionId,
        );
      } else {
        // Offline / cash payment – cập nhật giỏ ngay
        _finalizePurchasedItems();
        state = state.copyWith(
          orderId: orderResponse.id,
          orderCode: orderResponse.orderCode,
          isSubmitting: false,
        );
        return true;
      }
    } catch (e) {
      final unknownCreateOutcome =
          awaitingCreateResponse && _isUncertainCreateError(e);
      state = state.copyWith(
        isSubmitting: false,
        creationOutcomeUnknown: unknownCreateOutcome,
        errorMessage: unknownCreateOutcome
            ? 'Mất kết nối khi tạo đơn. Vui lòng kiểm tra mục Đơn hàng trước khi thử lại.'
            : toUserFacingApiMessage(e),
      );
      return false;
    }
  }

  bool _isUncertainCreateError(Object error) {
    if (error is! ApiException) return true;
    final statusCode = error.statusCode;
    return statusCode == null || statusCode >= 500;
  }

  Future<bool> _processPendingPayment({
    required String orderId,
    required String orderCode,
    required int transactionId,
  }) async {
    final paymentResult = await ref.read(processPaymentProvider)(
      orderId: orderId,
      request: ProcessPaymentRequest(
        transactionId: transactionId,
        gateway: PaymentGateway.payos.value,
      ),
    );

    final checkoutUrl = paymentResult.checkoutUrl?.trim() ?? '';
    if (checkoutUrl.isEmpty) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Không lấy được đường dẫn thanh toán',
      );
      return false;
    }

    state = state.copyWith(
      checkoutUrl: checkoutUrl,
      orderId: orderId,
      orderCode: orderCode,
      isSubmitting: false,
    );
    return true;
  }

  /// Mua ngay: chỉ trừ vé vừa mua khỏi giỏ chính. Checkout thường: xoá cả giỏ.
  void _finalizePurchasedItems() {
    final buyNow = ref.read(buyNowItemsProvider);
    if (buyNow != null) {
      ref.read(cartProvider.notifier).applyBuyNowPurchase(buyNow);
      ref.read(buyNowItemsProvider.notifier).clear();
    } else {
      ref.read(cartProvider.notifier).clearCart();
    }
  }

  void finalizeAfterConfirmedPayment(String orderId) {
    ref.read(cartProvider.notifier).finalizePendingPurchase(orderId);
    ref.read(buyNowItemsProvider.notifier).clear();
    state = state.copyWith(
      clearCheckoutResult: true,
      clearPendingPayment: true,
    );
  }

  void reset() {
    state = const CheckoutState();
  }
}

final checkoutProvider = NotifierProvider<CheckoutNotifier, CheckoutState>(
  CheckoutNotifier.new,
);
