import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/prize_payout_request.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/providers/profile_providers.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/widgets/profile_status_badge.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/profile_iconography.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_status_tab_bar.dart';
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
          'Yêu cầu trả thưởng',
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
              _buildSearch(),
              _buildStatusTabs(),
              const Divider(height: 1, color: AppColors.borderLight),
              Expanded(child: _buildBody()),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSearch() {
    return Container(
      color: AppColors.surfacePrimary,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: TextField(
        controller: _searchController,
        textInputAction: TextInputAction.search,
        onSubmitted: _viewModel.setSearch,
        style: AppTypography.mainWith(fontSize: 14),
        decoration: InputDecoration(
          hintText: 'Tìm theo mã yêu cầu...',
          prefixIcon: const Icon(Icons.search_rounded, size: 20),
          isDense: true,
          filled: true,
          fillColor: AppColors.surfaceNeutral,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }

  Widget _buildStatusTabs() {
    final items = _statusTabs.map((entry) {
      final value = entry.$1;
      final label = entry.$2;
      final count = value == null
          ? (_viewModel.statusCounts['all'] ?? 0)
          : (_viewModel.statusCounts[value] ?? 0);
      return AppStatusTabItem<String?>(
        value: value,
        label: label,
        count: count,
      );
    }).toList();

    return AppStatusTabBar<String?>(
      items: items,
      selectedValue: _viewModel.statusFilter,
      onSelected: (value) => _viewModel.setStatusFilter(value),
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
    final showReject =
        (item.status == PrizePayoutRequestStatus.rejected ||
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
            Row(
              children: [
                Expanded(
                  child: Text(
                    item.requestCode,
                    style: AppTypography.mainWith(
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
              style: AppTypography.mainWith(
                fontSize: 13,
                color: AppColors.textMuted,
              ),
            ),
            if (item.numbers != null)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  '${item.numbers} · ${item.prizeDisplayName ?? item.prizeCode ?? ''}',
                  style: AppTypography.mainWith(
                    fontSize: 13,
                    color: AppColors.textMuted,
                  ),
                ),
              ),
            if (showReject)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  item.rejectReason!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.mainWith(
                    fontSize: 12,
                    color: AppColors.error,
                  ),
                ),
              ),
            const Divider(height: 20, color: AppColors.borderLight),
            Row(
              children: [
                Expanded(
                  child: Text(
                    createdAt,
                    style: AppTypography.mainWith(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
                Text(
                  AppFormatters.formatCurrency(
                    item.netAmount ?? item.grossAmount,
                  ),
                  style: AppTypography.mainWith(
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
            style: AppTypography.mainWith(
              fontSize: 14,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => _viewModel.fetch(refresh: true),
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
                  color: AppColors.statusErrorSurface,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  ProfileIconography.prize,
                  size: 36,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Chưa có yêu cầu trả thưởng',
                style: AppTypography.mainWith(
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
                  style: AppTypography.mainWith(
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
                  foregroundColor: AppColors.surfacePrimary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text(
                  'Đi tới Vé của tôi',
                  style: AppTypography.mainWith(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
