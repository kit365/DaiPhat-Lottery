import 'package:flutter/material.dart';
import '../../viewmodels/notification_viewmodel.dart';
import 'package:go_router/go_router.dart';

class NotificationView extends StatefulWidget {
  final NotificationViewModel viewModel;
  const NotificationView({Key? key, required this.viewModel}) : super(key: key);

  @override
  State<NotificationView> createState() => _NotificationViewState();
}

class _NotificationViewState extends State<NotificationView> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late NotificationViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = widget.viewModel;
    _tabController = TabController(length: 2, vsync: this);
    
    // Luôn tải lại thông báo mới nhất khi mở trang
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _viewModel.fetchNotifications(refresh: true);
    });

    _viewModel.addListener(_onViewModelChanged);
  }

  void _onViewModelChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _tabController.dispose();
    _viewModel.removeListener(_onViewModelChanged);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    print('========= NOTIFICATION VIEW BUILD =========');
    print('isLoading: ${_viewModel.isLoading}, count: ${_viewModel.notifications.length}');
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Column(
        children: [
          _buildHeader(context),
          const SizedBox(height: 8),
          Expanded(
            child: _viewModel.isLoading 
              ? const Center(child: CircularProgressIndicator(color: Color(0xFFE90000)))
              : NotificationListener<ScrollNotification>(
                  onNotification: (ScrollNotification scrollInfo) {
                    if (scrollInfo.metrics.pixels >= scrollInfo.metrics.maxScrollExtent - 200) {
                      if (!_viewModel.isLoading && !_viewModel.isLoadingMore && _viewModel.hasNextPage) {
                        _viewModel.fetchNotifications(refresh: false);
                      }
                    }
                    return false;
                  },
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildNotificationList(_viewModel.notifications),
                      _buildNotificationList(_viewModel.unreadNotifications),
                    ],
                  ),
                ),
          ),
          if (_viewModel.isLoadingMore)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: Center(child: CircularProgressIndicator(color: Color(0xFFE90000), strokeWidth: 2)),
            ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;
    return SizedBox(
      height: topPadding + 130,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Background Image
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: topPadding + 105,
            child: Image.asset(
              'assets/images/home_bg.png',
              fit: BoxFit.cover,
            ),
          ),
          // AppBar elements
          Positioned(
            top: topPadding + 10,
            left: 0,
            right: 0,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      padding: EdgeInsets.zero,
                      icon: const Icon(Icons.arrow_back, color: Color(0xFFE90000), size: 22),
                      onPressed: () => context.pop(),
                    ),
                  ),
                  const Text(
                    'Thông báo',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: PopupMenuButton<String>(
                      padding: EdgeInsets.zero,
                      icon: const Icon(Icons.settings_outlined, color: Color(0xFFE90000), size: 22),
                      onSelected: (value) {
                        if (value == 'mark_all_read') {
                          _viewModel.markAllAsRead();
                        } else if (value == 'delete_all_read') {
                          _viewModel.deleteAllRead();
                        }
                      },
                      itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                        const PopupMenuItem<String>(
                          value: 'mark_all_read',
                          child: Text('Đánh dấu tất cả đã đọc'),
                        ),
                        const PopupMenuItem<String>(
                          value: 'delete_all_read',
                          child: Text('Xóa thông báo đã đọc'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Floating TabBar
          Positioned(
            left: 16,
            right: 16,
            bottom: 0,
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: TabBar(
                controller: _tabController,
                indicatorColor: const Color(0xFFE90000),
                indicatorWeight: 3,
                labelColor: const Color(0xFFE90000),
                unselectedLabelColor: Colors.grey[600],
                labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 15),
                indicatorSize: TabBarIndicatorSize.tab,
                dividerColor: Colors.transparent,
                tabs: [
                  const Tab(text: 'Tất cả'),
                  Tab(text: 'Chưa đọc (${_viewModel.unreadCount})'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationList(List<NotificationItem> items) {
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => _viewModel.fetchNotifications(refresh: true),
        color: const Color(0xFFE90000),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 100),
            Center(
              child: Text('Không có thông báo nào.', style: TextStyle(color: Colors.grey)),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: () => _viewModel.fetchNotifications(refresh: true),
      color: const Color(0xFFE90000),
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          return _buildNotificationItem(items[index]);
        },
      ),
    );
  }

  Widget _buildNotificationItem(NotificationItem item) {
    IconData iconData;
    Color iconColor;
    Color bgColor;

    switch (item.type) {
      case 'success':
        iconData = Icons.verified_user_outlined;
        iconColor = const Color(0xFFE90000);
        bgColor = const Color(0xFFFFEBEB);
        break;
      case 'offer':
        iconData = Icons.card_giftcard;
        iconColor = const Color(0xFFE90000);
        bgColor = const Color(0xFFFFEBEB);
        break;
      case 'payment':
        iconData = Icons.monetization_on;
        iconColor = const Color(0xFFFFA000);
        bgColor = const Color(0xFFFFF8E1);
        break;
      case 'result':
        iconData = Icons.calendar_month_outlined;
        iconColor = const Color(0xFF1976D2);
        bgColor = const Color(0xFFE3F2FD);
        break;
      case 'security':
        iconData = Icons.security;
        iconColor = const Color(0xFF388E3C);
        bgColor = const Color(0xFFE8F5E9);
        break;
      default:
        iconData = Icons.notifications_none;
        iconColor = Colors.grey;
        bgColor = Colors.grey[200]!;
    }

    final bool isRead = item.isRead;
    final Color textColor = isRead ? Colors.grey[600]! : Colors.black87;

    return GestureDetector(
      onTap: () {
        if (!isRead) {
          _viewModel.markAsRead(item.id);
        }
        if (item.referenceType == 'BLOG_POST' && item.referenceId != null) {
          // Future mapping to blog detail
          // context.push('/blogs/detail/${item.referenceId}');
        }
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isRead ? Colors.grey[50] : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey[200]!),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isRead ? Colors.grey[200] : bgColor,
                shape: BoxShape.circle,
              ),
              child: Icon(iconData, color: isRead ? Colors.grey : iconColor, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
                            color: textColor,
                          ),
                        ),
                      ),
                      if (!isRead)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Color(0xFFE90000),
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item.body,
                    style: TextStyle(
                      fontSize: 14,
                      color: isRead ? Colors.grey[500] : Colors.grey[700],
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    item.timeText,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.grey,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
