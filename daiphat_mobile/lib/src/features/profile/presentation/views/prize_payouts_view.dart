import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/prize_payout_request.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/providers/profile_providers.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/widgets/profile_status_badge.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/widgets/brand_scrollbar.dart';
import '../viewmodels/prize_payouts_viewmodel.dart';

class PrizePayoutsView extends ConsumerStatefulWidget {
  const PrizePayoutsView({super.key});

  @override
  ConsumerState<PrizePayoutsView> createState() => _PrizePayoutsViewState();
}

class _PrizePayoutsViewState extends ConsumerState<PrizePayoutsView> {
  late final PrizePayoutsViewModel _viewModel;
  final _scrollController = ScrollController();
  final _searchController = TextEditingController();

  static const _statusTabs = <(String?, String)>[
    (null, 'Tất cả'),
    ('PENDING', 'Cần xử lý'),
    ('APPROVED', 'Đã duyệt'),
    ('COMPLETED', 'Đã chuyển'),
    ('REJECTED', 'Từ chối'),
    ('MANUAL_RESOLUTION', 'Xử lý tại đại lý'),
    ('CANCELLED', 'Đã hủy'),
  ];

  final _currencyFmt = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    _viewModel = PrizePayoutsViewModel(ref.read(prizePayoutServiceProvider));
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _viewModel.fetch();
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
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 20, color: AppColors.primary),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Yêu cầu trả thưởng',
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
              _buildSearch(),
              _buildStatusTabs(),
              const Divider(height: 1, color: Color(0xFFEEEEEE)),
              Expanded(child: _buildBody()),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSearch() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: TextField(
        controller: _searchController,
        textInputAction: TextInputAction.search,
        onSubmitted: _viewModel.setSearch,
        style: GoogleFonts.publicSans(fontSize: 14),
        decoration: InputDecoration(
          hintText: 'Tìm theo mã yêu cầu...',
          prefixIcon: const Icon(Icons.search_rounded, size: 20),
          isDense: true,
          filled: true,
          fillColor: const Color(0xFFF4F6F8),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }

  Widget _buildStatusTabs() {
    return Container(
      color: Colors.white,
      height: 46,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: _statusTabs.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final (value, label) = _statusTabs[index];
          final isSelected = _viewModel.statusFilter == value;
          final count = value == null
              ? (_viewModel.statusCounts['all'] ?? 0)
              : (_viewModel.statusCounts[value] ?? 0);
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
                count > 0 ? '$label ($count)' : label,
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
    if (_viewModel.error != null && _viewModel.items.isEmpty) {
      return _buildError();
    }
    if (_viewModel.items.isEmpty) {
      return _buildEmpty();
    }
    return BrandScrollbar(
      controller: _scrollController,
      child: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => _viewModel.fetch(refresh: true),
        child: ListView.builder(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          itemCount:
              _viewModel.items.length + (_viewModel.isLoadingMore ? 1 : 0),
          itemBuilder: (context, index) {
            if (index == _viewModel.items.length) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              );
            }
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _buildCard(_viewModel.items[index]),
            );
          },
        ),
      ),
    );
  }

  Widget _buildCard(PrizePayoutRequestResponse item) {
    String createdAt = '';
    final dt = DateTime.tryParse(item.createdAt ?? '')?.toLocal();
    if (dt != null) createdAt = DateFormat('dd/MM/yyyy HH:mm').format(dt);
    String drawDate = '—';
    final dd = DateTime.tryParse(item.drawDate ?? '');
    if (dd != null) drawDate = DateFormat('dd/MM/yyyy').format(dd);
    final showReject = (item.status == PrizePayoutRequestStatus.rejected ||
            item.status == PrizePayoutRequestStatus.manualResolution) &&
        item.rejectReason != null &&
        item.rejectReason!.isNotEmpty;

    return GestureDetector(
      onTap: () => context.pushNamed(
        AppRoute.prizePayoutDetail.name,
        pathParameters: {'id': '${item.id}'},
      ),
      child: Container(
        padding: const EdgeInsets.all(14),
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
                Expanded(
                  child: Text(
                    item.requestCode,
                    style: GoogleFonts.publicSans(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textMain,
                    ),
                  ),
                ),
                PrizePayoutStatusBadge(status: item.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${item.stationName ?? '—'} · $drawDate',
              style: GoogleFonts.publicSans(fontSize: 13, color: AppColors.textMuted),
            ),
            if (item.numbers != null)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  '${item.numbers} · ${item.prizeDisplayName ?? item.prizeCode ?? ''}',
                  style: GoogleFonts.publicSans(fontSize: 13, color: AppColors.textMuted),
                ),
              ),
            if (showReject)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  item.rejectReason!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.publicSans(
                    fontSize: 12,
                    color: AppColors.error,
                  ),
                ),
              ),
            const Divider(height: 20, color: Color(0xFFF0F0F0)),
            Row(
              children: [
                Expanded(
                  child: Text(
                    createdAt,
                    style: GoogleFonts.publicSans(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
                Text(
                  _currencyFmt.format(item.netAmount ?? item.grossAmount),
                  style: GoogleFonts.publicSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AppColors.textMuted),
          const SizedBox(height: 12),
          Text(
            _viewModel.error ?? 'Đã xảy ra lỗi',
            textAlign: TextAlign.center,
            style: GoogleFonts.publicSans(fontSize: 14, color: AppColors.textMuted),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => _viewModel.fetch(refresh: true),
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

  Widget _buildEmpty() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 120),
        Center(
          child: Column(
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: const BoxDecoration(
                  color: Color(0xFFFFF4F4),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.emoji_events_rounded,
                    size: 36, color: AppColors.primary),
              ),
              const SizedBox(height: 16),
              Text(
                'Chưa có yêu cầu trả thưởng',
                style: GoogleFonts.publicSans(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMain,
                ),
              ),
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 40),
                child: Text(
                  'Vào mục Vé của tôi, chọn một vé trúng để gửi yêu cầu.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.publicSans(
                    fontSize: 13,
                    color: AppColors.textMuted,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              ElevatedButton(
                onPressed: () => context.pushNamed(AppRoute.myTickets.name),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text(
                  'Đi tới Vé của tôi',
                  style: GoogleFonts.publicSans(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
