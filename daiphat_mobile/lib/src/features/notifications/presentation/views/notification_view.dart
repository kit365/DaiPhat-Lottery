import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import '../../utils/notification_navigation.dart';
import '../viewmodels/notification_viewmodel.dart';

class NotificationView extends StatefulWidget {
  final NotificationViewModel viewModel;
  final VoidCallback? onBack;

  const NotificationView({
    super.key,
    required this.viewModel,
    this.onBack,
  });

  @override
  State<NotificationView> createState() => _NotificationViewState();
}

class _NotificationViewState extends State<NotificationView> {
  final _scrollController = ScrollController();

  NotificationViewModel get _viewModel => widget.viewModel;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _viewModel.fetchNotifications(refresh: true);
    });
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _viewModel.fetchNotifications();
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _onItemTap(NotificationItem item) async {
    if (!item.isRead) await _viewModel.markAsRead(item.id);

    final route = resolveNotificationRoute(
      referenceType: item.referenceType,
      referenceId: item.referenceId,
    );
    if (route == null) return;

    if (notificationNeedsReferenceCheck(item.referenceType)) {
      final available = await _viewModel.isReferenceAvailable(item.id);
      if (!available) {
        AppToast.error(
          'Nội dung tham chiếu không còn khả dụng hoặc đã bị xoá.',
        );
        return;
      }
    }

    if (!mounted) return;
    context.push(route);
  }

  Future<void> _confirmDeleteRead() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'Xoá thông báo đã đọc',
          style: GoogleFonts.publicSans(fontWeight: FontWeight.w800),
        ),
        content: Text(
          'Toàn bộ thông báo đã đọc sẽ bị xoá. Bạn có chắc chắn?',
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
            child: Text(
              'Xoá',
              style: GoogleFonts.publicSans(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _viewModel.deleteAllRead();
    AppToast.success('Đã xoá thông báo đã đọc.');
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
          onPressed: () {
            if (widget.onBack != null) {
              widget.onBack!();
            } else {
              context.pop();
            }
          },
        ),
        title: Text(
          'Thông báo',
          style: GoogleFonts.publicSans(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            tooltip: 'Cài đặt thông báo',
            icon: const Icon(
              Icons.tune_rounded,
              size: 21,
              color: AppColors.primary,
            ),
            onPressed: () => context.push(AppRoute.notificationSettings.path),
          ),
          PopupMenuButton<String>(
            icon: const Icon(
              Icons.more_vert_rounded,
              size: 21,
              color: AppColors.primary,
            ),
            onSelected: (value) async {
              if (value == 'mark_all_read') {
                await _viewModel.markAllAsRead();
                AppToast.success('Đã đánh dấu tất cả là đã đọc.');
              } else if (value == 'delete_all_read') {
                await _confirmDeleteRead();
              }
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                value: 'mark_all_read',
                child: Text(
                  'Đánh dấu tất cả đã đọc',
                  style: GoogleFonts.publicSans(fontSize: 14),
                ),
              ),
              PopupMenuItem(
                value: 'delete_all_read',
                child: Text(
                  'Xoá thông báo đã đọc',
                  style: GoogleFonts.publicSans(fontSize: 14),
                ),
              ),
            ],
          ),
        ],
      ),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) => Column(
          children: [
            _buildFilters(),
            const Divider(height: 1, color: Color(0xFFEEEEEE)),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildFilters() {
    return Container(
      color: Colors.white,
      height: 52,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        itemCount: NotificationFilter.values.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final filter = NotificationFilter.values[index];
          final isSelected = _viewModel.filter == filter;
          final label = filter == NotificationFilter.unread
              ? '${filter.label} (${_viewModel.unreadCount})'
              : filter.label;

          return GestureDetector(
            onTap: () => _viewModel.setFilter(filter),
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
    if (_viewModel.error != null && _viewModel.notifications.isEmpty) {
      return _buildError();
    }

    final items = _viewModel.filteredNotifications;
    if (items.isEmpty) return _buildEmpty();

    return RawScrollbar(
      controller: _scrollController,
      thumbVisibility: true,
      trackVisibility: true,
      thickness: 4,
      radius: const Radius.circular(999),
      thumbColor: const Color(0x66C90F1D),
      trackColor: const Color(0x14C90F1D),
      trackBorderColor: Colors.transparent,
      padding: const EdgeInsets.only(right: 2, top: 4, bottom: 4),
      child: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => _viewModel.fetchNotifications(refresh: true),
        child: ListView.builder(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
          itemCount: items.length + (_viewModel.isLoadingMore ? 1 : 0),
          itemBuilder: (context, index) {
            if (index == items.length) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              );
            }
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _buildItem(items[index]),
            );
          },
        ),
      ),
    );
  }

  Widget _buildItem(NotificationItem item) {
    final style = _NotificationStyle.of(item.type);

    return Dismissible(
      key: ValueKey(item.id),
      direction: item.isRead
          ? DismissDirection.endToStart
          : DismissDirection.none,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Icon(Icons.delete_outline_rounded, color: Colors.white),
      ),
      onDismissed: (_) async {
        final err = await _viewModel.deleteNotification(item.id);
        if (err != null) AppToast.error(err);
      },
      child: GestureDetector(
        onTap: () => _onItemTap(item),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: item.isRead ? const Color(0xFFFAFAFA) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFEFEFEF)),
            boxShadow: item.isRead
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: item.isRead ? const Color(0xFFF1F1F1) : style.bgColor,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  style.icon,
                  size: 22,
                  color: item.isRead ? const Color(0xFF9A9A9A) : style.color,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.publicSans(
                              fontSize: 14,
                              fontWeight: item.isRead
                                  ? FontWeight.w600
                                  : FontWeight.w800,
                              color: AppColors.textMain,
                            ),
                          ),
                        ),
                        if (!item.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            margin: const EdgeInsets.only(left: 8, top: 4),
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      item.body,
                      style: GoogleFonts.publicSans(
                        fontSize: 13,
                        height: 1.4,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF4F6F8),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            style.label,
                            style: GoogleFonts.publicSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          item.timeText,
                          style: GoogleFonts.publicSans(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: const Color(0xFF9A9A9A),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
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
            style: GoogleFonts.publicSans(
              fontSize: 14,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => _viewModel.fetchNotifications(refresh: true),
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
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => _viewModel.fetchNotifications(refresh: true),
      child: ListView(
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
                  child: const Icon(
                    Icons.notifications_none_rounded,
                    size: 36,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Bạn chưa có thông báo nào',
                  style: GoogleFonts.publicSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMain,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NotificationStyle {
  final IconData icon;
  final Color color;
  final Color bgColor;
  final String label;

  const _NotificationStyle(this.icon, this.color, this.bgColor, this.label);

  factory _NotificationStyle.of(String type) {
    switch (type) {
      case 'AUTH':
      case 'SECURITY':
        return const _NotificationStyle(
          Icons.shield_outlined,
          Color(0xFF388E3C),
          Color(0xFFE8F5E9),
          'Bảo mật',
        );
      case 'BLOG':
        return const _NotificationStyle(
          Icons.article_outlined,
          Color(0xFF1976D2),
          Color(0xFFE3F2FD),
          'Bài viết',
        );
      case 'ORDER':
      case 'PAYMENT':
        return const _NotificationStyle(
          Icons.receipt_long_outlined,
          Color(0xFFFFA000),
          Color(0xFFFFF8E1),
          'Đơn hàng',
        );
      case 'RESULT':
      case 'DRAW_RESULT':
        return const _NotificationStyle(
          Icons.emoji_events_outlined,
          AppColors.primary,
          Color(0xFFFFEBEB),
          'Kết quả',
        );
      case 'OFFER':
        return const _NotificationStyle(
          Icons.card_giftcard_rounded,
          AppColors.primary,
          Color(0xFFFFEBEB),
          'Ưu đãi',
        );
      default:
        return const _NotificationStyle(
          Icons.notifications_none_rounded,
          Color(0xFF64748B),
          Color(0xFFF1F5F9),
          'Hệ thống',
        );
    }
  }
}
