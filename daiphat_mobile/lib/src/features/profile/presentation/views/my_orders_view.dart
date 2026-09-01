import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/checkout/models/order_type.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/profile_iconography.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_status_tab_bar.dart';
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
  final _searchController = TextEditingController();
  Timer? _searchDebounce;
  bool _isSearchMode = false;
  final Set<String> _expandedOrderIds = {};

  static const _statusFilters = <AppStatusTabItem<String?>>[
    AppStatusTabItem(value: null, label: 'Tất cả'),
    AppStatusTabItem(value: 'PENDING_PAYMENT', label: 'Chờ thanh toán'),
    AppStatusTabItem(value: 'PAID', label: 'Đã thanh toán'),
    AppStatusTabItem(value: 'PREPARING', label: 'Đang chuẩn bị'),
    AppStatusTabItem(value: 'PENDING_PICKUP', label: 'Chờ nhận vé'),
    AppStatusTabItem(value: 'COMPLETED', label: 'Hoàn thành'),
    AppStatusTabItem(value: 'CANCELLED', label: 'Đã hủy'),
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
    _searchDebounce?.cancel();
    _viewModel.dispose();
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: _isSearchMode ? _buildSearchAppBar() : _buildMainAppBar(),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          if (_isSearchMode) {
            return _buildSearchScreenContent();
          }

          return Column(
            children: [
              // 1. Status Tabs
              AppStatusTabBar<String?>(
                items: _statusFilters,
                selectedValue: _viewModel.selectedStatus,
                onSelected: (value) => _viewModel.setStatusFilter(value),
              ),

              // 2. Order List
              Expanded(child: _buildBody()),
            ],
          );
        },
      ),
    );
  }

  AppBar _buildMainAppBar() {
    return AppBar(
      backgroundColor: Theme.of(context).colorScheme.surface,
      surfaceTintColor: AppColors.transparent,
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
        style: AppTypography.h4(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: AppColors.textMain,
        ),
      ),
      centerTitle: true,
      actions: [
        IconButton(
          icon: const Icon(
            Icons.search_rounded,
            size: 24,
            color: AppColors.primary,
          ),
          tooltip: 'Tìm kiếm đơn hàng',
          onPressed: () {
            setState(() {
              _isSearchMode = true;
            });
          },
        ),
        _buildChatActionButton(),
        const SizedBox(width: 4),
      ],
    );
  }

  AppBar _buildSearchAppBar() {
    return AppBar(
      backgroundColor: Theme.of(context).colorScheme.surface,
      surfaceTintColor: AppColors.transparent,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back, size: 24, color: AppColors.primary),
        onPressed: () {
          setState(() {
            _isSearchMode = false;
            _searchController.clear();
            _viewModel.setSearch('');
          });
        },
      ),
      title: Text(
        'Tìm kiếm đơn hàng',
        style: AppTypography.h4(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: AppColors.contentNavy,
        ),
      ),
      centerTitle: true,
      actions: [_buildChatActionButton(), const SizedBox(width: 4)],
    );
  }

  Widget _buildChatActionButton() {
    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: const Icon(
            ProfileIconography.chat,
            size: 23,
            color: AppColors.primary,
          ),
          tooltip: 'Chat hỗ trợ',
          onPressed: () => context.push(AppRoute.chat.path),
        ),
        Positioned(
          top: 10,
          right: 10,
          child: Container(
            width: 7.5,
            height: 7.5,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSearchScreenContent() {
    return Column(
      children: [
        Container(
          color: AppColors.surfacePrimary,
          padding: const EdgeInsets.fromLTRB(14, 6, 14, 12),
          child: TextField(
            controller: _searchController,
            autofocus: true,
            textInputAction: TextInputAction.search,
            onSubmitted: _viewModel.setSearch,
            style: AppTypography.bodyMedium(fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Mã đơn hàng, đài quay hoặc số vé...',
              hintStyle: AppTypography.bodyMedium(
                fontSize: 13.5,
                color: AppColors.contentDisabled,
              ),
              prefixIcon: const Icon(
                Icons.search_rounded,
                size: 20,
                color: AppColors.contentPlaceholder,
              ),
              suffixIcon: _searchController.text.trim().isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(
                        Icons.close_rounded,
                        size: 18,
                        color: AppColors.contentPlaceholder,
                      ),
                      onPressed: () {
                        _searchController.clear();
                        _viewModel.setSearch('');
                        setState(() {});
                      },
                    ),
              filled: true,
              fillColor: AppColors.surfaceDisabled,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 9,
              ),
              isDense: true,
            ),
            onChanged: (value) {
              setState(() {});
              _searchDebounce?.cancel();
              _searchDebounce = Timer(const Duration(milliseconds: 450), () {
                _viewModel.setSearch(value);
              });
            },
          ),
        ),

        const Divider(height: 1, color: AppColors.borderLight),

        Expanded(
          child: _searchController.text.trim().isEmpty
              ? _buildSearchEmptyPrompt()
              : _buildBody(),
        ),
      ],
    );
  }

  Widget _buildSearchEmptyPrompt() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Icon(
                    ProfileIconography.order,
                    size: 56,
                    color: AppColors.primary.withValues(alpha: 0.35),
                  ),
                  Positioned(
                    right: 18,
                    bottom: 18,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.search_rounded,
                        size: 20,
                        color: AppColors.surfacePrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Bạn có thể tìm kiếm theo mã đơn hàng, đài quay\nhoặc số vé đặt mua',
              textAlign: TextAlign.center,
              style: AppTypography.bodyMedium(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.contentSecondary,
                height: 1.45,
              ),
            ),
          ],
        ),
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
            const Icon(
              Icons.error_outline,
              size: 48,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: 12),
            Text(
              'Không thể tải đơn hàng',
              style: AppTypography.bodyMedium(
                fontSize: 15,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => _viewModel.fetchOrders(refresh: true),
              child: Text(
                'Thử lại',
                style: AppTypography.buttonMedium(
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
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
              padding: const EdgeInsets.only(bottom: 10),
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
              color: AppColors.borderLight,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              ProfileIconography.order,
              size: 40,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Chưa có đơn hàng nào',
            style: AppTypography.h4(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textMain,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Hãy mua vé số để tham gia ngay!',
            style: AppTypography.bodyMedium(
              fontSize: 14,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderCard(OrderResponse order) {
    final statusStyle = _statusStyle(order.status);
    final items = order.orderDetails ?? [];
    final totalTickets = items.isNotEmpty
        ? items.fold<int>(0, (sum, i) => sum + i.quantity)
        : 1;

    final receiveLabel = order.receiveType == 'COUNTER_PICKUP'
        ? 'Nhận tại quầy'
        : order.receiveType == 'DELIVERY'
        ? 'Giao tận nơi'
        : 'Nhận tại quầy';

    final isExpanded = _expandedOrderIds.contains(order.id);
    final displayedItems = isExpanded
        ? items
        : (items.isNotEmpty ? [items.first] : <OrderDetailItem>[]);
    final hasMoreTickets = items.length > 1;

    final actionButtons = _buildOrderActionButtons(order);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.borderLight, width: 0.8),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowFaint,
            blurRadius: 6,
            offset: Offset(0, 1.5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header: Icon store + Tên đại lý/Mã đơn + Trạng thái chữ Shopee ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                const Icon(
                  Icons.storefront_outlined,
                  size: 17,
                  color: AppColors.contentPrimary,
                ),
                const SizedBox(width: 7),
                Expanded(
                  child: Text(
                    'Đại Phát Lottery  •  DP${order.orderCode}',
                    style: AppTypography.subtitle2(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.contentPrimary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  statusStyle.label,
                  style: AppTypography.caption(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: statusStyle.text,
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: AppColors.borderLight),

          // ── Body: Danh sách thông tin vé (Hiện số, hiện đài, không thumbnail) ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            child: Column(
              children: [
                if (items.isEmpty)
                  _buildEmptyTicketRow(order, receiveLabel)
                else
                  for (int i = 0; i < displayedItems.length; i++)
                    _buildTicketRow(
                      displayedItems[i],
                      receiveLabel,
                      isLast: i == displayedItems.length - 1 && !hasMoreTickets,
                    ),

                // Nút "Xem thêm (n vé) ⌵" hoặc "Thu gọn ▴"
                if (hasMoreTickets)
                  InkWell(
                    onTap: () {
                      setState(() {
                        if (isExpanded) {
                          _expandedOrderIds.remove(order.id);
                        } else {
                          _expandedOrderIds.add(order.id);
                        }
                      });
                    },
                    borderRadius: BorderRadius.circular(6),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            isExpanded
                                ? 'Thu gọn'
                                : 'Xem thêm (${items.length - 1} vé)',
                            style: AppTypography.caption(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                              color: AppColors.contentSecondary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            isExpanded
                                ? Icons.keyboard_arrow_up_rounded
                                : Icons.keyboard_arrow_down_rounded,
                            size: 17,
                            color: AppColors.contentSecondary,
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),

          const Divider(height: 1, color: AppColors.borderLight),

          // ── Footer: Tổng tiền + Nút hành động theo trạng thái ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      'Tổng số tiền ($totalTickets vé): ',
                      style: AppTypography.bodySmall(
                        fontSize: 13,
                        color: AppColors.contentSecondary,
                      ),
                    ),
                    Text(
                      AppFormatters.formatCurrency(order.totalAmount),
                      style: AppTypography.priceMedium(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.brandPrimary,
                      ),
                    ),
                  ],
                ),
                if (actionButtons.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: actionButtons,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketRow(
    OrderDetailItem item,
    String receiveLabel, {
    bool isLast = false,
  }) {
    final ticket = item.lotteryTicket;
    final station = ticket?.province ?? ticket?.stationName;
    final rawDrawDate = ticket?.drawDate;
    final symbol = ticket?.symbol;
    final numbers = ticket?.numbers;
    final ticketType = ticket?.ticketType;

    String? formattedDrawDate;
    if (rawDrawDate != null && rawDrawDate.trim().isNotEmpty) {
      try {
        final dt = DateTime.parse(rawDrawDate.trim());
        formattedDrawDate = DateFormat('dd/MM/yyyy').format(dt);
      } catch (_) {
        formattedDrawDate = rawDrawDate.trim();
      }
    }

    // Tên đài / Vé số
    final title = station != null && station.trim().isNotEmpty
        ? (station.trim().startsWith('Xổ số')
              ? station.trim()
              : 'Xổ số ${station.trim()}')
        : ticketType != null && ticketType.trim().isNotEmpty
        ? 'Vé số $ticketType'
        : 'Vé Xổ Số Kiến Thiết';

    final subInfo = [
      if (numbers != null && numbers.trim().isNotEmpty) 'Số: $numbers',
      if (formattedDrawDate != null && formattedDrawDate.isNotEmpty)
        'Kỳ quay: $formattedDrawDate',
      if (symbol != null && symbol.trim().isNotEmpty) 'Ký hiệu: $symbol',
      receiveLabel,
    ].join('  •  ');

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : const Border(
                bottom: BorderSide(color: AppColors.borderLight, width: 0.8),
              ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.bodyLarge(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.contentPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'x${item.quantity}',
                style: AppTypography.bodySmall(
                  fontSize: 13,
                  color: AppColors.contentMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Text(
                  subInfo,
                  style: AppTypography.caption(
                    fontSize: 12,
                    color: AppColors.contentMuted,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                AppFormatters.formatCurrency(item.price),
                style: AppTypography.bodyMedium(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.contentPrimary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyTicketRow(OrderResponse order, String receiveLabel) {
    String? formattedPickupAt;
    if (order.expectedPickupAt != null) {
      try {
        final dt = DateTime.parse(order.expectedPickupAt!).toLocal();
        formattedPickupAt = DateFormat('HH:mm, dd/MM').format(dt);
      } catch (_) {}
    }

    final subInfo = [
      receiveLabel,
      if (formattedPickupAt != null) 'Hẹn lấy: $formattedPickupAt',
    ].join('  •  ');

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 9),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Vé Xổ Số Đại Phát',
                  style: AppTypography.bodyLarge(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.contentPrimary,
                  ),
                ),
              ),
              Text(
                'x1',
                style: AppTypography.bodySmall(
                  fontSize: 13,
                  color: AppColors.contentMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Text(
                  subInfo,
                  style: AppTypography.caption(
                    fontSize: 12,
                    color: AppColors.contentMuted,
                  ),
                ),
              ),
              Text(
                AppFormatters.formatCurrency(order.totalAmount),
                style: AppTypography.bodyMedium(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.contentPrimary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  List<Widget> _buildOrderActionButtons(OrderResponse order) {
    final buttons = <Widget>[];

    if (order.status == 'PENDING_PAYMENT') {
      buttons.add(
        ElevatedButton(
          onPressed: () => context.pushNamed(
            AppRoute.orderDetail.name,
            pathParameters: {'id': order.id},
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.brandPrimary,
            foregroundColor: AppColors.surfacePrimary,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(6),
            ),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(
            'Thanh toán ngay',
            style: AppTypography.buttonSmall(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: AppColors.surfacePrimary,
            ),
          ),
        ),
      );
    } else if (order.refundEligible == true) {
      buttons.add(
        OutlinedButton(
          onPressed: () => context.pushNamed(
            AppRoute.orderDetail.name,
            pathParameters: {'id': order.id},
          ),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.contentPrimary,
            side: const BorderSide(color: AppColors.borderDefault),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(6),
            ),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(
            'Yêu cầu hoàn tiền',
            style: AppTypography.buttonSmall(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: AppColors.contentPrimary,
            ),
          ),
        ),
      );
    } else if (order.status == 'CANCELLED') {
      buttons.add(
        OutlinedButton(
          onPressed: () => context.pushNamed(
            AppRoute.orderDetail.name,
            pathParameters: {'id': order.id},
          ),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.contentPrimary,
            side: const BorderSide(color: AppColors.borderDefault),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(6),
            ),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(
            'Xem thông tin hoàn tiền',
            style: AppTypography.buttonSmall(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: AppColors.contentPrimary,
            ),
          ),
        ),
      );
    }

    return buttons;
  }

  ({Color surface, Color text, String label}) _statusStyle(String status) {
    switch (status) {
      case 'PENDING_PAYMENT':
        return (
          surface: AppColors.statusWarningSurface,
          text: AppColors.statusWarningForeground,
          label: 'Chờ thanh toán',
        );
      case 'PAID':
        return (
          surface: AppColors.statusInfoSurface,
          text: AppColors.statusInfoForeground,
          label: 'Đã thanh toán',
        );
      case 'PREPARING':
        return (
          surface: AppColors.statusAttentionSurface,
          text: AppColors.statusAttentionForeground,
          label: 'Đang chuẩn bị',
        );
      case 'PENDING_PICKUP':
        return (
          surface: AppColors.surfaceSuccess,
          text: AppColors.statusSuccessForeground,
          label: 'Chờ nhận vé',
        );
      case 'COMPLETED':
        return (
          surface: AppColors.statusSuccessSurface,
          text: AppColors.statusSuccessForeground,
          label: 'Hoàn thành',
        );
      case 'CANCELLED':
        return (
          surface: AppColors.statusNeutralSurface,
          text: AppColors.statusNeutralForeground,
          label: 'Đã hủy',
        );
      default:
        return (
          surface: AppColors.statusNeutralSurface,
          text: AppColors.contentMuted,
          label: status,
        );
    }
  }
}
