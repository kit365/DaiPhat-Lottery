import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/profile/utils/ticket_display_utils.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
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
    _viewModel = MyTicketsViewModel(ref.read(orderServiceProvider));
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
          'Vé của tôi',
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
              _buildSummaryCards(),
              _buildSearchBar(),
              _buildStatusFilter(),
              const Divider(height: 1, color: Color(0xFFEEEEEE)),
              Expanded(child: _buildBody()),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSummaryCards() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          _buildMetricCard(
            'Tổng vé',
            '${_viewModel.totalRecords}',
            Icons.confirmation_number_outlined,
            AppColors.primary,
          ),
          const SizedBox(width: 10),
          _buildMetricCard(
            'Chờ quay',
            '${_viewModel.pendingCountOnPage}',
            Icons.schedule_outlined,
            const Color(0xFFFBC02D),
          ),
          const SizedBox(width: 10),
          _buildMetricCard(
            'Trúng',
            '${_viewModel.wonCountOnPage}',
            Icons.emoji_events_outlined,
            const Color(0xFFF57F17),
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
              style: GoogleFonts.publicSans(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppColors.textMain,
              ),
            ),
            Text(
              label,
              style: GoogleFonts.publicSans(
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
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Tìm mã vé / bộ số...',
          hintStyle: GoogleFonts.publicSans(
            fontSize: 13,
            color: AppColors.textMuted,
          ),
          prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.textMuted),
          filled: true,
          fillColor: const Color(0xFFF4F6F8),
          contentPadding: const EdgeInsets.symmetric(vertical: 0),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
        style: GoogleFonts.publicSans(fontSize: 14),
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

    if (_viewModel.error != null && _viewModel.tickets.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.textMuted),
            const SizedBox(height: 12),
            Text(
              'Không thể tải danh sách vé',
              style: GoogleFonts.publicSans(
                fontSize: 15,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => _viewModel.fetchTickets(refresh: true),
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
              color: Color(0xFFF4F6F8),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.confirmation_number_outlined,
              size: 40,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Chưa có vé nào',
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

  Widget _buildTicketCard(PurchasedTicket ticket) {
    final status = ticketStatusUi(ticket.drawResultStatus);
    final possession = resolveTicketPossessionDisplay(ticket);
    final payout = resolveTicketPayoutDisplay(ticket);
    final numberParts = splitTicketNumbers(ticket.numbers);
    final currencyFmt = NumberFormat.currency(
      locale: 'vi_VN',
      symbol: '₫',
      decimalDigits: 0,
    );

    String? formattedDrawDate;
    try {
      final dt = DateTime.parse(ticket.drawDate).toLocal();
      formattedDrawDate = DateFormat('dd/MM/yyyy').format(dt);
    } catch (_) {
      formattedDrawDate = ticket.drawDate;
    }

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
                        style: GoogleFonts.publicSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textMain,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Kỳ quay: $formattedDrawDate',
                        style: GoogleFonts.publicSans(
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
                                      Color(0xFFFCD34D),
                                      Color(0xFFF59E0B),
                                    ],
                                  )
                                : null,
                            color: ticket.drawResultStatus == 'WON'
                                ? null
                                : const Color(0xFFF4F6F8),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: ticket.drawResultStatus == 'WON'
                                  ? const Color(0xFFFBBF24)
                                  : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Text(
                            n,
                            style: GoogleFonts.publicSans(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: ticket.drawResultStatus == 'WON'
                                  ? const Color(0xFF78350F)
                                  : AppColors.textMain,
                            ),
                          ),
                        ),
                      )
                      .toList()
                  : [
                      Text(
                        ticket.numbers,
                        style: GoogleFonts.publicSans(
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
                  const Icon(Icons.star_rounded, size: 16, color: Color(0xFFF59E0B)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      ticket.matchedPrizeDisplayName!,
                      style: GoogleFonts.publicSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFFB45309),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          const Divider(height: 1, color: Color(0xFFF0F0F0)),
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
                        style: GoogleFonts.publicSans(
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
                      currencyFmt.format(ticket.price),
                      style: GoogleFonts.publicSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                    if (ticket.prizeAmount != null &&
                        ticket.drawResultStatus == 'WON')
                      Text(
                        '+ ${currencyFmt.format(ticket.prizeAmount)}',
                        style: GoogleFonts.publicSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFFF59E0B),
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
        style: GoogleFonts.publicSans(
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
              style: GoogleFonts.publicSans(
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
