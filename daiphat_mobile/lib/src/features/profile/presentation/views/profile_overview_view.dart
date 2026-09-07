import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';
import 'package:daiphat_mobile/src/features/orders/presentation/providers/orders_providers.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/entities/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/providers/purchased_tickets_providers.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/profile_iconography.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import '../viewmodels/profile_overview_viewmodel.dart';

class ProfileOverviewView extends ConsumerStatefulWidget {
  const ProfileOverviewView({super.key});

  @override
  ConsumerState<ProfileOverviewView> createState() =>
      _ProfileOverviewViewState();
}

class _ProfileOverviewViewState extends ConsumerState<ProfileOverviewView> {
  late final ProfileOverviewViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = ProfileOverviewViewModel(
      ref.read(getMyOrdersProvider),
      ref.read(getMyTicketsProvider),
      ref.read(getMyTicketsSummaryProvider),
    );
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
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
          'Tổng quan vé số',
          style: AppTypography.h4(
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
          if (_viewModel.isLoading && _viewModel.recentOrders.isEmpty) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }
          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _viewModel.load,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
              children: [
                _buildStatsSection(),
                const SizedBox(height: 14),
                _buildQuickActions(),
                if (_viewModel.recentOrders.isNotEmpty ||
                    _viewModel.recentTickets.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  _buildRecentActivity(),
                ],
                if (_viewModel.recentTickets.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  _buildSpendingStats(),
                ],
                const SizedBox(height: 14),
                _buildSupportBanner(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatsSection() {
    final stats = _viewModel.ticketStats;
    return _buildCard(
      title: 'Hoạt động của bạn',
      accented: true,
      child: Row(
        children: [
          _buildStatCard(
            icon: ProfileIconography.order,
            color: ProfileIconTone.order,
            surface: ProfileIconTone.orderSurface,
            value: '${_viewModel.totalOrders}',
            label: 'Đơn hàng',
          ),
          const SizedBox(width: 8),
          _buildStatCard(
            icon: ProfileIconography.ticket,
            color: ProfileIconTone.ticket,
            surface: ProfileIconTone.ticketSurface,
            value: '${_viewModel.totalTicketsBought}',
            label: 'Vé đã mua',
          ),
          const SizedBox(width: 8),
          _buildStatCard(
            icon: ProfileIconography.prize,
            color: ProfileIconTone.prize,
            surface: ProfileIconTone.prizeSurface,
            value: '${stats.wonCount}',
            label: 'Trúng thưởng',
          ),
          const SizedBox(width: 8),
          _buildStatCard(
            icon: ProfileIconography.drawnTicket,
            color: ProfileIconTone.drawn,
            surface: ProfileIconTone.drawnSurface,
            value: '${stats.drawnCount}',
            label: 'Đã quay',
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required Color color,
    required Color surface,
    required String value,
    required String label,
  }) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
        child: Column(
          children: [
            ProfileIconWell(
              icon: icon,
              color: color,
              surface: surface,
              size: 38,
              iconSize: 21,
            ),
            const SizedBox(height: 6),
            Text(
              value,
              style: AppTypography.h3(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppColors.contentHeading,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.caption(
                fontSize: 10,
                color: AppColors.contentNeutral,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    final actions = <_QuickAction>[
      _QuickAction(
        ProfileIconography.buyTicket,
        'Mua vé số',
        ProfileIconTone.ticket,
        ProfileIconTone.ticketSurface,
        () => context.go(AppRoute.buyTicket.path),
      ),
      _QuickAction(
        ProfileIconography.ticket,
        'Vé của tôi',
        ProfileIconTone.ticket,
        ProfileIconTone.ticketSurface,
        () => context.push(AppRoute.myTickets.path),
      ),
      _QuickAction(
        ProfileIconography.drawnTicket,
        'Kết quả xổ số',
        ProfileIconTone.standard,
        ProfileIconTone.standardSurface,
        () => context.go(AppRoute.home.path),
      ),
      _QuickAction(
        ProfileIconography.support,
        'Hỗ trợ',
        ProfileIconTone.standard,
        ProfileIconTone.standardSurface,
        () => context.push(AppRoute.complaints.path),
      ),
    ];

    return _buildCard(
      title: 'Thao tác nhanh',
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: actions
            .map(
              (a) => Expanded(
                child: InkWell(
                  onTap: a.onTap,
                  borderRadius: BorderRadius.circular(10),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 76),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 3,
                        vertical: 8,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          ProfileIconWell(
                            icon: a.icon,
                            color: a.color,
                            surface: a.surface,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            a.label,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.caption(
                              fontSize: 10,
                              height: 1.2,
                              fontWeight: FontWeight.w600,
                              color: AppColors.contentSlate700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildRecentActivity() {
    final orders = _viewModel.recentOrders;
    final tickets = _viewModel.recentTickets;
    final hasOrders = orders.isNotEmpty;
    final hasTickets = tickets.isNotEmpty;

    return _buildCard(
      title: 'Hoạt động gần đây',
      child: Column(
        children: [
          if (hasOrders) ...[
            _buildActivitySubheader(
              icon: ProfileIconography.order,
              color: ProfileIconTone.order,
              title: 'Đơn hàng',
              onSeeAll: () => context.push(AppRoute.myOrders.path),
            ),
            for (var i = 0; i < orders.length; i++) ...[
              if (i > 0)
                const Divider(height: 1, color: AppColors.surfaceNeutral),
              _buildOrderRow(orders[i]),
            ],
          ],
          if (hasOrders && hasTickets)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 10),
              child: Divider(height: 1, color: AppColors.borderDecorative),
            ),
          if (hasTickets) ...[
            _buildActivitySubheader(
              icon: ProfileIconography.ticket,
              color: ProfileIconTone.ticket,
              title: 'Vé số',
              onSeeAll: () => context.push(AppRoute.myTickets.path),
            ),
            for (var i = 0; i < tickets.length; i++) ...[
              if (i > 0) const SizedBox(height: 4),
              _buildTicketRow(tickets[i]),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildActivitySubheader({
    required IconData icon,
    required Color color,
    required String title,
    required VoidCallback onSeeAll,
  }) {
    return Row(
      children: [
        Icon(icon, color: color, size: 19),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            title,
            style: AppTypography.bodySmall(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.contentHeading,
            ),
          ),
        ),
        InkWell(
          onTap: onSeeAll,
          borderRadius: BorderRadius.circular(8),
          child: const SizedBox(
            width: 44,
            height: 44,
            child: Icon(
              ProfileIconography.chevron,
              color: AppColors.contentDisabled,
              size: 19,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOrderRow(OrderResponse order) {
    final status = OrderStatus.fromValue(order.status);
    final badge = _statusBadge(status);
    String createdAt = '';
    if (order.createdAt != null) {
      final dt = DateTime.tryParse(order.createdAt!)?.toLocal();
      if (dt != null) createdAt = DateFormat('dd/MM/yyyy - HH:mm').format(dt);
    }
    final qty =
        order.orderDetails?.fold<int>(0, (sum, e) => sum + e.quantity) ?? 0;

    return InkWell(
      onTap: () => context.push('/profile/orders/${order.id}'),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    order.orderCode.isNotEmpty
                        ? order.orderCode
                        : 'DP${order.id}',
                    style: AppTypography.subtitle2(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.contentHeading,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    createdAt,
                    style: AppTypography.caption(
                      fontSize: 11,
                      color: AppColors.contentNeutral,
                    ),
                  ),
                ],
              ),
            ),
            if (qty > 0)
              Padding(
                padding: const EdgeInsets.only(right: 10),
                child: Text(
                  '$qty vé',
                  style: AppTypography.bodySmall(
                    fontSize: 12,
                    color: AppColors.contentNeutral,
                  ),
                ),
              ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  AppFormatters.formatCurrency(order.totalAmount),
                  style: AppTypography.subtitle2(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.contentHeading,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: badge.bg,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    status.label,
                    style: AppTypography.caption(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: badge.fg,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  ({Color fg, Color bg}) _statusBadge(OrderStatus status) {
    switch (status) {
      case OrderStatus.completed:
      case OrderStatus.paid:
        return (
          fg: AppColors.statusSuccess,
          bg: AppColors.statusSuccessSurface,
        );
      case OrderStatus.cancelled:
        return (fg: AppColors.contentNeutral, bg: AppColors.surfaceNeutral);
      case OrderStatus.pendingPayment:
      case OrderStatus.preparing:
      case OrderStatus.pendingPickup:
        return (
          fg: AppColors.statusWarningForeground,
          bg: AppColors.statusWarningSurface,
        );
    }
  }

  Widget _buildTicketRow(PurchasedTicket ticket) {
    String drawDate = '';
    final purchased = DateTime.tryParse(ticket.purchasedAt)?.toLocal();
    final draw = DateTime.tryParse(ticket.drawDate)?.toLocal();
    if (purchased != null) {
      drawDate = DateFormat('dd/MM/yyyy - HH:mm').format(purchased);
    } else if (draw != null) {
      drawDate = DateFormat('dd/MM/yyyy').format(draw);
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          const ProfileIconWell(
            icon: ProfileIconography.ticket,
            color: ProfileIconTone.ticket,
            surface: ProfileIconTone.ticketSurface,
            size: 42,
            iconSize: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ticket.stationName ?? 'Vé số',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.subtitle2(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.contentHeading,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  drawDate,
                  style: AppTypography.caption(
                    fontSize: 11,
                    color: AppColors.contentNeutral,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                ticket.numbers,
                style: AppTypography.lotteryDigit(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '1 vé - ${AppFormatters.formatCurrency(ticket.price)}',
                style: AppTypography.caption(
                  fontSize: 11,
                  color: AppColors.contentNeutral,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSpendingStats() {
    final slices = _buildSpendingSlices();
    final total = slices.fold<int>(0, (sum, e) => sum + e.amount);

    return _buildCard(
      title: 'Thống kê chi tiêu theo nhà đài',
      child: slices.isEmpty
          ? _buildEmpty(
              'Chưa có dữ liệu chi tiêu',
              icon: ProfileIconography.spending,
              color: ProfileIconTone.spending,
              surface: ProfileIconTone.spendingSurface,
            )
          : Column(
              children: [
                const SizedBox(height: 8),
                SizedBox(
                  width: 168,
                  height: 168,
                  child: CustomPaint(
                    painter: _DonutChartPainter(slices: slices),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            AppFormatters.formatCurrency(total),
                            style: AppTypography.priceMedium(
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                              color: AppColors.contentHeading,
                            ),
                          ),
                          Text(
                            'Tổng chi tiêu',
                            style: AppTypography.caption(
                              fontSize: 11,
                              color: AppColors.contentNeutral,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                ...slices.map((slice) {
                  final pct = total == 0
                      ? 0
                      : ((slice.amount / total) * 100).round();
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: slice.color,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            slice.label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.bodySmall(
                              fontSize: 13,
                              color: AppColors.contentSlate700,
                            ),
                          ),
                        ),
                        SizedBox(
                          width: 40,
                          child: Text(
                            '$pct%',
                            textAlign: TextAlign.right,
                            style: AppTypography.bodySmall(
                              fontSize: 13,
                              color: AppColors.contentNeutral,
                            ),
                          ),
                        ),
                        SizedBox(
                          width: 88,
                          child: Text(
                            AppFormatters.formatCurrency(slice.amount),
                            textAlign: TextAlign.right,
                            style: AppTypography.bodySmall(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.contentHeading,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
    );
  }

  List<_SpendSlice> _buildSpendingSlices() {
    const palette = [
      AppColors.brandPrimaryStrong,
      AppColors.brandPrimaryDark,
      AppColors.brandAccentGoldAmber,
      AppColors.contentSlate600,
      AppColors.contentMuted,
    ];
    final map = <String, int>{};
    for (final ticket in _viewModel.recentTickets) {
      final key = ticket.stationName?.trim().isNotEmpty == true
          ? ticket.stationName!
          : 'Vé số khác';
      map[key] = (map[key] ?? 0) + ticket.price;
    }
    if (map.isEmpty) return const [];

    final entries = map.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    if (entries.length <= 5) {
      return [
        for (var i = 0; i < entries.length; i++)
          _SpendSlice(
            label: entries[i].key,
            amount: entries[i].value,
            color: palette[i % palette.length],
          ),
      ];
    }

    final top = entries.take(4).toList();
    final otherAmount = entries.skip(4).fold<int>(0, (sum, e) => sum + e.value);
    return [
      for (var i = 0; i < top.length; i++)
        _SpendSlice(label: top[i].key, amount: top[i].value, color: palette[i]),
      _SpendSlice(label: 'Vé số khác', amount: otherAmount, color: palette[4]),
    ];
  }

  Widget _buildSupportBanner() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 12, 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [
            AppColors.surfaceDestructiveSoft,
            AppColors.surfaceBrandWarm,
          ],
        ),
        border: Border.all(color: AppColors.brandPrimaryBorderLight),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bạn cần hỗ trợ?',
                  style: AppTypography.h4(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.contentHeading,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Đội ngũ CSKH của chúng tôi luôn sẵn sàng!',
                  style: AppTypography.bodySmall(
                    fontSize: 12,
                    color: AppColors.contentNeutral,
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => context.push(AppRoute.complaints.path),
                  icon: const Icon(ProfileIconography.support, size: 16),
                  label: Text(
                    'Liên hệ ngay',
                    style: AppTypography.buttonMedium(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Icon(
            ProfileIconography.support,
            size: 56,
            color: AppColors.brandPrimaryBorder,
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty(
    String text, {
    IconData? icon,
    Color color = AppColors.contentMuted,
    Color surface = AppColors.surfaceSlate100,
    bool compact = false,
  }) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: compact ? 6 : 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (icon != null) ...[
            ProfileIconWell(
              icon: icon,
              color: color,
              surface: surface,
              size: compact ? 34 : 40,
              iconSize: compact ? 18 : 22,
            ),
            const SizedBox(width: 10),
          ],
          Flexible(
            child: Text(
              text,
              textAlign: TextAlign.center,
              style: AppTypography.bodySmall(
                fontSize: 12,
                color: AppColors.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard({
    required String title,
    required Widget child,
    VoidCallback? onSeeAll,
    bool accented = false,
  }) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 13, 14, 14),
      decoration: BoxDecoration(
        color: accented ? null : AppColors.surfacePrimary,
        gradient: accented
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.statusErrorSurface,
                  AppColors.surfacePrimary,
                ],
                stops: [0, .82],
              )
            : null,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: accented
              ? AppColors.brandPrimaryBorderLight
              : AppColors.borderDecorative,
        ),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 14,
            spreadRadius: -4,
            offset: Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.subtitle2(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.contentHeading,
                  ),
                ),
              ),
              if (onSeeAll != null)
                InkWell(
                  onTap: onSeeAll,
                  borderRadius: BorderRadius.circular(8),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 44),
                    child: Padding(
                      padding: const EdgeInsets.only(left: 12),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Xem tất cả',
                            style: AppTypography.caption(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 2),
                          const Icon(
                            ProfileIconography.chevron,
                            size: 18,
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _QuickAction {
  final IconData icon;
  final String label;
  final Color color;
  final Color surface;
  final VoidCallback onTap;

  const _QuickAction(
    this.icon,
    this.label,
    this.color,
    this.surface,
    this.onTap,
  );
}

class _SpendSlice {
  final String label;
  final int amount;
  final Color color;

  const _SpendSlice({
    required this.label,
    required this.amount,
    required this.color,
  });
}

class _DonutChartPainter extends CustomPainter {
  _DonutChartPainter({required this.slices});

  final List<_SpendSlice> slices;

  @override
  void paint(Canvas canvas, Size size) {
    final total = slices.fold<int>(0, (sum, e) => sum + e.amount);
    if (total <= 0) return;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2;
    final stroke = radius * 0.28;
    final rect = Rect.fromCircle(center: center, radius: radius - stroke / 2);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.butt;

    var start = -math.pi / 2;
    for (final slice in slices) {
      final sweep = (slice.amount / total) * 2 * math.pi;
      paint.color = slice.color;
      canvas.drawArc(rect, start, sweep, false, paint);
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(covariant _DonutChartPainter oldDelegate) {
    return oldDelegate.slices != slices;
  }
}
