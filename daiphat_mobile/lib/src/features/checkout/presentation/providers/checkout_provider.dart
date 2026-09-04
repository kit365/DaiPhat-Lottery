import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/system_config_service.dart';
import '../../data/order_service.dart';
import '../../data/transaction_service.dart';
import '../../domain/repositories/order_repository.dart';
import '../../domain/repositories/transaction_repository.dart';
import '../../domain/usecases/create_online_order.dart';
import '../../domain/usecases/process_payment.dart';
import '../../models/order_type.dart';
import '../../models/transaction_type.dart';
import '../../../cart/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import 'package:daiphat_mobile/src/shared/utils/api_error_message.dart';

// ─── Dependencies ───────────────────────────────────────────────────────────

// Transitional providers for profile screens that have not migrated yet.
final orderServiceProvider = Provider<OrderService>((ref) {
  throw UnimplementedError('Must be overridden in main');
});

final transactionServiceProvider = Provider<TransactionService>((ref) {
  throw UnimplementedError('Must be overridden in main');
});

final orderRepositoryProvider = Provider<OrderRepository>((ref) {
  throw UnimplementedError('Must be overridden in main');
});

final transactionRepositoryProvider = Provider<TransactionRepository>((ref) {
  throw UnimplementedError('Must be overridden in main');
});

final createOnlineOrderProvider = Provider<CreateOnlineOrder>((ref) {
  return CreateOnlineOrder(ref.watch(orderRepositoryProvider));
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
    final types =
        await ref.watch(orderRepositoryProvider).getOrderReceiveTypes();
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
    final types =
        await ref.watch(transactionRepositoryProvider).getTransactionTypes();
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
    bool clearExpectedPickupAt = false,
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
      expectedPickupAt:
          clearExpectedPickupAt ? null : (expectedPickupAt ?? this.expectedPickupAt),
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

  Future<bool> submitOrder() async {
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

    try {
      final items = ref.read(checkoutItemsProvider);
      if (items.isEmpty) {
        state = state.copyWith(
          isSubmitting: false,
          errorMessage: 'Không có vé để thanh toán!',
        );
        return false;
      }

      final createOnlineOrder = ref.read(createOnlineOrderProvider);
      final processPayment = ref.read(processPaymentProvider);

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

      final orderResponse = await createOnlineOrder(request);

      // 2. Check if online payment
      final transactionId = orderResponse.transactions?.firstOrNull?.id;

      if (state.selectedTransactionType == 'ONLINE' && transactionId != null) {
        // Process payment → get PayOS checkout URL
        final paymentResult = await processPayment(
          orderId: orderResponse.id,
          request: ProcessPaymentRequest(
            transactionId: transactionId,
            gateway: PaymentGateway.payos.value,
          ),
        );

        if (paymentResult.checkoutUrl != null &&
            paymentResult.checkoutUrl!.isNotEmpty) {
          // Do NOT clear cart here – caller will finalize after navigation
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
        // Offline / cash payment – cập nhật giỏ ngay
        _finalizePurchasedItems();
        state = state.copyWith(isSubmitting: false);
        return true;
      }
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: toUserFacingApiMessage(e),
      );
      return false;
    }
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

  void finalizeAfterOnlinePayment() => _finalizePurchasedItems();

  void reset() {
    state = const CheckoutState();
  }
}

final checkoutProvider = NotifierProvider<CheckoutNotifier, CheckoutState>(
  CheckoutNotifier.new,
);
