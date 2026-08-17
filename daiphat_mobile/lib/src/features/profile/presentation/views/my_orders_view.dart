import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/checkout/models/order_type.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/widgets/brand_scrollbar.dart';
import '../viewmodels/my_orders_viewmodel.dart';

class MyOrdersView extends ConsumerStatefulWidget {
  const MyOrdersView({super.key});

  @override
  ConsumerState<MyOrdersView> createState() => _MyOrdersViewState();
}

class _MyOrdersViewState extends ConsumerState<MyOrdersView> {
  late MyOrdersViewModel _viewModel;
  final _scrollController = ScrollController();

  static const _statusFilters = <(String?, String)>[
    (null, 'Tất cả'),
    ('PENDING_PAYMENT', 'Chờ TT'),
    ('PAID', 'Đã TT'),
    ('PREPARING', 'Chuẩn bị'),
    ('PENDING_PICKUP', 'Chờ lấy'),
    ('COMPLETED', 'Hoàn thành'),
    ('CANCELLED', 'Đã hủy'),
  ];

  @override
  void initState() {
    super.initState();
    _viewModel = MyOrdersViewModel(ref.read(orderServiceProvider));
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _viewModel.fetchOrders();
    }
  }

  @override
  void dispose() {
    _viewModel.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
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
          'Đơn hàng của tôi',
          style: GoogleFonts.publicSans(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        centerTitle: true,
      ),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          return Column(
            children: [
              _buildStatusFilter(),
              const Divider(height: 1, color: Color(0xFFEEEEEE)),
              Expanded(child: _buildBody()),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatusFilter() {
    return Container(
      color: Colors.white,
      height: 50,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        itemCount: _statusFilters.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final (value, label) = _statusFilters[index];
          final isSelected = _viewModel.selectedStatus == value;
          return GestureDetector(
            onTap: () => _viewModel.setStatusFilter(value),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : const Color(0xFFF4F6F8),
                borderRadius: BorderRadius.circular(20),
              ),
              alignment: Alignment.center,
              child: Text(
                label,
                style: GoogleFonts.publicSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : AppColors.textMuted,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBody() {
    if (_viewModel.isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (_viewModel.error != null && _viewModel.orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.textMuted),
            const SizedBox(height: 12),
            Text(
              'Không thể tải đơn hàng',
              style: GoogleFonts.publicSans(
                fontSize: 15,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => _viewModel.fetchOrders(refresh: true),
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

    if (_viewModel.orders.isEmpty) {
      return _buildEmptyState();
    }

    return BrandScrollbar(
      controller: _scrollController,
      child: RefreshIndicator(
        onRefresh: () => _viewModel.fetchOrders(refresh: true),
        color: AppColors.primary,
        child: ListView.builder(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          itemCount:
              _viewModel.orders.length + (_viewModel.isLoadingMore ? 1 : 0),
          itemBuilder: (context, index) {
            if (index == _viewModel.orders.length) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              );
            }
            final order = _viewModel.orders[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: GestureDetector(
                onTap: () => context.pushNamed(
                  AppRoute.orderDetail.name,
                  pathParameters: {'id': order.id},
                ),
                child: _buildOrderCard(order),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              color: Color(0xFFF4F6F8),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.receipt_long_outlined,
              size: 40,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Chưa có đơn hàng nào',
            style: GoogleFonts.publicSans(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textMain,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Hãy mua vé số để tham gia ngay!',
            style: GoogleFonts.publicSans(
              fontSize: 14,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderCard(OrderResponse order) {
    final status = OrderStatus.fromValue(order.status);
    final statusColor = _statusColor(order.status);

    String? formattedCreatedAt;
    if (order.createdAt != null) {
      try {
        final dt = DateTime.parse(order.createdAt!).toLocal();
        formattedCreatedAt = DateFormat('dd/MM/yyyy - HH:mm').format(dt);
      } catch (_) {}
    }

    String? formattedPickupAt;
    if (order.expectedPickupAt != null) {
      try {
        final dt = DateTime.parse(order.expectedPickupAt!).toLocal();
        formattedPickupAt = DateFormat('HH:mm, dd/MM').format(dt);
      } catch (_) {}
    }

    final currencyFmt = NumberFormat.currency(
      locale: 'vi_VN',
      symbol: '₫',
      decimalDigits: 0,
    );

    final receiveLabel = order.receiveType == 'COUNTER_PICKUP'
        ? 'Nhận tại quầy'
        : order.receiveType == 'DELIVERY'
            ? 'Giao tận nơi'
            : 'Nhận tại quầy';

    return Container(
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
          // ── Header: order code + status badge ──
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Row(
              children: [
                const Icon(Icons.receipt_outlined, size: 16, color: AppColors.primary),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'DP${order.orderCode}',
                    style: GoogleFonts.publicSans(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textMain,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    status.label,
                    style: GoogleFonts.publicSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Created at ──
          if (formattedCreatedAt != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
              child: Row(
                children: [
                  const Icon(Icons.access_time_rounded, size: 13, color: AppColors.textMuted),
                  const SizedBox(width: 5),
                  Text(
                    formattedCreatedAt,
                    style: GoogleFonts.publicSans(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),

          const Divider(height: 1, color: Color(0xFFF0F0F0)),

          // ── Footer: receive type | pickup time | total ──
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.store_outlined, size: 14, color: AppColors.textMuted),
                          const SizedBox(width: 5),
                          Text(
                            receiveLabel,
                            style: GoogleFonts.publicSans(
                              fontSize: 13,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                      if (formattedPickupAt != null) ...[
                        const SizedBox(height: 5),
                        Row(
                          children: [
                            const Icon(Icons.schedule_rounded, size: 14, color: AppColors.textMuted),
                            const SizedBox(width: 5),
                            Text(
                              'Lấy lúc: $formattedPickupAt',
                              style: GoogleFonts.publicSans(
                                fontSize: 13,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  currencyFmt.format(order.totalAmount),
                  style: GoogleFonts.publicSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
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
}
