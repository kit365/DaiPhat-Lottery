import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/checkout/models/order_type.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/purchased_ticket.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import '../viewmodels/profile_overview_viewmodel.dart';

class ProfileOverviewView extends ConsumerStatefulWidget {
  const ProfileOverviewView({super.key});

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
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
              children: [
                _buildStatsRow(),
                const SizedBox(height: 18),
                _buildQuickActions(),
                const SizedBox(height: 18),
                _buildRecentOrders(),
                const SizedBox(height: 18),
                _buildRecentTickets(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatsRow() {
    final stats = _viewModel.ticketStats;
    return Row(
      children: [
        _buildStatCard(
          icon: Icons.receipt_long_rounded,
          color: const Color(0xFFFF4842),
          bg: const Color(0xFFFFF5F5),
          value: '${_viewModel.totalOrders}',
          label: 'Tổng đơn hàng',
        ),
        const SizedBox(width: 12),
        _buildStatCard(
          icon: Icons.confirmation_number_rounded,
          color: const Color(0xFF1CA75A),
          bg: const Color(0xFFF4FBFA),
          value: '${_viewModel.totalTicketsBought}',
          label: 'Vé đã mua',
        ),
        const SizedBox(width: 12),
        _buildStatCard(
          icon: Icons.emoji_events_rounded,
          color: const Color(0xFFFFB020),
          bg: const Color(0xFFFFF9F3),
          value: '${stats.wonCount}',
          label: 'Vé trúng thưởng',
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required Color color,
    required Color bg,
    required String value,
    required String label,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 10),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(height: 10),
            Text(
              value,
              style: GoogleFonts.publicSans(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.textMain,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              textAlign: TextAlign.center,
              style: GoogleFonts.publicSans(
                fontSize: 11,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    final actions = <_QuickAction>[
      _QuickAction(Icons.confirmation_number_outlined, 'Mua vé số',
          const Color(0xFFEE1314), () => context.push(AppRoute.buyTicket.path)),
      _QuickAction(Icons.account_balance_wallet_outlined, 'Vé của tôi',
          const Color(0xFFFFB020), () => context.push(AppRoute.myTickets.path)),
      _QuickAction(Icons.receipt_long_outlined, 'Đơn hàng',
          const Color(0xFF2065D1), () => context.push(AppRoute.myOrders.path)),
      _QuickAction(Icons.rotate_left_rounded, 'Hoàn tiền',
          const Color(0xFFFF4842), () => context.push(AppRoute.refunds.path)),
      _QuickAction(Icons.emoji_events_outlined, 'Trả thưởng',
          const Color(0xFF1CA75A), () => context.push(AppRoute.prizePayouts.path)),
      _QuickAction(Icons.headset_mic_outlined, 'Khiếu nại',
          const Color(0xFF9E5FFF), () => context.push(AppRoute.complaints.path)),
    ];

    return _buildCard(
      title: 'Thao tác nhanh',
      child: GridView.count(
        crossAxisCount: 3,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.95,
        children: actions
            .map(
              (a) => InkWell(
                onTap: a.onTap,
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFEDEDED)),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: a.color.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(a.icon, color: a.color, size: 21),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        a.label,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.publicSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textMain,
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
              children: orders.map(_buildOrderRow).toList(),
            ),
    );
  }

  Widget _buildOrderRow(OrderResponse order) {
    final status = OrderStatus.fromValue(order.status);
    String createdAt = '';
    if (order.createdAt != null) {
      final dt = DateTime.tryParse(order.createdAt!)?.toLocal();
      if (dt != null) createdAt = DateFormat('dd/MM/yyyy - HH:mm').format(dt);
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'DP${order.orderCode}',
                  style: GoogleFonts.publicSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMain,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  createdAt,
                  style: GoogleFonts.publicSans(
                    fontSize: 11,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
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
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                status.label,
                style: GoogleFonts.publicSans(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRecentTickets() {
    final tickets = _viewModel.recentTickets;
    return _buildCard(
      title: 'Vé số gần đây',
      onSeeAll: () => context.push(AppRoute.myTickets.path),
      child: tickets.isEmpty
          ? _buildEmpty('Chưa có vé nào')
          : Column(
              children: tickets.map(_buildTicketRow).toList(),
            ),
    );
  }

  Widget _buildTicketRow(PurchasedTicket ticket) {
    String drawDate = '';
    final dt = DateTime.tryParse(ticket.drawDate)?.toLocal();
    if (dt != null) drawDate = DateFormat('dd/MM/yyyy').format(dt);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFF4F6F8),
              borderRadius: BorderRadius.circular(10),
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
                    color: AppColors.textMain,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  drawDate,
                  style: GoogleFonts.publicSans(
                    fontSize: 11,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Text(
            ticket.numbers,
            style: GoogleFonts.publicSans(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              letterSpacing: 1,
              color: AppColors.primary,
            ),
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
        border: Border.all(color: const Color(0xFFEDEDED)),
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
                    color: AppColors.textMain,
                  ),
                ),
              ),
              if (onSeeAll != null)
                InkWell(
                  onTap: onSeeAll,
                  child: Text(
                    'Xem tất cả',
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
  final VoidCallback onTap;

  const _QuickAction(this.icon, this.label, this.color, this.onTap);
}
