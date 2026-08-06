import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/auth/data/models/user.dart';
import 'package:daiphat_mobile/src/features/checkout/models/order_type.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/viewmodels/profile_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
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

  final _currencyFmt = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
    decimalDigits: 0,
  );

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
          'Tổng quan tài khoản',
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
    final name = (rawName != null && rawName.isNotEmpty
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
        border: Border.all(color: const Color(0xFFFFEEEE)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x147B1820),
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
              errorBuilder: (_, error, stackTrace) => Container(
                color: const Color(0xFFFFF5F5),
              ),
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
                    color: const Color(0xFFFFF6F6),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFF5D8DA)),
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
                        style: GoogleFonts.publicSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF212B36),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        email,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.publicSans(
                          fontSize: 12,
                          color: const Color(0xFF637381),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        phone,
                        style: GoogleFonts.publicSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF454F5B),
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE5E8EB)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 12,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          _buildStatCard(
            icon: Icons.receipt_long_rounded,
            color: const Color(0xFFFF4842),
            bg: const Color(0xFFFFF5F5),
            value: '${_viewModel.totalOrders}',
            label: 'Đơn hàng',
          ),
          const SizedBox(width: 8),
          _buildStatCard(
            icon: Icons.confirmation_number_rounded,
            color: const Color(0xFF1CD162),
            bg: const Color(0xFFF4FBFA),
            value: '${_viewModel.totalTicketsBought}',
            label: 'Vé đã mua',
          ),
          const SizedBox(width: 8),
          _buildStatCard(
            icon: Icons.emoji_events_rounded,
            color: const Color(0xFFFFB020),
            bg: const Color(0xFFFFF9F3),
            value: '${stats.wonCount}',
            label: 'Trúng thưởng',
          ),
          const SizedBox(width: 8),
          _buildStatCard(
            icon: Icons.star_rounded,
            color: const Color(0xFF9E5FFF),
            bg: const Color(0xFFF8F5FF),
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
              child: Icon(icon, color: Colors.white, size: 18),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: GoogleFonts.publicSans(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF212B36),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.publicSans(
                fontSize: 10,
                color: const Color(0xFF637381),
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
        const Color(0xFFEE1314),
        const Color(0xFFFFF4F4),
        () => context.push(AppRoute.buyTicket.path),
      ),
      _QuickAction(
        Icons.account_balance_wallet_outlined,
        'Vé của tôi',
        const Color(0xFFFFB020),
        const Color(0xFFFFF9F3),
        () => context.push(AppRoute.myTickets.path),
      ),
      _QuickAction(
        Icons.pie_chart_outline_rounded,
        'Kết quả xổ số',
        const Color(0xFF1CD162),
        const Color(0xFFF4FBFA),
        () => context.go(AppRoute.home.path),
      ),
      _QuickAction(
        Icons.headset_mic_outlined,
        'Hỗ trợ',
        const Color(0xFF9E5FFF),
        const Color(0xFFF8F5FF),
        () => context.push(AppRoute.complaints.path),
      ),
    ];

    return _buildCard(
      title: 'Thao tác nhanh',
      child: GridView.count(
        crossAxisCount: 3,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.0,
        children: actions
            .map(
              (a) => InkWell(
                onTap: a.onTap,
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE5E8EB)),
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
                        style: GoogleFonts.publicSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF454F5B),
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
                    const Divider(height: 1, color: Color(0xFFF4F6F8)),
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
    final qty = order.orderDetails?.fold<int>(
          0,
          (sum, e) => sum + e.quantity,
        ) ??
        0;

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
                    style: GoogleFonts.publicSans(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF212B36),
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    createdAt,
                    style: GoogleFonts.publicSans(
                      fontSize: 11,
                      color: const Color(0xFF637381),
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
                  style: GoogleFonts.publicSans(
                    fontSize: 12,
                    color: const Color(0xFF637381),
                  ),
                ),
              ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _currencyFmt.format(order.totalAmount),
                  style: GoogleFonts.publicSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF212B36),
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: badge.bg,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    status.label,
                    style: GoogleFonts.publicSans(
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
        return (fg: const Color(0xFF1CD162), bg: const Color(0xFFF4FBFA));
      case OrderStatus.cancelled:
        return (fg: const Color(0xFF637381), bg: const Color(0xFFF4F6F8));
      case OrderStatus.pendingPayment:
      case OrderStatus.preparing:
      case OrderStatus.pendingPickup:
        return (fg: const Color(0xFFFFB020), bg: const Color(0xFFFFF9F3));
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
              color: const Color(0xFFF4F6F8),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE5E8EB)),
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
                  style: GoogleFonts.publicSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF212B36),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  drawDate,
                  style: GoogleFonts.publicSans(
                    fontSize: 11,
                    color: const Color(0xFF637381),
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
                style: GoogleFonts.publicSans(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '1 vé - ${_currencyFmt.format(ticket.price)}',
                style: GoogleFonts.publicSans(
                  fontSize: 11,
                  color: const Color(0xFF637381),
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
                            _currencyFmt.format(total),
                            style: GoogleFonts.publicSans(
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF212B36),
                            ),
                          ),
                          Text(
                            'Tổng chi tiêu',
                            style: GoogleFonts.publicSans(
                              fontSize: 11,
                              color: const Color(0xFF637381),
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
                            style: GoogleFonts.publicSans(
                              fontSize: 13,
                              color: const Color(0xFF454F5B),
                            ),
                          ),
                        ),
                        SizedBox(
                          width: 40,
                          child: Text(
                            '$pct%',
                            textAlign: TextAlign.right,
                            style: GoogleFonts.publicSans(
                              fontSize: 13,
                              color: const Color(0xFF637381),
                            ),
                          ),
                        ),
                        SizedBox(
                          width: 88,
                          child: Text(
                            _currencyFmt.format(slice.amount),
                            textAlign: TextAlign.right,
                            style: GoogleFonts.publicSans(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF212B36),
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
      Color(0xFFEE1314),
      Color(0xFFFFB020),
      Color(0xFF2065D1),
      Color(0xFF1CD162),
      Color(0xFF9E5FFF),
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
    final otherAmount =
        entries.skip(4).fold<int>(0, (sum, e) => sum + e.value);
    return [
      for (var i = 0; i < top.length; i++)
        _SpendSlice(
          label: top[i].key,
          amount: top[i].value,
          color: palette[i],
        ),
      _SpendSlice(
        label: 'Vé số khác',
        amount: otherAmount,
        color: palette[4],
      ),
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
          colors: [Color(0xFFFFF5F5), Color(0xFFFFECEC)],
        ),
        border: Border.all(color: const Color(0xFFFFDADA)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bạn cần hỗ trợ?',
                  style: GoogleFonts.publicSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF212B36),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Đội ngũ CSKH của chúng tôi luôn sẵn sàng!',
                  style: GoogleFonts.publicSans(
                    fontSize: 12,
                    color: const Color(0xFF637381),
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => context.push(AppRoute.complaints.path),
                  icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16),
                  label: const Text(
                    'Liên hệ ngay',
                    style: TextStyle(fontWeight: FontWeight.w700),
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
            color: Color(0xFFFF8A8A),
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
          style: GoogleFonts.publicSans(
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE5E8EB)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
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
                  style: GoogleFonts.publicSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF212B36),
                  ),
                ),
              ),
              if (onSeeAll != null)
                InkWell(
                  onTap: onSeeAll,
                  child: Text(
                    'Xem tất cả >',
                    style: GoogleFonts.publicSans(
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
