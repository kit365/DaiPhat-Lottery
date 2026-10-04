import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/entities/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/providers/purchased_tickets_providers.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/utils/ticket_display_utils.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/profile_iconography.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_status_tab_bar.dart';
import 'package:daiphat_mobile/src/shared/widgets/brand_scrollbar.dart';
import 'package:daiphat_mobile/src/shared/widgets/ticket_number_display.dart';
import '../viewmodels/my_tickets_viewmodel.dart';

class MyTicketsView extends ConsumerStatefulWidget {
  const MyTicketsView({super.key});

  @override
  ConsumerState<MyTicketsView> createState() => _MyTicketsViewState();
}

class _MyTicketsViewState extends ConsumerState<MyTicketsView> {
  late MyTicketsViewModel _viewModel;
  final _scrollController = ScrollController();
  final _searchController = TextEditingController();

  static const _statusFilters = <(String?, String)>[
    (null, 'Tất cả'),
    ('PENDING_DRAW', 'Chờ quay'),
    ('WON', 'Trúng'),
    ('LOST', 'Không trúng'),
  ];

  @override
  void initState() {
    super.initState();
    _viewModel = MyTicketsViewModel(
      ref.read(getMyTicketsProvider),
      ref.read(getMyTicketsSummaryProvider),
    );
    _scrollController.addListener(_onScroll);
    _searchController.addListener(() {
      _viewModel.setSearchQuery(_searchController.text);
      _resetListPosition();
    });
  }

  void _resetListPosition() {
    if (_scrollController.hasClients && _scrollController.offset != 0) {
      _scrollController.jumpTo(0);
    }
  }

  Future<void> _refreshTickets() async {
    _resetListPosition();
    await _viewModel.fetchTickets(refresh: true);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _viewModel.fetchTickets();
    }
  }

  @override
  void dispose() {
    _viewModel.dispose();
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfacePrimary,
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
          'Vé của tôi',
          style: AppTypography.mainWith(
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
              _buildSummaryCards(),
              _buildSearchBar(),
              _buildStatusFilter(),
              const Divider(height: 1, color: AppColors.borderLight),
              Expanded(child: _buildBody()),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSummaryCards() {
    return Container(
      color: AppColors.surfacePrimary,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          _buildMetricCard(
            'Tổng vé',
            '${_viewModel.totalAllCount}',
            ProfileIconography.ticket,
            AppColors.primary,
          ),
          const SizedBox(width: 10),
          _buildMetricCard(
            'Chờ quay',
            '${_viewModel.totalPendingCount}',
            ProfileIconography.pendingTicket,
            AppColors.ticketResultPendingForeground,
          ),
          const SizedBox(width: 10),
          _buildMetricCard(
            'Trúng',
            '${_viewModel.totalWonCount}',
            ProfileIconography.prize,
            AppColors.ticketResultWonForeground,
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.15)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(height: 6),
            Text(
              value,
              style: AppTypography.mainWith(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppColors.textMain,
              ),
            ),
            Text(
              label,
              style: AppTypography.mainWith(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.ticketMetadataForeground,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      color: AppColors.surfacePrimary,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Tìm mã vé / bộ số...',
          hintStyle: AppTypography.mainWith(
            fontSize: 13,
            color: AppColors.textMuted,
          ),
          prefixIcon: const Icon(
            Icons.search,
            size: 20,
            color: AppColors.textMuted,
          ),
          filled: true,
          fillColor: AppColors.surfaceNeutral,
          constraints: const BoxConstraints(minHeight: 48),
          contentPadding: const EdgeInsets.symmetric(vertical: 0),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
        style: AppTypography.mainWith(fontSize: 14),
      ),
    );
  }

  Widget _buildStatusFilter() {
    final items = _statusFilters.map((entry) {
      return AppStatusTabItem<String?>(value: entry.$1, label: entry.$2);
    }).toList();

    return Column(
      children: [
        AppStatusTabBar<String?>(
          items: items,
          selectedValue: _viewModel.selectedStatus,
          onSelected: (value) {
            _viewModel.setStatusFilter(value);
            _resetListPosition();
          },
          height: 48,
        ),
        if (_viewModel.selectedStatus == 'WON') _buildRedeemedFilterBar(),
      ],
    );
  }

  Widget _buildRedeemedFilterBar() {
    final selected = _viewModel.selectedRedeemed == null
        ? 'ALL'
        : _viewModel.selectedRedeemed == true
        ? 'REDEEMED'
        : 'UNREDEEMED';

    return Container(
      width: double.infinity,
      color: AppColors.surfacePrimary,
      padding: const EdgeInsets.fromLTRB(16, 2, 16, 10),
      child: Row(
        children: [
          Expanded(
            child: _buildFilterPill(
              label: 'Tất cả',
              selected: selected == 'ALL',
              onTap: () {
                _viewModel.setRedeemedFilter(null);
                _resetListPosition();
              },
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildUnredeemedFilterPill(
              selected: selected == 'UNREDEEMED',
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildFilterPill(
              label: 'Đã đổi',
              selected: selected == 'REDEEMED',
              onTap: () {
                _viewModel.setRedeemedFilter(true);
                _resetListPosition();
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterPill({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return Semantics(
      button: true,
      selected: selected,
      label: 'Lọc vé: $label',
      child: Material(
        color: AppColors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            height: 36,
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 6),
            decoration: BoxDecoration(
              color: selected
                  ? AppColors.ticketPrizeSurface
                  : AppColors.surfacePrimary,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: selected
                    ? AppColors.ticketResultWonBorder
                    : AppColors.borderLight,
                width: 1,
              ),
            ),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.mainWith(
                fontSize: 12.5,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: selected
                    ? AppColors.ticketResultWonForeground
                    : AppColors.textMain,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildUnredeemedFilterPill({required bool selected}) {
    final channelLabel = switch (_viewModel.selectedChannel) {
      'ONLINE' => 'Trực tuyến',
      'COUNTER' => 'Tại quầy',
      _ => null,
    };
    final label =
        channelLabel != null ? 'Chưa đổi ($channelLabel)' : 'Chưa đổi';

    return Semantics(
      button: true,
      selected: selected,
      label: 'Lọc vé trúng: Chưa đổi thưởng',
      hint: 'Mở bảng chọn kênh đổi thưởng',
      child: Material(
        color: AppColors.transparent,
        child: InkWell(
          onTap: _openUnredeemedChannelSheet,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            height: 36,
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 4),
            decoration: BoxDecoration(
              color: selected
                  ? AppColors.ticketPrizeSurface
                  : AppColors.surfacePrimary,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: selected
                    ? AppColors.ticketResultWonBorder
                    : AppColors.borderLight,
                width: 1,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.mainWith(
                      fontSize: 12.5,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                      color: selected
                          ? AppColors.ticketPrizeForeground
                          : AppColors.textMain,
                    ),
                  ),
                ),
                const SizedBox(width: 2),
                Icon(
                  Icons.keyboard_arrow_down_rounded,
                  size: 16,
                  color: selected
                      ? AppColors.ticketPrizeForeground
                      : AppColors.textMuted,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openUnredeemedChannelSheet() async {
    final channel = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppColors.surfacePrimary,
      barrierColor: Colors.black.withValues(alpha: 0.28),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.borderMuted,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Kênh đổi thưởng',
                        style: AppTypography.mainWith(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textMain,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Đóng',
                      onPressed: () => Navigator.pop(sheetContext),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
                Text(
                  'Chỉ hiển thị vé trúng chưa đổi thưởng',
                  style: AppTypography.mainWith(
                    fontSize: 13,
                    color: AppColors.ticketMetadataForeground,
                  ),
                ),
                const SizedBox(height: 8),
                _buildChannelSheetOption(
                  sheetContext,
                  value: 'ALL',
                  title: 'Tất cả kênh',
                  subtitle: 'Gồm cả trực tuyến và tại quầy',
                  icon: Icons.all_inclusive_rounded,
                ),
                _buildChannelSheetOption(
                  sheetContext,
                  value: 'ONLINE',
                  title: 'Trực tuyến',
                  subtitle: 'Vé có thể đổi thưởng online',
                  icon: Icons.language_rounded,
                ),
                _buildChannelSheetOption(
                  sheetContext,
                  value: 'COUNTER',
                  title: 'Đổi tại quầy',
                  subtitle: 'Vé cần mang đến điểm giao dịch',
                  icon: Icons.storefront_outlined,
                ),
              ],
            ),
          ),
        );
      },
    );

    if (!mounted || channel == null) return;
    _viewModel.setRedeemedFilter(false);
    _viewModel.setChannelFilter(channel);
    _resetListPosition();
  }

  Widget _buildChannelSheetOption(
    BuildContext sheetContext, {
    required String value,
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
    final selected =
        _viewModel.selectedRedeemed == false &&
        _viewModel.selectedChannel == value;
    return Semantics(
      button: true,
      selected: selected,
      label: title,
      child: InkWell(
        onTap: () => Navigator.pop(sheetContext, value),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.ticketPrizeSurface
                      : AppColors.surfaceNeutral,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: selected
                      ? AppColors.ticketPrizeForeground
                      : AppColors.ticketMetadataForeground,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: AppTypography.mainWith(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textMain,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: AppTypography.mainWith(
                        fontSize: 12,
                        color: AppColors.ticketMetadataForeground,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_unchecked_rounded,
                color: selected
                    ? AppColors.ticketPrizeForeground
                    : AppColors.ticketMetadataForeground,
              ),
            ],
          ),
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

    if (_viewModel.error != null && _viewModel.tickets.isEmpty) {
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
              'Không thể tải danh sách vé',
              style: AppTypography.mainWith(
                fontSize: 15,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: _refreshTickets,
              child: Text(
                'Thử lại',
                style: AppTypography.mainWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (_viewModel.visibleTickets.isEmpty) {
      return _buildEmptyState(filtered: _viewModel.selectedRedeemed == false);
    }

    return BrandScrollbar(
      controller: _scrollController,
      child: RefreshIndicator(
        onRefresh: _refreshTickets,
        color: AppColors.primary,
        child: ListView.builder(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          itemCount:
              _viewModel.visibleTickets.length +
              (_viewModel.isLoadingMore ? 1 : 0),
          itemBuilder: (context, index) {
            if (index == _viewModel.visibleTickets.length) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              );
            }
            final ticket = _viewModel.visibleTickets[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: const [
                    BoxShadow(
                      color: AppColors.shadowLight,
                      blurRadius: 8,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Material(
                  color: AppColors.transparent,
                  borderRadius: BorderRadius.circular(16),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    splashColor: AppColors.primary.withValues(alpha: 0.08),
                    highlightColor: AppColors.primary.withValues(alpha: 0.04),
                    onTap: () async {
                      await context.pushNamed(
                        AppRoute.myTicketDetail.name,
                        pathParameters: {'id': ticket.detailRouteId},
                        extra: ticket,
                      );
                      if (mounted) {
                        _viewModel.fetchTickets(refresh: true);
                      }
                    },
                    child: _buildTicketCard(ticket),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildEmptyState({bool filtered = false}) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              color: AppColors.surfaceNeutral,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              ProfileIconography.ticket,
              size: 40,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            filtered
                ? _viewModel.selectedChannel == 'ONLINE'
                      ? 'Không có vé đổi thưởng trực tuyến'
                      : _viewModel.selectedChannel == 'COUNTER'
                      ? 'Không có vé cần đổi tại quầy'
                      : 'Không có vé chưa đổi thưởng'
                : 'Chưa có vé nào',
            style: AppTypography.mainWith(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textMain,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Hãy mua vé số để tham gia ngay!',
            style: AppTypography.mainWith(
              fontSize: 14,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketCard(PurchasedTicket ticket) {
    final status = ticketStatusUi(ticket.drawResultStatus);
    final payout = resolveTicketPayoutDisplay(ticket);
    final date = AppFormatters.formatDateIso(
      ticket.drawDate,
      fallback: ticket.drawDate,
    );
    final isWon = ticket.drawResultStatus == 'WON';

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.borderLight,
          width: 1.0,
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: TicketNumberDisplay.inline(
                  value: ticket.numbers,
                ),
              ),
              const SizedBox(width: 8),
              if (isWon && payout != null && payout.label == 'Đã trả thưởng')
                _buildStatusChip(
                  payout.label,
                  payout.color,
                  payout.bgColor,
                  borderColor: payout.borderColor,
                )
              else
                _buildStatusChip(
                  status.label,
                  status.color,
                  status.bgColor,
                  borderColor: status.borderColor,
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${ticket.stationName ?? 'Vé số Đại Phát'} · $date',
            style: AppTypography.mainWith(
              fontSize: 13,
              color: AppColors.ticketMetadataForeground,
            ),
          ),
          if (isWon && ticket.matchedPrizeDisplayName?.trim().isNotEmpty == true) ...[
            const SizedBox(height: 3),
            Text(
              ticket.matchedPrizeDisplayName!,
              style: AppTypography.mainWith(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.ticketMetadataForeground,
              ),
            ),
          ],
          const SizedBox(height: 12),
          const Divider(height: 1, color: AppColors.borderLight),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  isWon
                      ? (payout != null &&
                              payout.label != 'Đã trả thưởng' &&
                              payout.label != 'Chưa yêu cầu trả thưởng'
                          ? payout.label
                          : 'Kỳ quay: $date')
                      : 'Kỳ quay: $date',
                  style: AppTypography.mainWith(
                    fontSize: 12.5,
                    color: AppColors.ticketMetadataForeground,
                  ),
                ),
              ),
              if (isWon && ticket.prizeAmount != null)
                Text(
                  AppFormatters.formatCurrency(ticket.prizeAmount),
                  style: AppTypography.mainWith(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: AppColors.ticketResultWonForeground,
                  ),
                )
              else
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Chi tiết',
                      style: AppTypography.mainWith(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.contentSecondary,
                      ),
                    ),
                    const SizedBox(width: 2),
                    const Icon(
                      Icons.chevron_right_rounded,
                      size: 16,
                      color: AppColors.contentSecondary,
                    ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(
    String label,
    Color color,
    Color bgColor, {
    Color? borderColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor ?? color.withValues(alpha: 0.2)),
      ),
      child: Text(
        label,
        style: AppTypography.mainWith(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
