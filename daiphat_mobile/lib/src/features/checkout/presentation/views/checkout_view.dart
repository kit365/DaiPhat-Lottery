import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/features/cart/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/features/cart/models/cart_item_model.dart';
import '../../models/transaction_type.dart';
import '../providers/checkout_provider.dart';

class CheckoutView extends ConsumerStatefulWidget {
  const CheckoutView({super.key});

  @override
  ConsumerState<CheckoutView> createState() => _CheckoutViewState();
}

class _CheckoutViewState extends ConsumerState<CheckoutView> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _dateController = TextEditingController();
  final _timeController = TextEditingController();
  final _noteController = TextEditingController();
  bool _initialLoadDone = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _dateController.dispose();
    _timeController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  void _initFromState(CheckoutState state) {
    if (_nameController.text != state.name) {
      _nameController.text = state.name;
    }
    if (_phoneController.text != state.phone) {
      _phoneController.text = state.phone;
    }
    if (_noteController.text != state.note) {
      _noteController.text = state.note;
    }
  }

  Future<void> _handleCheckout() async {
    final notifier = ref.read(checkoutProvider.notifier);
    final success = await notifier.submitOrder();

    if (!mounted) return;

    final checkoutState = ref.read(checkoutProvider);
    if (checkoutState.checkoutUrl != null) {
      // Open PayOS in-app WebView for payment
      // Clear cart AFTER navigation so prices don't flash to 0
      ref.read(cartProvider.notifier).clearCart();
      if (!mounted) return;
      context.pushNamed(
        AppRoute.paymentWebView.name,
        queryParameters: {'checkoutUrl': checkoutState.checkoutUrl!},
      );
    } else if (success) {
      // Offline payment success
      context.pushNamed(
        AppRoute.checkoutResult.name,
        queryParameters: {'code': '00', 'orderCode': ''},
      );
    }
    // If failed, error is already set in state - UI will show it
  }

  @override
  Widget build(BuildContext context) {
    final checkoutState = ref.watch(checkoutProvider);
    final receiveTypesAsync = ref.watch(receiveTypesProvider);
    final transactionTypesAsync = ref.watch(transactionTypesProvider);
    final cartItems = ref.watch(cartProvider);
    final cartTotal = ref.watch(cartTotalProvider);
    final cartSubtotal = ref.watch(cartSubtotalProvider);
    final cartTicketCount = ref.watch(cartTicketCountProvider);

    // Init form fields once
    if (!_initialLoadDone) {
      _initialLoadDone = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(checkoutProvider.notifier).loadUserProfile();
      });
    }
    // Sync controllers with state
    _initFromState(checkoutState);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F8),
      appBar: AppBar(
        title: const Text(
          'Thanh toán',
          style: TextStyle(
            color: Color(0xFF15213B),
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF15213B),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              children: [
                // ─── 1. DANH SÁCH VÉ ──────────────────────────
                _buildSectionTitle('1. Danh sách vé', number: 1),
                const SizedBox(height: 10),
                ...cartItems.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _CartItemCard(item: item),
                  ),
                ),
                const SizedBox(height: 24),

                // ─── 2. THÔNG TIN NHẬN VÉ ─────────────────────
                _buildSectionTitle('2. Thông tin nhận vé', number: 2),
                const SizedBox(height: 12),
                _buildUserInfoForm(checkoutState),
                const SizedBox(height: 16),

                // Receive types
                receiveTypesAsync.when(
                  data: (types) => _buildReceiveTypeSelector(
                    types,
                    checkoutState.selectedReceiveType,
                    (val) => ref
                        .read(checkoutProvider.notifier)
                        .setSelectedReceiveType(val),
                  ),
                  loading: () => const Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                  error: (e, _) => Text(
                    'Lỗi tải dữ liệu: $e',
                    style: const TextStyle(color: Colors.red, fontSize: 13),
                  ),
                ),
                const SizedBox(height: 24),

                // ─── 3. PHƯƠNG THỨC THANH TOÁN ───────────────
                _buildSectionTitle('3. Phương thức thanh toán', number: 3),
                const SizedBox(height: 12),
                transactionTypesAsync.when(
                  data: (types) => _buildPaymentMethodSelector(
                    types,
                    checkoutState.selectedTransactionType,
                    (val) => ref
                        .read(checkoutProvider.notifier)
                        .setSelectedTransactionType(val),
                  ),
                  loading: () => const Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                  error: (e, _) => Text(
                    'Lỗi tải dữ liệu: $e',
                    style: const TextStyle(color: Colors.red, fontSize: 13),
                  ),
                ),
                const SizedBox(height: 24),

                // ─── TÓM TẮT ĐƠN HÀNG ─────────────────────────
                _buildSectionTitle('Tóm tắt đơn hàng'),
                const SizedBox(height: 12),
                _buildOrderSummary(cartTicketCount, cartSubtotal, cartTotal),
                const SizedBox(height: 16),

                // Error message
                if (checkoutState.errorMessage != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.error_outline,
                            color: Colors.red.shade700,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              checkoutState.errorMessage!,
                              style: TextStyle(
                                color: Colors.red.shade700,
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.verified_user_rounded,
                      color: Color(0xFF22C55E),
                      size: 18,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Giao dịch được bảo mật và mã hóa an toàn',
                      style: TextStyle(
                        color: Color(0xFF6B7280),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),

          // ─── BOTTOM BAR ─────────────────────────────────────
          _buildBottomBar(
            total: cartTotal,
            isSubmitting: checkoutState.isSubmitting,
            onCheckout: _handleCheckout,
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title, {int? number}) {
    return Row(
      children: [
        if (number != null) ...[
          Container(
            width: 24,
            height: 24,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '$number',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
        Text(
          title,
          style: const TextStyle(
            color: Color(0xFF15213B),
            fontSize: 16,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }

  Widget _buildUserInfoForm(CheckoutState state) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        children: [
          TextField(
            controller: _nameController,
            onChanged: (v) => ref.read(checkoutProvider.notifier).setName(v),
            decoration: const InputDecoration(
              labelText: 'Họ và tên *',
              hintText: 'Nhập họ và tên',
              prefixIcon: Icon(Icons.person_outline),
              border: OutlineInputBorder(),
            ),
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneController,
            onChanged: (v) => ref.read(checkoutProvider.notifier).setPhone(v),
            decoration: const InputDecoration(
              labelText: 'Số điện thoại *',
              hintText: 'Nhập số điện thoại',
              prefixIcon: Icon(Icons.phone_outlined),
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.phone,
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 12),
          _buildDateTimeInputs(state),
          const SizedBox(height: 12),
          TextField(
            controller: _noteController,
            onChanged: (v) => ref.read(checkoutProvider.notifier).setNote(v),
            decoration: const InputDecoration(
              labelText: 'Ghi chú',
              hintText: 'VD: Tới lấy vào giờ nghỉ trưa...',
              prefixIcon: Icon(Icons.note_outlined),
              border: OutlineInputBorder(),
            ),
            textInputAction: TextInputAction.done,
          ),
        ],
      ),
    );
  }

  Widget _buildDateTimeInputs(CheckoutState state) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _dateController,
            onChanged: (v) => _updatePickupDateTime(),
            decoration: const InputDecoration(
              labelText: 'Ngày đến lấy *',
              hintText: '2026-06-16',
              prefixIcon: Icon(Icons.calendar_today),
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.datetime,
            textInputAction: TextInputAction.next,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: TextField(
            controller: _timeController,
            onChanged: (v) => _updatePickupDateTime(),
            decoration: const InputDecoration(
              labelText: 'Giờ đến lấy *',
              hintText: '14:30',
              prefixIcon: Icon(Icons.access_time),
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.datetime,
            textInputAction: TextInputAction.done,
          ),
        ),
      ],
    );
  }

  void _updatePickupDateTime() {
    final dateStr = _dateController.text.trim();
    final timeStr = _timeController.text.trim();
    if (dateStr.isEmpty || timeStr.isEmpty) return;

    try {
      final iso = DateTime.parse('${dateStr}T${timeStr}:00').toIso8601String();
      ref.read(checkoutProvider.notifier).setExpectedPickupAt(iso);
    } catch (_) {
      // Invalid date/time format, ignore
    }
  }

  Widget _buildReceiveTypeSelector(
    List<EnumOption> types,
    String? selected,
    Function(String) onSelect,
  ) {
    return Container(
      decoration: _cardDecoration(),
      child: Column(
        children: types.map((type) {
          final isSelected = selected == type.value;
          return Column(
            children: [
              if (types.indexOf(type) > 0)
                const Divider(height: 1, color: Color(0xFFF1F3F5)),
              InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => onSelect(type.value),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(
                        type.value == 'COUNTER_PICKUP'
                            ? Icons.store_rounded
                            : Icons.local_shipping_outlined,
                        color: isSelected
                            ? AppColors.primary
                            : const Color(0xFFD1D5DB),
                        size: 26,
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              type.label,
                              style: TextStyle(
                                color: isSelected
                                    ? AppColors.primary
                                    : const Color(0xFF15213B),
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            if (type.value == 'COUNTER_PICKUP')
                              const Text(
                                'Đến trực tiếp quầy giao dịch Đại Phát để nhận vé giấy',
                                style: TextStyle(
                                  color: Color(0xFF6B7280),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                          ],
                        ),
                      ),
                      _radio(isSelected),
                    ],
                  ),
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildPaymentMethodSelector(
    List<EnumOption> types,
    String? selected,
    Function(String) onSelect,
  ) {
    return Container(
      decoration: _cardDecoration(),
      child: Column(
        children: types.map((type) {
          final isSelected = selected == type.value;
          return Column(
            children: [
              if (types.indexOf(type) > 0)
                const Divider(height: 1, color: Color(0xFFF1F3F5)),
              InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => onSelect(type.value),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(
                        type.value == 'ONLINE'
                            ? Icons.qr_code_scanner_rounded
                            : Icons.money_rounded,
                        color: isSelected
                            ? AppColors.primary
                            : const Color(0xFFD1D5DB),
                        size: 26,
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              type.label,
                              style: TextStyle(
                                color: isSelected
                                    ? AppColors.primary
                                    : const Color(0xFF15213B),
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              type.value == 'ONLINE'
                                  ? 'Quét mã QR bằng ứng dụng ngân hàng (24/7)'
                                  : 'Thanh toán bằng tiền mặt khi nhận vé tại quầy',
                              style: const TextStyle(
                                color: Color(0xFF6B7280),
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      _radio(isSelected),
                    ],
                  ),
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildOrderSummary(int ticketCount, int subtotal, int total) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: _cardDecoration(),
      child: Column(
        children: [
          _summaryRow('Số lượng vé', '$ticketCount vé'),
          const SizedBox(height: 12),
          _summaryRow('Tạm tính', _money(subtotal)),
          const Divider(height: 24, color: Color(0xFFF1F3F5)),
          _summaryRow('Tổng cộng', _money(total), highlight: true),
        ],
      ),
    );
  }

  Widget _buildBottomBar({
    required int total,
    required bool isSubmitting,
    required VoidCallback onCheckout,
  }) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFF1F3F5))),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Tổng thanh toán',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF15213B),
                    ),
                  ),
                  Text(
                    _money(total),
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: isSubmitting ? null : onCheckout,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: const Color(0xFFF3B5B2),
                  minimumSize: const Size.fromHeight(56),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: isSubmitting
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Chốt đơn ngay',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value, {bool highlight = false}) {
    return Row(
      children: [
        Text(
          label,
          style: TextStyle(
            color: const Color(0xFF374151),
            fontSize: highlight ? 18 : 16,
            fontWeight: highlight ? FontWeight.w800 : FontWeight.w500,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: TextStyle(
            color: highlight ? AppColors.primary : const Color(0xFF111827),
            fontSize: highlight ? 18 : 16,
            fontWeight: highlight ? FontWeight.w900 : FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _radio(bool selected) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? AppColors.primary : Colors.white,
        border: Border.all(
          color: selected ? AppColors.primary : const Color(0xFFD1D5DB),
          width: 1.5,
        ),
      ),
      child: selected
          ? const Icon(Icons.check, color: Colors.white, size: 18)
          : null,
    );
  }

  BoxDecoration _cardDecoration() {
    return BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: const Color(0xFFF1F3F5)),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.03),
          blurRadius: 10,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  String _money(int amount) {
    final value = amount.toString().replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match[1]}.',
    );
    return '${value}đ';
  }
}

// ─── Cart Item Card ─────────────────────────────────────────────────────────
class _CartItemCard extends StatelessWidget {
  final CartItemData item;
  const _CartItemCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F3F5)),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFFFFF1EF),
              border: Border.all(color: const Color(0xFFFFE1D9)),
            ),
            child: Center(
              child: Text(
                item.logoText,
                style: const TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Vé số ${item.province}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                    color: Color(0xFF15213B),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${item.drawTime} • ${item.kyHieu}',
                  style: const TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF1EF),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFFFE1D9)),
                  ),
                  child: Text(
                    item.number,
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'x${item.quantity}',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                  color: Color(0xFF15213B),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _money2(item.subtotal),
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 15,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _money2(int amount) {
    final value = amount.toString().replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match[1]}.',
    );
    return '${value}đ';
  }
}
