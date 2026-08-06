import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/support_ticket.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/providers/profile_providers.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/widgets/profile_status_badge.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import '../viewmodels/complaints_viewmodel.dart';
import 'complaint_form_page.dart';

class ComplaintsView extends ConsumerStatefulWidget {
  const ComplaintsView({super.key});

  @override
  ConsumerState<ComplaintsView> createState() => _ComplaintsViewState();
}

class _ComplaintsViewState extends ConsumerState<ComplaintsView> {
  late final ComplaintsViewModel _viewModel;
  final _scrollController = ScrollController();
  final _searchController = TextEditingController();

  static const _statusTabs = <(String?, String)>[
    (null, 'Tất cả'),
    ('OPEN', 'Mới tạo'),
    ('IN_PROGRESS', 'Đang xử lý'),
    ('WAITING_FOR_CUSTOMER', 'Chờ phản hồi'),
    ('RESOLVED', 'Đã giải quyết'),
    ('REJECTED', 'Đã từ chối'),
    ('CLOSED', 'Đã đóng'),
  ];

  @override
  void initState() {
    super.initState();
    _viewModel = ComplaintsViewModel(ref.read(supportTicketServiceProvider));
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

  Future<void> _openCreateForm() async {
    final result = await Navigator.of(context, rootNavigator: true).push(
      MaterialPageRoute(
        builder: (_) => ComplaintFormPage(
          service: ref.read(supportTicketServiceProvider),
        ),
      ),
    );
    if (result is SupportTicketResponse && mounted) {
      await _viewModel.fetch(refresh: true);
      if (!mounted) return;
      context.pushNamed(
        AppRoute.complaintDetail.name,
        pathParameters: {'id': '${result.id}'},
      );
    }
  }

  Future<void> _confirmCancel(SupportTicketSummaryResponse ticket) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Huỷ khiếu nại',
            style: GoogleFonts.publicSans(fontWeight: FontWeight.w800)),
        content: Text(
          'Bạn có chắc muốn huỷ khiếu nại này? Hành động này không thể hoàn tác.',
          style: GoogleFonts.publicSans(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Không', style: GoogleFonts.publicSans()),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: Text('Huỷ khiếu nại',
                style: GoogleFonts.publicSans(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final err = await _viewModel.cancel(ticket.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(err ?? 'Đã huỷ khiếu nại.'),
        backgroundColor: err == null ? AppColors.success : AppColors.error,
      ),
    );
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
          'Khiếu nại / Hỗ trợ',
          style: GoogleFonts.publicSans(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        centerTitle: true,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreateForm,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: Text('Tạo khiếu nại',
            style: GoogleFonts.publicSans(fontWeight: FontWeight.w700)),
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
          hintText: 'Tìm theo tiêu đề hoặc mô tả...',
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
    if (_viewModel.error != null && _viewModel.items.isEmpty) {
      return _buildError();
    }
    if (_viewModel.items.isEmpty) {
      return _buildEmpty();
    }
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => _viewModel.fetch(refresh: true),
      child: ListView.builder(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 90),
        itemCount: _viewModel.items.length + (_viewModel.isLoadingMore ? 1 : 0),
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
    );
  }

  Widget _buildCard(SupportTicketSummaryResponse ticket) {
    String createdAt = '';
    final dt = DateTime.tryParse(ticket.createdAt)?.toLocal();
    if (dt != null) createdAt = DateFormat('dd/MM/yyyy HH:mm').format(dt);
    final categoryName = _viewModel.categoryNames[ticket.ticketCategoryId] ?? '—';
    final canCancel = canCustomerCancelTicket(ticket.status);
    final isCancelling = _viewModel.cancellingId == ticket.id;

    return GestureDetector(
      onTap: () => context.pushNamed(
        AppRoute.complaintDetail.name,
        pathParameters: {'id': '${ticket.id}'},
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
                Text(
                  '#${ticket.id}',
                  style: GoogleFonts.publicSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF4F6F8),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      categoryName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.publicSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ComplaintStatusBadge(status: ticket.status),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              ticket.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.publicSans(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.textMain,
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
                if (canCancel)
                  TextButton.icon(
                    onPressed:
                        isCancelling ? null : () => _confirmCancel(ticket),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.error,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      minimumSize: const Size(0, 32),
                    ),
                    icon: isCancelling
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.block_rounded, size: 16),
                    label: Text('Huỷ',
                        style:
                            GoogleFonts.publicSans(fontWeight: FontWeight.w700)),
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
            child: Text('Thử lại',
                style: GoogleFonts.publicSans(
                    fontWeight: FontWeight.w700, color: AppColors.primary)),
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
                child: const Icon(Icons.headset_mic_rounded,
                    size: 36, color: AppColors.primary),
              ),
              const SizedBox(height: 16),
              Text(
                'Chưa có khiếu nại nào',
                style: GoogleFonts.publicSans(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMain,
                ),
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: _openCreateForm,
                child: Text('Tạo khiếu nại đầu tiên',
                    style: GoogleFonts.publicSans(
                        fontWeight: FontWeight.w700, color: AppColors.primary)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
