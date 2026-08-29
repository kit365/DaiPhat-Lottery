import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/refund_request.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/providers/profile_providers.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/widgets/profile_status_badge.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_status_tab_bar.dart';
import 'package:daiphat_mobile/src/shared/widgets/brand_scrollbar.dart';
import '../viewmodels/refunds_viewmodel.dart';

class RefundsView extends ConsumerStatefulWidget {
  const RefundsView({super.key});

  @override
  ConsumerState<RefundsView> createState() => _RefundsViewState();
}

class _RefundsViewState extends ConsumerState<RefundsView> {
  late final RefundsViewModel _viewModel;
  final _scrollController = ScrollController();
  final _searchController = TextEditingController();

  static const _statusTabs = <(String?, String)>[
    (null, 'Tất cả'),
    ('WAITING_FOR_INFO', 'Chờ thông tin STK'),
    ('READY_TO_PAY', 'Chờ chuyển khoản'),
    ('PAID', 'Đã chuyển khoản'),
    ('MANUAL_RESOLUTION', 'Cần xử lý thủ công'),
  ];

  @override
  void initState() {
    super.initState();
    _viewModel = RefundsViewModel(ref.read(refundServiceProvider));
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
          'Yêu cầu hoàn tiền',
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
      color: AppColors.surfacePrimary,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: TextField(
        controller: _searchController,
        textInputAction: TextInputAction.search,
        onSubmitted: _viewModel.setSearch,
        style: AppTypography.mainWith(fontSize: 14),
        decoration: InputDecoration(
          hintText: 'Tìm theo lý do hoàn tiền...',
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

  Widget _buildCard(RefundRequestResponse refund) {
    String createdAt = '';
    final dt = DateTime.tryParse(refund.createdAt)?.toLocal();
    if (dt != null) createdAt = DateFormat('dd/MM/yyyy HH:mm').format(dt);
    final orderLabel = refund.orderCode?.trim().isNotEmpty == true
        ? refund.orderCode!.trim()
        : (refund.orderId != null
              ? '${refund.orderId!.substring(0, refund.orderId!.length.clamp(0, 8)).toUpperCase()}...'
              : '—');

    return GestureDetector(
      onTap: () => context.pushNamed(
        AppRoute.refundDetail.name,
        pathParameters: {'id': '${refund.id}'},
      ),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surfacePrimary,
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
                    'Yêu cầu #${refund.id}',
                    style: AppTypography.mainWith(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textMain,
                    ),
                  ),
                ),
                RefundStatusBadge(status: refund.status),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _tag(refund.refundType.label),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Đơn: $orderLabel',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.mainWith(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
              ],
            ),
            const Divider(height: 20, color: Color(0xFFF0F0F0)),
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
                  AppFormatters.formatCurrency(refund.refundAmount),
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

  Widget _tag(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.surfaceNeutral,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: AppTypography.mainWith(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppColors.textMuted,
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
                  Icons.rotate_left_rounded,
                  size: 36,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Chưa có yêu cầu hoàn tiền nào',
                style: AppTypography.mainWith(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMain,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Bạn có thể yêu cầu hoàn tiền trong màn hình đơn hàng.',
                textAlign: TextAlign.center,
                style: AppTypography.mainWith(
                  fontSize: 13,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
