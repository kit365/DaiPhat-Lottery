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
  final _timeController = TextEditingController();
  final _noteController = TextEditingController();
  bool _initialLoadDone = false;
  late DateTime _pickupDate;
  bool _submitted = false;
  bool _nameTouched = false;
  bool _phoneTouched = false;
  /// Khoá danh sách vé theo thời điểm vào màn (mua ngay / giỏ), tránh đổi khi thoát phiên.
  List<CartItemData>? _lockedCheckoutItems;

  @override
  void initState() {
    super.initState();
    _pickupDate = DateTime.now();
    // Xóa giờ nhận vé cũ còn sót trong provider khi vào lại màn hình.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(checkoutProvider.notifier).clearExpectedPickupAt();
      _timeController.clear();
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
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

  String? _getNameError() {
    if (!_nameTouched && !_submitted) return null;
    final name = _nameController.text.trim();
    if (name.isEmpty) return 'Vui lòng nhập họ và tên';
    if (!RegExp(r'^[a-zA-ZÀ-ɏḀ-ỿ\s]+$').hasMatch(name)) {
      return 'Họ và tên chỉ được chứa chữ cái';
    }
    if (name.length >= 50) return 'Họ và tên phải ít hơn 50 ký tự';
    return null;
  }

  String? _getPhoneError() {
    if (!_phoneTouched && !_submitted) return null;
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) return 'Vui lòng nhập số điện thoại';
    if (!RegExp(r'^\d+$').hasMatch(phone)) return 'Số điện thoại chỉ được chứa số';
    if (!phone.startsWith('0')) return 'Số điện thoại phải bắt đầu bằng 0';
    if (phone.length > 11) return 'Số điện thoại không được dài hơn 11 số';
    return null;
  }

  Future<void> _handleCheckout() async {
    setState(() => _submitted = true);
    final notifier = ref.read(checkoutProvider.notifier);
    final success = await notifier.submitOrder();

    if (!mounted) return;

    final checkoutState = ref.read(checkoutProvider);
    if (checkoutState.checkoutUrl != null) {
      // Open PayOS in-app WebView for payment
      // Finalize AFTER navigation so prices don't flash to 0
      notifier.finalizeAfterOnlinePayment();
      if (!mounted) return;
      context.pushNamed(
        AppRoute.paymentWebView.name,
        queryParameters: {
          'checkoutUrl': checkoutState.checkoutUrl!,
          if (checkoutState.orderId != null) 'orderId': checkoutState.orderId!,
        },
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
    _lockedCheckoutItems ??=
        List<CartItemData>.from(ref.read(checkoutItemsProvider));
    final cartItems = _lockedCheckoutItems!;
    final cartSubtotal =
        cartItems.fold<int>(0, (sum, item) => sum + item.subtotal);
    final cartTicketCount =
        cartItems.fold<int>(0, (sum, item) => sum + item.quantity);
    final cartTotal = cartSubtotal;

    // Init form fields once
    if (!_initialLoadDone) {
      _initialLoadDone = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(checkoutProvider.notifier).loadUserProfile();
      });
    }
    // Sync controllers with state
    _initFromState(checkoutState);

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) return;
        // Thoát checkout mà chưa chốt đơn → huỷ phiên mua ngay, giữ nguyên giỏ chính.
        ref.read(buyNowItemsProvider.notifier).clear();
      },
      child: Scaffold(
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
                  data: (types) {
                    if (checkoutState.selectedReceiveType == null &&
                        types.isNotEmpty) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        ref
                            .read(checkoutProvider.notifier)
                            .setSelectedReceiveType(types.first.value);
                      });
                    }
                    return _buildReceiveTypeSelector(
                      types,
                      checkoutState.selectedReceiveType,
                      (val) => ref
                          .read(checkoutProvider.notifier)
                          .setSelectedReceiveType(val),
                    );
                  },
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
                  data: (types) {
                    // Bỏ REFUND (hoàn tiền) — không phải phương thức thanh toán khi đặt đơn.
                    final paymentTypes =
                        types.where((t) => t.value != 'REFUND').toList();
                    // Tự chọn mặc định nếu chưa chọn (ưu tiên ONLINE).
                    if (checkoutState.selectedTransactionType == null &&
                        paymentTypes.isNotEmpty) {
                      final online = paymentTypes.where((t) => t.value == 'ONLINE');
                      final def = online.isNotEmpty
                          ? online.first.value
                          : paymentTypes.first.value;
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        ref
                            .read(checkoutProvider.notifier)
                            .setSelectedTransactionType(def);
                      });
                    }
                    return _buildPaymentMethodSelector(
                      paymentTypes,
                      checkoutState.selectedTransactionType,
                      (val) => ref
                          .read(checkoutProvider.notifier)
                          .setSelectedTransactionType(val),
                    );
                  },
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
            canCheckout: checkoutState.isValid &&
                _hasValidPickupTimeInput &&
                !checkoutState.isSubmitting,
            onCheckout: _handleCheckout,
          ),
        ],
      ),
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
    final nameError = _getNameError();
    final phoneError = _getPhoneError();
    final timeError = _submitted && _timeController.text.trim().isEmpty
        ? 'Vui lòng nhập giờ nhận vé'
        : null;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _nameController,
            onChanged: (v) {
              setState(() => _nameTouched = true);
              ref.read(checkoutProvider.notifier).setName(v);
            },
            decoration: InputDecoration(
              labelText: 'Họ và tên *',
              hintText: 'Nhập họ và tên',
              prefixIcon: const Icon(Icons.person_outline),
              errorText: nameError,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: nameError != null ? Colors.red : const Color(0xFFE5E7EB),
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: nameError != null ? Colors.red : AppColors.primary,
                  width: 1.5,
                ),
              ),
            ),
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneController,
            onChanged: (v) {
              setState(() => _phoneTouched = true);
              ref.read(checkoutProvider.notifier).setPhone(v);
            },
            decoration: InputDecoration(
              labelText: 'Số điện thoại *',
              hintText: 'Nhập số điện thoại',
              prefixIcon: const Icon(Icons.phone_outlined),
              errorText: phoneError,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: phoneError != null ? Colors.red : const Color(0xFFE5E7EB),
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: phoneError != null ? Colors.red : AppColors.primary,
                  width: 1.5,
                ),
              ),
            ),
            keyboardType: TextInputType.phone,
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 16),
          _buildDateSelector(),
          const SizedBox(height: 12),
          _buildTimeInputField(timeError),
          const SizedBox(height: 12),
          TextField(
            controller: _noteController,
            onChanged: (v) => ref.read(checkoutProvider.notifier).setNote(v),
            decoration: InputDecoration(
              labelText: 'Ghi chú',
              hintText: 'VD: Tới lấy vào giờ nghỉ trưa...',
              prefixIcon: const Icon(Icons.note_alt_outlined),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
              ),
            ),
            textInputAction: TextInputAction.done,
            minLines: 1,
            maxLines: 3,
          ),
        ],
      ),
    );
  }

  Widget _buildDateSelector() {
    final today = DateTime.now();
    final tomorrow = today.add(const Duration(days: 1));
    final isToday = _pickupDate.year == today.year &&
        _pickupDate.month == today.month &&
        _pickupDate.day == today.day;

    String fmtDay(DateTime d) =>
        '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Ngày nhận vé *',
          style: TextStyle(
            color: Color(0xFF374151),
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _DateChipButton(
                label: 'Hôm nay',
                subLabel: fmtDay(today),
                isSelected: isToday,
                onTap: () {
                  setState(() => _pickupDate = today);
                  _updatePickupDateTime();
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _DateChipButton(
                label: 'Ngày mai',
                subLabel: fmtDay(tomorrow),
                isSelected: !isToday,
                onTap: () {
                  setState(() => _pickupDate = tomorrow);
                  _updatePickupDateTime();
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTimeInputField(String? error) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Giờ nhận vé *',
              style: TextStyle(
                color: Color(0xFF374151),
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(width: 4),
            InkWell(
              onTap: _showPickupTimeInfo,
              borderRadius: BorderRadius.circular(12),
              child: const Padding(
                padding: EdgeInsets.all(2),
                child: Icon(
                  Icons.error_outline_rounded,
                  size: 18,
                  color: Color(0xFFFFB020),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _timeController,
          onChanged: (_) {
            _updatePickupDateTime();
            setState(() {});
          },
          decoration: InputDecoration(
            hintText: 'VD: 14:30',
            hintStyle: const TextStyle(
              color: AppColors.loginPlaceholder,
              fontWeight: FontWeight.w400,
            ),
            prefixIcon: const Icon(Icons.access_time_rounded),
            errorText: error,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: error != null ? Colors.red : const Color(0xFFE5E7EB),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: error != null ? Colors.red : AppColors.primary,
                width: 1.5,
              ),
            ),
          ),
          keyboardType: TextInputType.datetime,
          textInputAction: TextInputAction.next,
        ),
      ],
    );
  }

  void _showPickupTimeInfo() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(
          'Giờ nhận vé',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        content: const Text(
          'Vui lòng chọn giờ bạn dự kiến đến quầy nhận vé.\n\n'
          '• Quầy làm việc từ 08:00 đến 20:00.\n'
          '• Giờ nhận phải sau thời điểm hiện tại ít nhất 15 phút.\n'
          '• Bạn có thể chọn nhận hôm nay hoặc ngày mai.\n\n'
          'Nhập theo định dạng 24 giờ, ví dụ: 14:30.',
          style: TextStyle(fontSize: 14, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Đã hiểu',
              style: TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  bool get _hasValidPickupTimeInput {
    final timeStr = _timeController.text.trim();
    if (timeStr.isEmpty) return false;
    final parts = timeStr.split(':');
    if (parts.length != 2) return false;
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return false;
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  }

  void _updatePickupDateTime() {
    final timeStr = _timeController.text.trim();
    final notifier = ref.read(checkoutProvider.notifier);
    if (!_hasValidPickupTimeInput) {
      notifier.clearExpectedPickupAt();
      return;
    }
    try {
      final parts = timeStr.split(':');
      final hour = int.parse(parts[0]);
      final minute = int.parse(parts[1]);
      final dt = DateTime(
        _pickupDate.year,
        _pickupDate.month,
        _pickupDate.day,
        hour,
        minute,
      );
      notifier.setExpectedPickupAt(dt.toIso8601String());
    } catch (_) {
      notifier.clearExpectedPickupAt();
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
    required bool canCheckout,
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
                onPressed: canCheckout ? onCheckout : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: const Color(0xFFF3B5B2),
                  disabledForegroundColor: Colors.white70,
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

// ─── Date Chip Button ────────────────────────────────────────────────────────
class _DateChipButton extends StatelessWidget {
  const _DateChipButton({
    required this.label,
    required this.subLabel,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final String subLabel;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : const Color(0xFFE5E7EB),
            width: 1.5,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.calendar_today_rounded,
              size: 16,
              color: isSelected ? Colors.white : const Color(0xFF6B7280),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: isSelected ? Colors.white : const Color(0xFF15213B),
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  subLabel,
                  style: TextStyle(
                    color: isSelected
                        ? Colors.white.withValues(alpha: 0.85)
                        : const Color(0xFF6B7280),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
