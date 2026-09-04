import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/features/cart/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/features/cart/models/cart_item_model.dart';
import '../../models/transaction_type.dart';
import '../providers/checkout_provider.dart';
import '../widgets/checkout_datetime_picker.dart';

class CheckoutView extends ConsumerStatefulWidget {
  const CheckoutView({super.key});

  @override
  ConsumerState<CheckoutView> createState() => _CheckoutViewState();
}

class _CheckoutViewState extends ConsumerState<CheckoutView> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _noteController = TextEditingController();
  bool _initialLoadDone = false;
  bool _submitted = false;
  bool _nameTouched = false;
  bool _phoneTouched = false;

  /// Khoá danh sách vé theo thời điểm vào màn (mua ngay / giỏ), tránh đổi khi thoát phiên.
  List<CartItemData>? _lockedCheckoutItems;

  @override
  void initState() {
    super.initState();
    // Xóa giờ nhận vé cũ còn sót trong provider khi vào lại màn hình.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final notifier = ref.read(checkoutProvider.notifier);
      notifier.clearExpectedPickupAt();
      // Mặc định ngay để nút chốt đơn không bị khóa khi API enum lỗi.
      notifier.setSelectedReceiveType('COUNTER_PICKUP');
      notifier.setSelectedTransactionType('ONLINE');
      notifier.loadUserProfile();
      // Bỏ cache lỗi 401 cũ (nếu có) và tải lại danh mục.
      ref.invalidate(receiveTypesProvider);
      ref.invalidate(transactionTypesProvider);
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
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
    if (!RegExp(r'^\d+$').hasMatch(phone)) {
      return 'Số điện thoại chỉ được chứa số';
    }
    if (!phone.startsWith('0')) return 'Số điện thoại phải bắt đầu bằng 0';
    if (phone.length > 11) return 'Số điện thoại không được dài hơn 11 số';
    return null;
  }

  List<String> _getMissingRequirements(CheckoutState state) {
    final missing = <String>[];
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();

    if (name.isEmpty) {
      missing.add('họ và tên');
    } else if (!RegExp(r'^[a-zA-ZÀ-ɏḀ-ỿ\s]+$').hasMatch(name) ||
        name.length >= 50) {
      missing.add('họ tên hợp lệ');
    }

    if (phone.isEmpty) {
      missing.add('số điện thoại');
    } else if (!RegExp(r'^\d+$').hasMatch(phone) ||
        !phone.startsWith('0') ||
        phone.length > 11) {
      missing.add('số điện thoại hợp lệ');
    }

    if (state.expectedPickupAt == null ||
        state.expectedPickupAt!.trim().isEmpty) {
      missing.add('thời gian nhận vé');
    }

    if (state.selectedReceiveType == null ||
        state.selectedReceiveType!.trim().isEmpty) {
      missing.add('hình thức nhận vé');
    }

    if (state.selectedTransactionType == null ||
        state.selectedTransactionType!.trim().isEmpty) {
      missing.add('phương thức thanh toán');
    }

    return missing;
  }

  Future<void> _handleCheckout() async {
    setState(() => _submitted = true);
    final notifier = ref.read(checkoutProvider.notifier);
    final success = await notifier.submitOrder();

    if (!mounted) {
      return;
    }

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
          if (checkoutState.orderCode != null)
            'internalCode': checkoutState.orderCode!,
        },
      );
    } else if (success) {
      // Offline payment success
      context.pushNamed(
        AppRoute.checkoutResult.name,
        queryParameters: {
          'code': '00',
          if (checkoutState.orderId != null) 'orderId': checkoutState.orderId!,
          if (checkoutState.orderCode != null)
            'internalCode': checkoutState.orderCode!,
        },
      );
    }
    // If failed, error is already set in state - UI will show it
  }

  @override
  Widget build(BuildContext context) {
    final checkoutState = ref.watch(checkoutProvider);
    final receiveTypesAsync = ref.watch(receiveTypesProvider);
    final transactionTypesAsync = ref.watch(transactionTypesProvider);
    _lockedCheckoutItems ??= List<CartItemData>.from(
      ref.read(checkoutItemsProvider),
    );
    final cartItems = _lockedCheckoutItems!;
    final cartSubtotal = cartItems.fold<int>(
      0,
      (sum, item) => sum + item.subtotal,
    );
    final cartTicketCount = cartItems.fold<int>(
      0,
      (sum, item) => sum + item.quantity,
    );
    final cartTotal = cartSubtotal;

    // Init form fields once
    if (!_initialLoadDone) {
      _initialLoadDone = true;
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
        backgroundColor: AppColors.backgroundPrimary,
        appBar: AppBar(
          title: Text('Thanh toán', style: AppTypography.pageTitle()),
          backgroundColor: AppColors.surfacePrimary,
          foregroundColor: AppColors.contentPrimary,
          elevation: 0,
          scrolledUnderElevation: 0,
          surfaceTintColor: AppColors.transparent,
          leading: IconButton(
            icon: const Icon(
              Icons.arrow_back_ios_new_rounded,
              size: 20,
              color: AppColors.contentPrimary,
            ),
            onPressed: () => context.pop(),
          ),
        ),
        body: Column(
          children: [
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primary,
                onRefresh: () async {
                  ref.invalidate(receiveTypesProvider);
                  ref.invalidate(transactionTypesProvider);
                  ref.invalidate(operatingHoursProvider);
                  await ref.read(checkoutProvider.notifier).loadUserProfile();
                },
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                  children: [
                    // ─── 1. DANH SÁCH VÉ ──────────────────────────
                    _buildSectionTitle('Danh sách vé', number: 1),
                    const SizedBox(height: 10),
                    ...cartItems.map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _CartItemCard(item: item),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // ─── 2. THÔNG TIN NHẬN VÉ ─────────────────────
                    _buildSectionTitle('Thông tin nhận vé', number: 2),
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
                        child: Padding(
                          padding: EdgeInsets.all(16.0),
                          child: CircularProgressIndicator(),
                        ),
                      ),
                      error: (e, _) => Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Không tải được danh mục, dùng mặc định nhận tại quầy.',
                            style: AppTypography.bodySmall(
                              color: AppColors.statusWarningForeground,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 8),
                          _buildReceiveTypeSelector(
                            defaultReceiveTypes,
                            checkoutState.selectedReceiveType ??
                                'COUNTER_PICKUP',
                            (val) => ref
                                .read(checkoutProvider.notifier)
                                .setSelectedReceiveType(val),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // ─── 3. PHƯƠNG THỨC THANH TOÁN ───────────────
                    _buildSectionTitle('Phương thức thanh toán', number: 3),
                    const SizedBox(height: 12),
                    transactionTypesAsync.when(
                      data: (types) {
                        // Bỏ REFUND và OFFLINE (tiền mặt) — mobile chỉ hỗ trợ thanh toán online.
                        final paymentTypes = types
                            .where(
                              (t) =>
                                  t.value != 'REFUND' && t.value != 'OFFLINE',
                            )
                            .toList();
                        final effectiveTypes = paymentTypes.isNotEmpty
                            ? paymentTypes
                            : defaultTransactionTypes;
                        // Tự chọn mặc định nếu chưa chọn hoặc đang giữ OFFLINE đã bị ẩn.
                        final current = checkoutState.selectedTransactionType;
                        final needDefault =
                            current == null ||
                            current == 'OFFLINE' ||
                            !effectiveTypes.any((t) => t.value == current);
                        if (needDefault && effectiveTypes.isNotEmpty) {
                          final online = effectiveTypes.where(
                            (t) => t.value == 'ONLINE',
                          );
                          final def = online.isNotEmpty
                              ? online.first.value
                              : effectiveTypes.first.value;
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            ref
                                .read(checkoutProvider.notifier)
                                .setSelectedTransactionType(def);
                          });
                        }
                        return _buildPaymentMethodSelector(
                          effectiveTypes,
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
                      error: (e, _) => Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Không tải được danh mục, dùng mặc định chuyển khoản.',
                            style: AppTypography.bodySmall(
                              color: AppColors.statusWarningForeground,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 8),
                          _buildPaymentMethodSelector(
                            defaultTransactionTypes,
                            checkoutState.selectedTransactionType ?? 'ONLINE',
                            (val) => ref
                                .read(checkoutProvider.notifier)
                                .setSelectedTransactionType(val),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // ─── TÓM TẮT ĐƠN HÀNG ─────────────────────────
                    _buildOrderSummary(
                      cartTicketCount,
                      cartSubtotal,
                      cartTotal,
                    ),
                    const SizedBox(height: 16),

                    // Error message
                    if (checkoutState.errorMessage != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceDestructiveSoft,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: AppColors.borderDestructiveSubtle,
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.error_outline,
                                color: AppColors.contentDestructive,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  checkoutState.errorMessage!,
                                  style: AppTypography.bodySmall(
                                    color: AppColors.contentDestructive,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),

            // ─── BOTTOM BAR ─────────────────────────────────────
            _buildBottomBar(
              total: cartTotal,
              isSubmitting: checkoutState.isSubmitting,
              canCheckout: checkoutState.isValid && !checkoutState.isSubmitting,
              missingRequirements: _getMissingRequirements(checkoutState),
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
                style: AppTypography.subtitle2(
                  color: AppColors.surfacePrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
        Text(
          title,
          style: AppTypography.h4(
            color: AppColors.contentPrimary,
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
    final timeError =
        _submitted &&
            (state.expectedPickupAt == null || state.expectedPickupAt!.isEmpty)
        ? 'Vui lòng chọn thời gian nhận vé'
        : null;

    return Container(
      decoration: _cardDecoration(),
      child: Column(
        children: [
          _CheckoutTextFieldRow(
            icon: Icons.person_outline_rounded,
            label: 'Họ và tên *',
            hintText: 'Nhập họ và tên',
            controller: _nameController,
            errorText: nameError,
            textInputAction: TextInputAction.next,
            onChanged: (v) {
              setState(() => _nameTouched = true);
              ref.read(checkoutProvider.notifier).setName(v);
            },
          ),
          const Divider(height: 1, color: AppColors.borderLight),
          _CheckoutTextFieldRow(
            icon: Icons.phone_outlined,
            label: 'Số điện thoại *',
            hintText: 'Nhập số điện thoại',
            controller: _phoneController,
            errorText: phoneError,
            keyboardType: TextInputType.phone,
            textInputAction: TextInputAction.next,
            onChanged: (v) {
              setState(() => _phoneTouched = true);
              ref.read(checkoutProvider.notifier).setPhone(v);
            },
          ),
          const Divider(height: 1, color: AppColors.borderLight),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: CheckoutDateTimePicker(
              value: state.expectedPickupAt,
              errorText: timeError,
              embedded: true,
              onChanged: (iso) {
                ref.read(checkoutProvider.notifier).setExpectedPickupAt(iso);
              },
            ),
          ),
          const Divider(height: 1, color: AppColors.borderLight),
          _CheckoutTextFieldRow(
            icon: Icons.note_alt_outlined,
            label: 'Ghi chú (nếu có)',
            hintText: 'Thêm ghi chú',
            controller: _noteController,
            textInputAction: TextInputAction.done,
            minLines: 1,
            maxLines: 3,
            onChanged: (v) => ref.read(checkoutProvider.notifier).setNote(v),
          ),
        ],
      ),
    );
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
                const Divider(height: 1, color: AppColors.borderLight),
              Semantics(
                container: true,
                button: true,
                inMutuallyExclusiveGroup: true,
                checked: isSelected,
                label: type.label,
                hint: isSelected ? 'Đã chọn' : 'Chọn phương thức nhận vé',
                onTap: () => onSelect(type.value),
                child: ExcludeSemantics(
                  child: InkWell(
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
                                : AppColors.contentPlaceholder,
                            size: 26,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  type.label,
                                  style: AppTypography.subtitle1(
                                    color: isSelected
                                        ? AppColors.primary
                                        : AppColors.contentPrimary,
                                    fontSize: 15.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                if (type.value == 'COUNTER_PICKUP')
                                  Text(
                                    'Đến trực tiếp quầy giao dịch Đại Phát để nhận vé giấy',
                                    style: AppTypography.bodySmall(
                                      color: AppColors.contentMuted,
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
                const Divider(height: 1, color: AppColors.borderLight),
              Semantics(
                container: true,
                button: true,
                inMutuallyExclusiveGroup: true,
                checked: isSelected,
                label: type.label,
                hint: isSelected ? 'Đã chọn' : 'Chọn phương thức thanh toán',
                onTap: () => onSelect(type.value),
                child: ExcludeSemantics(
                  child: InkWell(
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
                                : AppColors.contentPlaceholder,
                            size: 26,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  type.label,
                                  style: AppTypography.subtitle1(
                                    color: isSelected
                                        ? AppColors.primary
                                        : AppColors.contentPrimary,
                                    fontSize: 15.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  type.value == 'ONLINE'
                                      ? 'Quét mã QR bằng ứng dụng ngân hàng (24/7)'
                                      : 'Thanh toán bằng tiền mặt khi nhận vé tại quầy',
                                  style: AppTypography.bodySmall(
                                    color: AppColors.contentMuted,
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
      padding: const EdgeInsets.all(18),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tóm tắt chi phí',
            style: AppTypography.subtitle1(
              color: AppColors.contentPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          _summaryRow('Số lượng vé', '$ticketCount vé'),
          const SizedBox(height: 10),
          _summaryRow('Tạm tính', _money(subtotal)),
        ],
      ),
    );
  }

  Widget _buildBottomBar({
    required int total,
    required bool isSubmitting,
    required bool canCheckout,
    required List<String> missingRequirements,
    required VoidCallback onCheckout,
  }) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
      decoration: const BoxDecoration(
        color: AppColors.surfacePrimary,
        border: Border(top: BorderSide(color: AppColors.borderLight)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Tổng thanh toán',
                    style: AppTypography.subtitle1(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.contentPrimary,
                    ),
                  ),
                  Text(
                    _money(total),
                    style: AppTypography.priceLarge(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
            if (!canCheckout &&
                !isSubmitting &&
                missingRequirements.isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Semantics(
                  liveRegion: true,
                  label: 'Còn thiếu: ${missingRequirements.join(", ")}',
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.info_outline_rounded,
                        size: 16,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Vui lòng hoàn tất: ${missingRequirements.join(", ")}',
                          style: AppTypography.caption(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                            height: 1.3,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: canCheckout ? onCheckout : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.surfacePrimary,
                  disabledBackgroundColor: AppColors.brandPrimaryBorder,
                  disabledForegroundColor: AppColors.white.withValues(alpha: 0.7),
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
                          color: AppColors.surfacePrimary,
                        ),
                      )
                    : Text(
                        'Chốt đơn ngay',
                        style: AppTypography.buttonLarge(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: AppColors.surfacePrimary,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(
    String label,
    String value, {
    bool highlight = false,
    Color? valueColor,
  }) {
    return Row(
      children: [
        Text(
          label,
          style: AppTypography.bodyMedium(
            color: highlight
                ? AppColors.contentPrimary
                : AppColors.contentSecondary,
            fontSize: highlight ? 16 : 14,
            fontWeight: highlight ? FontWeight.w800 : FontWeight.w500,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: highlight
              ? AppTypography.priceLarge(
                  color: AppColors.primary,
                  fontSize: 19,
                  fontWeight: FontWeight.w900,
                )
              : AppTypography.bodyMedium(
                  color: valueColor ?? AppColors.contentPrimary,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
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
        color: selected ? AppColors.primary : AppColors.surfacePrimary,
        border: Border.all(
          color: selected ? AppColors.primary : AppColors.borderDefault,
          width: 1.5,
        ),
      ),
      child: selected
          ? const Icon(Icons.check, color: AppColors.surfacePrimary, size: 18)
          : null,
    );
  }

  BoxDecoration _cardDecoration() {
    return BoxDecoration(
      color: AppColors.surfacePrimary,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppColors.cardBorder),
      boxShadow: const [
        BoxShadow(
          color: AppColors.shadowLight,
          blurRadius: 10,
          offset: Offset(0, 2),
        ),
      ],
    );
  }

  String _money(int amount) => AppFormatters.formatCurrency(amount);
}

class _CheckoutTextFieldRow extends StatelessWidget {
  const _CheckoutTextFieldRow({
    required this.icon,
    required this.label,
    required this.hintText,
    required this.controller,
    required this.onChanged,
    this.errorText,
    this.keyboardType,
    this.textInputAction,
    this.minLines = 1,
    this.maxLines = 1,
  });

  final IconData icon;
  final String label;
  final String hintText;
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final String? errorText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final int minLines;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 48,
            height: 48,
            child: Icon(icon, color: AppColors.contentPrimary, size: 26),
          ),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              keyboardType: keyboardType,
              textInputAction: textInputAction,
              minLines: minLines,
              maxLines: maxLines,
              style: AppTypography.bodyLarge(
                color: AppColors.contentPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
              decoration: InputDecoration(
                labelText: label,
                hintText: hintText,
                errorText: errorText,
                isDense: true,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                errorBorder: InputBorder.none,
                focusedErrorBorder: InputBorder.none,
                contentPadding: EdgeInsets.zero,
                labelStyle: AppTypography.caption(
                  color: AppColors.contentMuted,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                ),
                hintStyle: AppTypography.bodyMedium(
                  color: AppColors.contentPlaceholder,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Cart Item Card ─────────────────────────────────────────────────────────
class _CartItemCard extends StatelessWidget {
  final CartItemData item;
  const _CartItemCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final station =
        (item.province.trim().isNotEmpty &&
            item.province.trim() != 'Đang cập nhật')
        ? item.province.trim()
        : (item.logoText.trim().isNotEmpty
              ? item.logoText.trim()
              : 'Đài Miền Nam');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      station,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.subtitle2(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: AppColors.contentMuted,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.calendar_month_outlined,
                          size: 12,
                          color: AppColors.contentMuted,
                        ),
                        const SizedBox(width: 3.5),
                        Flexible(
                          child: Text(
                            item.dateLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.caption(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: AppColors.contentMuted,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  item.number,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.lotteryDigit(
                    color: AppColors.contentPrimary,
                    fontSize: 25,
                    height: 1.0,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.8,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'x${item.quantity}',
                style: AppTypography.bodySmall(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: AppColors.contentMuted,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                AppFormatters.formatCurrency(item.subtotal),
                style: AppTypography.priceMedium(
                  fontWeight: FontWeight.w800,
                  fontSize: 13.5,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

