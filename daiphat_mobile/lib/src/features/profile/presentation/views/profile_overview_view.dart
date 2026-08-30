import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/auth/data/models/user.dart';
import 'package:daiphat_mobile/src/features/checkout/models/order_type.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/viewmodels/profile_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import '../viewmodels/profile_overview_viewmodel.dart';

class ProfileOverviewView extends ConsumerStatefulWidget {
  const ProfileOverviewView({super.key, this.profileViewModel});

  final ProfileViewModel? profileViewModel;

  @override
  ConsumerState<ProfileOverviewView> createState() =>
      _ProfileOverviewViewState();
}

class _ProfileOverviewViewState extends ConsumerState<ProfileOverviewView> {
  late final ProfileOverviewViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = ProfileOverviewViewModel(ref.read(orderServiceProvider));
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
          'Tổng quan tài khoản',
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
                if (widget.profileViewModel != null)
                  ListenableBuilder(
                    listenable: widget.profileViewModel!,
                    builder: (context, _) {
                      final profileVm = widget.profileViewModel;
                      if (profileVm == null) return const SizedBox.shrink();
                      return _buildProfileBanner(profileVm.user);
                    },
                  ),
                if (widget.profileViewModel != null) const SizedBox(height: 14),
                _buildStatsSection(),
                const SizedBox(height: 14),
                _buildRecentOrders(),
                const SizedBox(height: 14),
                _buildQuickActions(),
                const SizedBox(height: 14),
                _buildRecentTickets(),
                const SizedBox(height: 14),
                _buildSpendingStats(),
                const SizedBox(height: 14),
                _buildSupportBanner(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildProfileBanner(User? user) {
    final rawName = user?.fullName?.trim();
    final username = user?.username.trim();
    final name =
        (rawName != null && rawName.isNotEmpty
                ? rawName
                : (username != null && username.isNotEmpty
                      ? username
                      : 'Thành viên Đại Phát'))
            .toUpperCase();
    final emailValue = user?.email?.trim();
    final email = (emailValue != null && emailValue.isNotEmpty)
        ? emailValue
        : 'Chưa cập nhật email';
    final phoneValue = user?.phone?.trim();
    final phone = (phoneValue != null && phoneValue.isNotEmpty)
        ? phoneValue
        : 'Chưa cập nhật SĐT';
    final avatarUrl = user?.avatarUrl;

    return Container(
      height: 132,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.brandPrimaryBorderLight),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowBrandFaint,
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(
            child: Image.asset(
              'assets/images/profile_cherry_bg.png',
              fit: BoxFit.cover,
              alignment: Alignment.topLeft,
              errorBuilder: (_, error, stackTrace) =>
                  Container(color: AppColors.surfaceDestructiveSoft),
            ),
          ),
          Positioned(
            right: -4,
            bottom: -2,
            width: 96,
            height: 100,
            child: Image.asset(
              'assets/images/thantai.png',
              fit: BoxFit.contain,
              alignment: Alignment.bottomRight,
              errorBuilder: (_, error, stackTrace) => const SizedBox.shrink(),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 16, 100, 14),
            child: Row(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceBrandWarm,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.brandPrimaryBorder),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: avatarUrl != null && avatarUrl.isNotEmpty
                      ? Image.network(
                          avatarUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, error, stackTrace) => const Icon(
                            Icons.person_rounded,
                            color: AppColors.primary,
                            size: 32,
                          ),
                        )
                      : const Icon(
                          Icons.person_rounded,
                          color: AppColors.primary,
                          size: 32,
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.subtitle2(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.contentHeading,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        email,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.bodySmall(
                          fontSize: 12,
                          color: AppColors.contentNeutral,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        phone,
                        style: AppTypography.bodySmall(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.contentSlate700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsSection() {
    final stats = _viewModel.ticketStats;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderLight),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 12,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          _buildStatCard(
            icon: Icons.receipt_long_rounded,
            color: AppColors.primary,
            bg: AppColors.surfaceDestructiveSoft,
            value: '${_viewModel.totalOrders}',
            label: 'Đơn hàng',
          ),
          const SizedBox(width: 8),
          _buildStatCard(
            icon: Icons.confirmation_number_rounded,
            color: AppColors.statusSuccess,
            bg: AppColors.statusSuccessSurface,
            value: '${_viewModel.totalTicketsBought}',
            label: 'Vé đã mua',
          ),
          const SizedBox(width: 8),
          _buildStatCard(
            icon: Icons.emoji_events_rounded,
            color: AppColors.statusWarningForeground,
            bg: AppColors.statusWarningSurface,
            value: '${stats.wonCount}',
            label: 'Trúng thưởng',
          ),
          const SizedBox(width: 8),
          _buildStatCard(
            icon: Icons.star_rounded,
            color: AppColors.brandAccentPurple,
            bg: AppColors.surfaceAccentPurple,
            value: '${stats.drawnCount}',
            label: 'Đã quay',
            iconRadius: 12,
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required Color color,
    required Color bg,
    required String value,
    required String label,
    double iconRadius = 999,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(iconRadius),
              ),
              child: Icon(icon, color: AppColors.surfacePrimary, size: 18),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: AppTypography.h3(
                fontSize: 18,
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
        Icons.confirmation_number_outlined,
        'Mua vé số',
        AppColors.brandPrimaryStrong,
        AppColors.statusErrorSurface,
        () => context.go(AppRoute.buyTicket.path),
      ),
      _QuickAction(
        Icons.account_balance_wallet_outlined,
        'Vé của tôi',
        AppColors.statusWarningForeground,
        AppColors.statusWarningSurface,
        () => context.push(AppRoute.myTickets.path),
      ),
      _QuickAction(
        Icons.pie_chart_outline_rounded,
        'Kết quả xổ số',
        AppColors.statusSuccess,
        AppColors.statusSuccessSurface,
        () => context.go(AppRoute.home.path),
      ),
      _QuickAction(
        Icons.headset_mic_outlined,
        'Hỗ trợ',
        AppColors.brandAccentPurple,
        AppColors.surfaceAccentPurple,
        () => context.push(AppRoute.complaints.path),
      ),
    ];

    return _buildCard(
      title: 'Thao tác nhanh',
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 2.2,
        children: actions
            .map(
              (a) => InkWell(
                onTap: a.onTap,
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: a.bg,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(a.icon, color: a.color, size: 20),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        a.label,
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.bodySmall(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.contentSlate700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildRecentOrders() {
    final orders = _viewModel.recentOrders;
    return _buildCard(
      title: 'Đơn hàng gần đây',
      onSeeAll: () => context.push(AppRoute.myOrders.path),
      child: orders.isEmpty
          ? _buildEmpty('Chưa có đơn hàng nào')
          : Column(
              children: [
                for (var i = 0; i < orders.length; i++) ...[
                  if (i > 0)
                    const Divider(height: 1, color: AppColors.surfaceNeutral),
                  _buildOrderRow(orders[i]),
                ],
              ],
            ),
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
        return (fg: AppColors.statusSuccess, bg: AppColors.statusSuccessSurface);
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

  Widget _buildRecentTickets() {
    final tickets = _viewModel.recentTickets;
    return _buildCard(
      title: 'Vé số gần đây',
      onSeeAll: () => context.push(AppRoute.myTickets.path),
      child: tickets.isEmpty
          ? _buildEmpty('Chưa có vé nào')
          : Column(
              children: [
                for (var i = 0; i < tickets.length; i++) ...[
                  if (i > 0) const SizedBox(height: 4),
                  _buildTicketRow(tickets[i]),
                ],
              ],
            ),
    );
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
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.surfaceNeutral,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: const Icon(
              Icons.confirmation_number_outlined,
              size: 20,
              color: AppColors.textMuted,
            ),
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
          ? _buildEmpty('Chưa có dữ liệu chi tiêu')
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
      AppColors.statusWarningForeground,
      AppColors.brandSecondary,
      AppColors.statusSuccess,
      AppColors.brandAccentPurple,
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
                  icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16),
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
            Icons.headset_mic_rounded,
            size: 56,
            color: AppColors.brandPrimaryBorder,
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 18),
      child: Center(
        child: Text(
          text,
          style: AppTypography.bodySmall(
            fontSize: 13,
            color: AppColors.textMuted,
          ),
        ),
      ),
    );
  }

  Widget _buildCard({
    required String title,
    required Widget child,
    VoidCallback? onSeeAll,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderLight),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 12,
            offset: Offset(0, 2),
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
                  style: AppTypography.subtitle1(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.contentHeading,
                  ),
                ),
              ),
              if (onSeeAll != null)
                InkWell(
                  onTap: onSeeAll,
                  child: Text(
                    'Xem tất cả >',
                    style: AppTypography.caption(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
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
  final Color bg;
  final VoidCallback onTap;

  const _QuickAction(this.icon, this.label, this.color, this.bg, this.onTap);
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
