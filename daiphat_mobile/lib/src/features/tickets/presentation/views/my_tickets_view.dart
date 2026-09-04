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
    _viewModel = MyTicketsViewModel(ref.read(getMyTicketsProvider));
    _scrollController.addListener(_onScroll);
    _searchController.addListener(() {
      _viewModel.setSearchQuery(_searchController.text);
    });
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
            '${_viewModel.totalRecords}',
            ProfileIconography.ticket,
            AppColors.primary,
          ),
          const SizedBox(width: 10),
          _buildMetricCard(
            'Chờ quay',
            '${_viewModel.pendingCountOnPage}',
            ProfileIconography.pendingTicket,
            AppColors.ticketPendingForeground,
          ),
          const SizedBox(width: 10),
          _buildMetricCard(
            'Trúng',
            '${_viewModel.wonCountOnPage}',
            ProfileIconography.prize,
            ProfileIconTone.prize,
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
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: AppColors.textMuted,
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

    return AppStatusTabBar<String?>(
      items: items,
      selectedValue: _viewModel.selectedStatus,
      onSelected: (value) => _viewModel.setStatusFilter(value),
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
              onPressed: () => _viewModel.fetchTickets(refresh: true),
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

    if (_viewModel.tickets.isEmpty) {
      return _buildEmptyState();
    }

    return BrandScrollbar(
      controller: _scrollController,
      child: RefreshIndicator(
        onRefresh: () => _viewModel.fetchTickets(refresh: true),
        color: AppColors.primary,
        child: ListView.builder(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          itemCount:
              _viewModel.tickets.length + (_viewModel.isLoadingMore ? 1 : 0),
          itemBuilder: (context, index) {
            if (index == _viewModel.tickets.length) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              );
            }
            final ticket = _viewModel.tickets[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: GestureDetector(
                onTap: () => context.pushNamed(
                  AppRoute.myTicketDetail.name,
                  pathParameters: {'id': ticket.detailRouteId},
                  extra: ticket,
                ),
                child: _buildTicketCard(ticket),
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
            'Chưa có vé nào',
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
    final possession = resolveTicketPossessionDisplay(ticket);
    final payout = resolveTicketPayoutDisplay(ticket);
    final numberParts = splitTicketNumbers(ticket.numbers);
    final formattedDrawDate = AppFormatters.formatDateIso(
      ticket.drawDate,
      fallback: ticket.drawDate,
    );

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ticket.stationName ?? 'Vé số Đại Phát',
                        style: AppTypography.mainWith(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textMain,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Kỳ quay: $formattedDrawDate',
                        style: AppTypography.mainWith(
                          fontSize: 12,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                _buildStatusChip(status.label, status.color, status.bgColor),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: numberParts.isNotEmpty
                  ? numberParts
                        .map(
                          (n) => Container(
                            width: 36,
                            height: 36,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              gradient: ticket.drawResultStatus == 'WON'
                                  ? const LinearGradient(
                                      begin: Alignment.topCenter,
                                      end: Alignment.bottomCenter,
                                      colors: [
                                        AppColors.fortuneGoldDark,
                                        AppColors.statusWarningAccent,
                                      ],
                                    )
                                  : null,
                              color: ticket.drawResultStatus == 'WON'
                                  ? null
                                  : AppColors.surfaceNeutral,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: ticket.drawResultStatus == 'WON'
                                    ? AppColors.brandAccentYellow
                                    : AppColors.borderSubtle,
                              ),
                            ),
                            child: Text(
                              n,
                              style: AppTypography.mainWith(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: ticket.drawResultStatus == 'WON'
                                    ? AppColors.contentAmberDark
                                    : AppColors.textMain,
                              ),
                            ),
                          ),
                        )
                        .toList()
                  : [
                      Text(
                        ticket.numbers,
                        style: AppTypography.mainWith(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
            ),
          ),
          if (ticket.drawResultStatus == 'WON' &&
              ticket.matchedPrizeDisplayName != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Row(
                children: [
                  const Icon(
                    Icons.star_rounded,
                    size: 16,
                    color: AppColors.statusWarningAccent,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      ticket.matchedPrizeDisplayName!,
                      style: AppTypography.mainWith(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.brandAccentGoldAmber,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          const Divider(height: 1, color: AppColors.borderLight),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ticket.serialNumber ?? ticket.numbers,
                        style: AppTypography.mainWith(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textMain,
                        ),
                      ),
                      if (possession != null) ...[
                        const SizedBox(height: 6),
                        _buildMiniChip(
                          possession.label,
                          possession.color,
                          possession.bgColor,
                          possession.icon,
                        ),
                      ],
                      if (payout != null) ...[
                        const SizedBox(height: 6),
                        _buildMiniChip(
                          payout.label,
                          payout.color,
                          payout.bgColor,
                          payout.icon,
                        ),
                      ],
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      AppFormatters.formatCurrency(ticket.price),
                      style: AppTypography.mainWith(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                    if (ticket.prizeAmount != null &&
                        ticket.drawResultStatus == 'WON')
                      Text(
                        '+ ${AppFormatters.formatCurrency(ticket.prizeAmount)}',
                        style: AppTypography.mainWith(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.statusWarningAccent,
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

  Widget _buildStatusChip(String label, Color color, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Text(
        label,
        style: AppTypography.mainWith(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }

  Widget _buildMiniChip(
    String label,
    Color color,
    Color bgColor,
    IconData icon,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              label,
              style: AppTypography.mainWith(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
