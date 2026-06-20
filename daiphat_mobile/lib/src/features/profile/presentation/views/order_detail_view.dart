import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/checkout/models/order_type.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import '../viewmodels/order_detail_viewmodel.dart';

class OrderDetailView extends ConsumerStatefulWidget {
  final String orderId;

  const OrderDetailView({super.key, required this.orderId});

  @override
  ConsumerState<OrderDetailView> createState() => _OrderDetailViewState();
}

class _OrderDetailViewState extends ConsumerState<OrderDetailView> {
  late OrderDetailViewModel _viewModel;

  static const _stepLabels = ['Đặt hàng', 'Thanh toán', 'Chuẩn bị', 'Chờ nhận', 'Hoàn thành'];
  static const _stepIcons = [
    Icons.shopping_cart_outlined,
    Icons.credit_card_outlined,
    Icons.inventory_2_outlined,
    Icons.store_outlined,
    Icons.check_circle_outline_rounded,
  ];

  @override
  void initState() {
    super.initState();
    _viewModel = OrderDetailViewModel(
      orderService: ref.read(orderServiceProvider),
      transactionService: ref.read(transactionServiceProvider),
      orderId: widget.orderId,
    );
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  int _stepIndex(String status) {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 0;
      case 'PAID':
        return 1;
      case 'PREPARING':
        return 2;
      case 'PENDING_PICKUP':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 0;
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'PENDING_PAYMENT':
        return const Color(0xFFF57C00);
      case 'PAID':
        return const Color(0xFF1565C0);
      case 'PREPARING':
        return const Color(0xFF6A1B9A);
      case 'PENDING_PICKUP':
        return const Color(0xFF00695C);
      case 'COMPLETED':
        return const Color(0xFF2E7D32);
      case 'CANCELLED':
        return const Color(0xFF757575);
      default:
        return AppColors.textMuted;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'Chờ thanh toán';
      case 'PAID':
        return 'Đã thanh toán';
      case 'PREPARING':
        return 'Đang chuẩn bị';
      case 'PENDING_PICKUP':
        return 'Chờ nhận vé';
      case 'COMPLETED':
        return 'Hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  }

  String _formatCountdown(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  String _formatDate(String? iso) {
    if (iso == null) return '-';
    try {
      return DateFormat('dd/MM/yyyy HH:mm').format(DateTime.parse(iso).toLocal());
    } catch (_) {
      return iso;
    }
  }

  Future<void> _handlePayment() async {
    final url = await _viewModel.getCheckoutUrl();
    if (!mounted) return;
    if (url == null || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không lấy được đường dẫn thanh toán')),
      );
      return;
    }
    context.pushNamed(
      AppRoute.paymentWebView.name,
      queryParameters: {
        'checkoutUrl': url,
        'orderId': widget.orderId,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _viewModel,
      builder: (context, _) {
        final order = _viewModel.order;
        return Scaffold(
          backgroundColor: const Color(0xFFF8F9FA),
          appBar: _buildAppBar(order),
          body: _buildBody(order),
          bottomNavigationBar: _viewModel.isPendingPayment
              ? _buildBottomPayBar()
              : (_viewModel.isCancellable || _viewModel.isRefundable)
                  ? _buildBottomActionBar()
                  : null,
        );
      },
    );
  }

  AppBar _buildAppBar(OrderResponse? order) {
    return AppBar(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(
          Icons.arrow_back_ios_new_rounded,
          size: 20,
          color: AppColors.primary,
        ),
        onPressed: () => context.pop(),
      ),
      title: Text(
        'Chi tiết đơn hàng',
        style: GoogleFonts.publicSans(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: AppColors.textMain,
        ),
      ),
      centerTitle: true,
      actions: [
        if (order != null)
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusColor(order.status).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _statusLabel(order.status),
                  style: GoogleFonts.publicSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: _statusColor(order.status),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildBody(OrderResponse? order) {
    if (_viewModel.isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (_viewModel.error != null || order == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.textMuted),
            const SizedBox(height: 12),
            Text(
              'Không tìm thấy đơn hàng',
              style: GoogleFonts.publicSans(
                fontSize: 15,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => _viewModel.fetchOrderDetail(),
              child: Text(
                'Thử lại',
                style: GoogleFonts.publicSans(
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _viewModel.fetchOrderDetail(),
      color: AppColors.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(
          16,
          16,
          16,
          (_viewModel.isPendingPayment || _viewModel.isCancellable || _viewModel.isRefundable) ? 100 : 32,
        ),
        child: Column(
          children: [
            _buildStepper(order),
            const SizedBox(height: 14),
            if (_viewModel.isPendingPayment) ...[
              _buildPendingPaymentCard(),
              const SizedBox(height: 14),
            ],
            _buildOrderInfoCard(order),
            const SizedBox(height: 14),
            _buildCustomerCard(order),
            const SizedBox(height: 14),
            _buildTicketsCard(order),
            const SizedBox(height: 14),
            _buildPaymentCard(order),
            const SizedBox(height: 14),
            _buildGuarantees(),
          ],
        ),
      ),
    );
  }

  // ── Stepper ──────────────────────────────────────────────────────────────

  Widget _buildStepper(OrderResponse order) {
    if (order.status == 'CANCELLED') {
      return _buildCancelledBanner();
    }

    final current = _stepIndex(order.status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          return Stack(
            alignment: Alignment.topCenter,
            children: [
              // background line
              Positioned(
                top: 20,
                left: constraints.maxWidth / 10,
                right: constraints.maxWidth / 10,
                child: Container(
                  height: 3,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F0F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              // active line
              Positioned(
                top: 20,
                left: constraints.maxWidth / 10,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 500),
                  height: 3,
                  width: (constraints.maxWidth * 0.8) *
                      (current / (_stepLabels.length - 1)),
                  decoration: BoxDecoration(
                    color: const Color(0xFF00A76F),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              // step circles
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(_stepLabels.length, (i) {
                  final done = i <= current;
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: done
                              ? const Color(0xFF00A76F)
                              : const Color(0xFFF4F6F8),
                          shape: BoxShape.circle,
                          boxShadow: done
                              ? [
                                  BoxShadow(
                                    color: const Color(0xFF00A76F)
                                        .withValues(alpha: 0.3),
                                    blurRadius: 8,
                                    spreadRadius: 2,
                                  ),
                                ]
                              : [],
                        ),
                        child: Icon(
                          _stepIcons[i],
                          size: 18,
                          color: done ? Colors.white : AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _stepLabels[i],
                        style: GoogleFonts.publicSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: done ? AppColors.textMain : AppColors.textMuted,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  );
                }),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildCancelledBanner() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF4F4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFFEBEE)),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.close_rounded, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Đơn hàng đã bị hủy',
                  style: GoogleFonts.publicSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Đơn hàng này đã bị hủy và không thể tiếp tục giao dịch.',
                  style: GoogleFonts.publicSans(
                    fontSize: 13,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Pending Payment Card ─────────────────────────────────────────────────

  Widget _buildPendingPaymentCard() {
    final countdown = _formatCountdown(_viewModel.remainingSeconds);
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBF0),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFFB020).withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFFB020),
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Text(
                          '!',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Bạn cần làm gì tiếp theo?',
                      style: GoogleFonts.publicSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFFFFB020),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _pendingBullet(
                  'Bấm nút "Tiếp tục thanh toán" để thực hiện chuyển khoản QR.',
                ),
                const SizedBox(height: 6),
                _pendingBullet(
                  'Hệ thống sử dụng cổng tự động PayOS, giao dịch xác nhận sau vài giây.',
                ),
                const SizedBox(height: 6),
                _pendingBullet(
                  'Hoàn tất trước khi đếm ngược kết thúc để tránh hệ thống hủy vé.',
                ),
              ],
            ),
          ),
          Container(
            margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: const Color(0xFFFFB020).withValues(alpha: 0.25)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'THỜI GIAN CÒN LẠI',
                        style: GoogleFonts.publicSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textMuted,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF4F4),
                          borderRadius: BorderRadius.circular(8),
                          border:
                              Border.all(color: const Color(0xFFFFEBEE)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.timer_rounded,
                                size: 16, color: AppColors.primary),
                            const SizedBox(width: 6),
                            Text(
                              countdown,
                              style: GoogleFonts.publicSans(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                color: AppColors.primary,
                                letterSpacing: 1,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  onPressed: _viewModel.isProcessingPayment ||
                          _viewModel.isExpired
                      ? null
                      : _handlePayment,
                  icon: _viewModel.isProcessingPayment
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.payment_rounded, size: 18),
                  label: Text(
                    'Thanh toán',
                    style: GoogleFonts.publicSans(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 2,
                    shadowColor: AppColors.primary.withValues(alpha: 0.3),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _pendingBullet(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 3),
          child: Icon(Icons.circle, size: 6, color: Color(0xFFFFB020)),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.publicSans(
              fontSize: 13,
              color: const Color(0xFF454F5B),
            ),
          ),
        ),
      ],
    );
  }

  // ── Order Info Card ──────────────────────────────────────────────────────

  Widget _buildOrderInfoCard(OrderResponse order) {
    final orderType = order.orderType == 'ONLINE'
        ? 'Online'
        : order.orderType == 'DIRECT'
            ? 'Tại quầy'
            : '-';
    final orderTypeColor = order.orderType == 'ONLINE'
        ? const Color(0xFF2065D1)
        : const Color(0xFFF57C00);

    return _card(
      icon: Icons.receipt_long_outlined,
      title: 'Thông tin đơn hàng',
      child: Column(
        children: [
          _infoRow(
            'Mã đơn hàng',
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'DP${order.orderCode}',
                  style: GoogleFonts.publicSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMain,
                  ),
                ),
                const SizedBox(width: 4),
                GestureDetector(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: order.orderCode));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Đã sao chép mã đơn hàng!'),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                  child: const Icon(Icons.copy_rounded,
                      size: 15, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _infoRow('Ngày đặt', value: _formatDate(order.createdAt)),
          const SizedBox(height: 12),
          _infoRow(
            'Loại đơn',
            trailing: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: orderTypeColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                orderType,
                style: GoogleFonts.publicSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: orderTypeColor,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          _infoRow(
            'Cách nhận',
            value: order.receiveType == 'COUNTER_PICKUP'
                ? 'Nhận tại quầy'
                : order.receiveType == 'DELIVERY'
                    ? 'Giao tận nơi'
                    : '-',
          ),
          const SizedBox(height: 12),
          _infoRow(
            'Giờ lấy vé (dự kiến)',
            value: _formatDate(order.expectedPickupAt),
          ),
        ],
      ),
    );
  }

  // ── Customer Card ────────────────────────────────────────────────────────

  Widget _buildCustomerCard(OrderResponse order) {
    return _card(
      icon: Icons.person_outline_rounded,
      title: 'Thông tin người đặt',
      child: Column(
        children: [
          _infoRow('Họ tên', value: order.name ?? '-'),
          const SizedBox(height: 12),
          _infoRow('Số điện thoại', value: order.phone ?? '-'),
        ],
      ),
    );
  }

  // ── Tickets Card ─────────────────────────────────────────────────────────

  Widget _buildTicketsCard(OrderResponse order) {
    final items = order.orderDetails ?? [];
    return _card(
      icon: Icons.confirmation_number_outlined,
      title: 'Danh sách vé (${items.length})',
      child: items.isEmpty
          ? Container(
              padding: const EdgeInsets.symmetric(vertical: 24),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E8EB)),
              ),
              child: Text(
                'Không có dữ liệu vé',
                style: GoogleFonts.publicSans(
                  fontSize: 13,
                  color: AppColors.textMuted,
                ),
              ),
            )
          : Column(
              children: items
                  .asMap()
                  .entries
                  .map(
                    (e) => Padding(
                      padding: EdgeInsets.only(
                          bottom: e.key < items.length - 1 ? 12 : 0),
                      child: _buildTicketItem(e.value, order.status),
                    ),
                  )
                  .toList(),
            ),
    );
  }

  Widget _buildTicketItem(OrderDetailItem item, String orderStatus) {
    final ticketStatusLabel = _ticketStatusLabel(item.status, orderStatus);
    final ticketStatusColor = _ticketStatusColor(item.status, orderStatus);

    final province = item.lotteryTicket?.province;
    final drawDate = item.lotteryTicket?.drawDate;
    final ticketType = item.lotteryTicket?.ticketType;
    final symbol = item.lotteryTicket?.symbol;

    final currencyFmt = NumberFormat.currency(
      locale: 'vi_VN',
      symbol: '₫',
      decimalDigits: 0,
    );

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E8EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: province + status
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.confirmation_number_rounded,
                    color: AppColors.primary,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    province != null
                        ? 'Xổ số $province'
                        : 'Vé số #${item.id}',
                    style: GoogleFonts.publicSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textMain,
                    ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: ticketStatusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: ticketStatusColor.withValues(alpha: 0.25)),
                  ),
                  child: Text(
                    ticketStatusLabel,
                    style: GoogleFonts.publicSans(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: ticketStatusColor,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: Color(0xFFEEEEEE)),

          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Left: ticket details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (symbol != null)
                        _ticketDetail(Icons.tag_rounded, 'Mã vé: $symbol',
                            bold: true, color: AppColors.primary),
                      if (drawDate != null) ...[
                        const SizedBox(height: 6),
                        _ticketDetail(
                          Icons.calendar_today_outlined,
                          'Ngày xổ: ${_formatDrawDate(drawDate)}',
                        ),
                      ],
                      if (ticketType != null) ...[
                        const SizedBox(height: 6),
                        _ticketDetail(
                          Icons.category_outlined,
                          ticketType,
                        ),
                      ],
                    ],
                  ),
                ),
                // Right: price
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Giá vé',
                      style: GoogleFonts.publicSans(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      currencyFmt.format(item.price),
                      style: GoogleFonts.publicSans(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _ticketDetail(IconData icon, String text,
      {bool bold = false, Color? color}) {
    return Row(
      children: [
        Icon(icon, size: 13, color: color ?? AppColors.textMuted),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.publicSans(
              fontSize: 13,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              color: color ?? AppColors.textMuted,
            ),
          ),
        ),
      ],
    );
  }

  String _formatDrawDate(String raw) {
    try {
      final dt = DateTime.parse(raw);
      return DateFormat('dd/MM/yyyy').format(dt);
    } catch (_) {
      return raw;
    }
  }

  String _ticketStatusLabel(String ticketStatus, String orderStatus) {
    if (orderStatus == 'PENDING_PAYMENT') return 'Chờ thanh toán';
    if (orderStatus == 'CANCELLED') return 'Đã hủy';
    switch (ticketStatus) {
      case 'ACTIVE':
        return 'Đã mua xong';
      case 'REFUND_PENDING':
        return 'Chờ hoàn tiền';
      case 'REFUNDED':
        return 'Đã hoàn tiền';
      default:
        return ticketStatus;
    }
  }

  Color _ticketStatusColor(String ticketStatus, String orderStatus) {
    if (orderStatus == 'PENDING_PAYMENT') return const Color(0xFFF57C00);
    if (orderStatus == 'CANCELLED') return const Color(0xFF757575);
    switch (ticketStatus) {
      case 'ACTIVE':
        return const Color(0xFF2E7D32);
      case 'REFUND_PENDING':
        return const Color(0xFFF57C00);
      case 'REFUNDED':
        return AppColors.textMuted;
      default:
        return AppColors.textMuted;
    }
  }

  // ── Payment Card ─────────────────────────────────────────────────────────

  Widget _buildPaymentCard(OrderResponse order) {
    final tx = order.transactions?.isNotEmpty == true
        ? order.transactions!.first
        : null;
    final currencyFmt = NumberFormat.currency(
      locale: 'vi_VN',
      symbol: '₫',
      decimalDigits: 0,
    );
    final txStatusLabel = _txStatusLabel(tx?.status);
    final txStatusColor = _txStatusColor(tx?.status);
    final ticketCount = order.orderDetails?.length ?? 0;

    return _card(
      icon: Icons.receipt_outlined,
      title: 'Chi tiết thanh toán',
      child: Column(
        children: [
          // payment method
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Phương thức',
                      style: GoogleFonts.publicSans(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE5E8EB)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(6),
                              border:
                                  Border.all(color: const Color(0xFFE5E8EB)),
                            ),
                            child: const Icon(
                              Icons.qr_code_rounded,
                              size: 16,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Chuyển khoản QR',
                            style: GoogleFonts.publicSans(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textMain,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Trạng thái',
                    style: GoogleFonts.publicSans(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: txStatusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      txStatusLabel,
                      style: GoogleFonts.publicSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: txStatusColor,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(color: Color(0xFFF0F0F0)),
          const SizedBox(height: 16),

          // cost breakdown
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E8EB)),
            ),
            child: Column(
              children: [
                _costRow('Số lượng vé', '$ticketCount vé'),
                const SizedBox(height: 10),
                _costRow(
                    'Tạm tính', currencyFmt.format(order.totalAmount)),
                const SizedBox(height: 10),
                _costRow('Phí dịch vụ', 'Miễn phí',
                    valueColor: const Color(0xFF00A76F)),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(
                    color: Color(0xFFE5E8EB),
                    height: 1,
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Tổng thanh toán',
                      style: GoogleFonts.publicSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textMain,
                      ),
                    ),
                    Text(
                      currencyFmt.format(order.totalAmount),
                      style: GoogleFonts.publicSans(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _costRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.publicSans(
              fontSize: 13, color: AppColors.textMuted),
        ),
        Text(
          value,
          style: GoogleFonts.publicSans(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: valueColor ?? AppColors.textMain,
          ),
        ),
      ],
    );
  }

  String _txStatusLabel(String? status) {
    switch (status) {
      case 'COMPLETED':
        return 'Đã thanh toán';
      case 'PENDING':
        return 'Chờ thanh toán';
      case 'FAILED':
        return 'Thất bại';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'REFUNDED':
        return 'Đã hoàn tiền';
      default:
        return 'Chưa xác định';
    }
  }

  Color _txStatusColor(String? status) {
    switch (status) {
      case 'COMPLETED':
        return const Color(0xFF2E7D32);
      case 'PENDING':
        return const Color(0xFFF57C00);
      case 'FAILED':
      case 'CANCELLED':
        return AppColors.primary;
      case 'REFUNDED':
        return AppColors.textMuted;
      default:
        return AppColors.textMuted;
    }
  }

  // ── Guarantees ───────────────────────────────────────────────────────────

  Widget _buildGuarantees() {
    final items = [
      (Icons.shield_outlined, const Color(0xFF00A76F), 'Bảo mật thông tin',
          'Cam kết bảo mật tuyệt đối'),
      (Icons.headset_mic_outlined, AppColors.primary, 'Hỗ trợ 24/7',
          '1900 636 555'),
      (Icons.verified_user_outlined, AppColors.primary, 'Giao dịch an toàn',
          'Được bảo vệ bởi hệ thống'),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: items
            .map(
              (e) => Expanded(
                child: Column(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: e.$2.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(e.$1, color: e.$2, size: 20),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      e.$3,
                      style: GoogleFonts.publicSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textMain,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      e.$4,
                      style: GoogleFonts.publicSans(
                        fontSize: 10,
                        color: AppColors.textMuted,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  // ── Bottom Action Bar (Cancel / Refund) ──────────────────────────────────

  Future<void> _handleCancelOrder() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hủy đơn hàng'),
        content: const Text('Bạn có chắc muốn hủy đơn hàng này không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Không'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.primary),
            child: const Text('Hủy đơn'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final ok = await _viewModel.cancelOrder();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(ok ? 'Đã hủy đơn hàng thành công' : 'Hủy đơn thất bại, vui lòng thử lại'),
        backgroundColor: ok ? const Color(0xFF2E7D32) : AppColors.primary,
      ),
    );
  }

  Future<void> _handleRequestRefund() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Yêu cầu hoàn tiền'),
        content: const Text('Bạn có chắc muốn yêu cầu hoàn tiền cho đơn hàng này không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Không'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.primary),
            child: const Text('Hoàn tiền'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final ok = await _viewModel.requestRefund();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(ok ? 'Yêu cầu hoàn tiền đã được gửi' : 'Hoàn tiền thất bại, vui lòng thử lại'),
        backgroundColor: ok ? const Color(0xFF2E7D32) : AppColors.primary,
      ),
    );
  }

  Widget _buildBottomActionBar() {
    final isBusy = _viewModel.isCancelling || _viewModel.isRefunding;
    return Container(
      padding: EdgeInsets.fromLTRB(
          16, 12, 16, 12 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(top: BorderSide(color: Color(0xFFEEEEEE))),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: isBusy ? null : _handleCancelOrder,
              icon: _viewModel.isCancelling
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: AppColors.primary),
                    )
                  : const Icon(Icons.cancel_outlined, size: 18),
              label: Text(
                'Hủy đơn',
                style: GoogleFonts.publicSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: AppColors.primary),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: isBusy ? null : _handleRequestRefund,
              icon: _viewModel.isRefunding
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.currency_exchange_rounded, size: 18),
              label: Text(
                'Hoàn tiền',
                style: GoogleFonts.publicSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                elevation: 2,
                shadowColor: AppColors.primary.withValues(alpha: 0.3),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Bottom Pay Bar ────────────────────────────────────────────────────────

  Widget _buildBottomPayBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(
          16, 12, 16, 12 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(top: BorderSide(color: Color(0xFFEEEEEE))),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        children: [
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'HẾT HẠN SAU',
                style: GoogleFonts.publicSans(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMuted,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 2),
              Row(
                children: [
                  const Icon(Icons.timer_rounded,
                      size: 14, color: AppColors.primary),
                  const SizedBox(width: 4),
                  Text(
                    _formatCountdown(_viewModel.remainingSeconds),
                    style: GoogleFonts.publicSans(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: _viewModel.isProcessingPayment || _viewModel.isExpired
                  ? null
                  : _handlePayment,
              icon: _viewModel.isProcessingPayment
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.payment_rounded, size: 20),
              label: Text(
                'Tiếp tục thanh toán',
                style: GoogleFonts.publicSans(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                elevation: 3,
                shadowColor: AppColors.primary.withValues(alpha: 0.35),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  Widget _card({
    required IconData icon,
    required String title,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: AppColors.primary, size: 18),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: GoogleFonts.publicSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textMain,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, color: Color(0xFFF4F4F4)),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }

  Widget _infoRow(String label, {String? value, Widget? trailing}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.publicSans(
            fontSize: 13,
            color: AppColors.textMuted,
          ),
        ),
        trailing ??
            Text(
              value ?? '-',
              style: GoogleFonts.publicSans(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.textMain,
              ),
              textAlign: TextAlign.end,
            ),
      ],
    );
  }
}
