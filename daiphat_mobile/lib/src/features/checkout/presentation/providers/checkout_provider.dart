import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/order_service.dart';
import '../../data/transaction_service.dart';
import '../../models/order_type.dart';
import '../../models/transaction_type.dart';
import '../../../cart/providers/cart_provider.dart';

// ─── Dependencies ───────────────────────────────────────────────────────────

final orderServiceProvider = Provider<OrderService>((ref) {
  throw UnimplementedError('Must be overridden in main');
});

final transactionServiceProvider = Provider<TransactionService>((ref) {
  throw UnimplementedError('Must be overridden in main');
});

// ─── Enum options (fetch once) ──────────────────────────────────────────────

final receiveTypesProvider = FutureProvider<List<EnumOption>>((ref) {
  return ref.watch(orderServiceProvider).getOrderReceiveTypes();
});

final transactionTypesProvider = FutureProvider<List<EnumOption>>((ref) {
  return ref.watch(transactionServiceProvider).getTransactionTypes();
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
  });

  CheckoutState copyWith({
    String? name,
    String? phone,
    String? expectedPickupAt,
    String? note,
    String? selectedReceiveType,
    String? selectedTransactionType,
    bool? isSubmitting,
    String? errorMessage,
    String? checkoutUrl,
    String? orderId,
  }) {
    return CheckoutState(
      name: name ?? this.name,
      phone: phone ?? this.phone,
      expectedPickupAt: expectedPickupAt ?? this.expectedPickupAt,
      note: note ?? this.note,
      selectedReceiveType: selectedReceiveType ?? this.selectedReceiveType,
      selectedTransactionType:
          selectedTransactionType ?? this.selectedTransactionType,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: errorMessage,
      checkoutUrl: checkoutUrl ?? this.checkoutUrl,
      orderId: orderId ?? this.orderId,
    );
  }

  bool get isValid =>
      name.trim().isNotEmpty &&
      phone.trim().isNotEmpty &&
      expectedPickupAt != null;
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
  void setNote(String value) => state = state.copyWith(note: value);

  void setSelectedReceiveType(String value) =>
      state = state.copyWith(selectedReceiveType: value);

  void setSelectedTransactionType(String value) =>
      state = state.copyWith(selectedTransactionType: value);

  void clearError() => state = state.copyWith(errorMessage: null);

  Future<bool> submitOrder() async {
    if (!state.isValid) {
      state = state.copyWith(
        errorMessage:
            'Vui lòng điền đầy đủ thông tin bắt buộc (Tên, SĐT, Giờ đến lấy)!',
      );
      return false;
    }

    state = state.copyWith(isSubmitting: true, errorMessage: null);

    try {
      final items = ref.read(cartProvider);
      if (items.isEmpty) {
        state = state.copyWith(
          isSubmitting: false,
          errorMessage: 'Giỏ hàng trống!',
        );
        return false;
      }

      final orderService = ref.read(orderServiceProvider);
      final transactionService = ref.read(transactionServiceProvider);

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

      final orderResponse = await orderService.createOnlineOrder(request);

      // 2. Check if online payment
      final transactionId = orderResponse.transactions?.firstOrNull?.id;

      if (state.selectedTransactionType == 'ONLINE' && transactionId != null) {
        // Process payment → get PayOS checkout URL
        final paymentResult = await transactionService.processPayment(
          orderId: orderResponse.id,
          request: ProcessPaymentRequest(
            transactionId: transactionId,
            gateway: PaymentGateway.payos.value,
          ),
        );

        if (paymentResult.checkoutUrl != null &&
            paymentResult.checkoutUrl!.isNotEmpty) {
          // Do NOT clear cart here – caller will clear after navigation
          state = state.copyWith(
            checkoutUrl: paymentResult.checkoutUrl,
            orderId: orderResponse.id,
            isSubmitting: false,
          );
          return true;
        } else {
          state = state.copyWith(
            isSubmitting: false,
            errorMessage: 'Không lấy được đường dẫn thanh toán',
          );
          return false;
        }
      } else {
        // Offline / cash payment – clear cart immediately
        ref.read(cartProvider.notifier).clearCart();
        state = state.copyWith(isSubmitting: false);
        return true;
      }
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: e.toString().replaceFirst('Exception: ', ''),
      );
      return false;
    }
  }

  void reset() {
    state = const CheckoutState();
  }
}

final checkoutProvider = NotifierProvider<CheckoutNotifier, CheckoutState>(
  CheckoutNotifier.new,
);
