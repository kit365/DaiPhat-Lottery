import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';

import '../../../../shared/network/api_exception.dart';
import '../../data/models/notification_model.dart';
import '../../data/repositories/notification_repository.dart';

class NotificationItem {
  final String id;
  final String title;
  final String body;
  final String timeText;
  final bool isRead;

  /// Raw backend type: SYSTEM, AUTH, BLOG, ORDER, RESULT, DRAW_RESULT...
  final String type;
  final String? referenceId;
  final String? referenceType;

  NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    required this.timeText,
    required this.isRead,
    required this.type,
    this.referenceId,
    this.referenceType,
  });

  NotificationItem copyWith({bool? isRead}) {
    return NotificationItem(
      id: id,
      title: title,
      body: body,
      timeText: timeText,
      isRead: isRead ?? this.isRead,
      type: type,
      referenceId: referenceId,
      referenceType: referenceType,
    );
  }
}

/// Client-side filters, matching the tabs available on the web client.
enum NotificationFilter { all, unread, order, result, auth, blog, system }

extension NotificationFilterX on NotificationFilter {
  String get label {
    switch (this) {
      case NotificationFilter.all:
        return 'Tất cả';
      case NotificationFilter.unread:
        return 'Chưa đọc';
      case NotificationFilter.order:
        return 'Đơn hàng';
      case NotificationFilter.result:
        return 'Kết quả';
      case NotificationFilter.auth:
        return 'Bảo mật';
      case NotificationFilter.blog:
        return 'Bài viết';
      case NotificationFilter.system:
        return 'Hệ thống';
    }
  }

  bool matches(NotificationItem item) {
    switch (this) {
      case NotificationFilter.all:
        return true;
      case NotificationFilter.unread:
        return !item.isRead;
      case NotificationFilter.order:
        return item.type == 'ORDER' || item.type == 'PAYMENT';
      case NotificationFilter.result:
        return item.type == 'RESULT' || item.type == 'DRAW_RESULT';
      case NotificationFilter.auth:
        return item.type == 'AUTH' || item.type == 'SECURITY';
      case NotificationFilter.blog:
        return item.type == 'BLOG';
      case NotificationFilter.system:
        return item.type == 'SYSTEM' ||
            item.type == 'SUCCESS' ||
            item.type == 'OFFER';
    }
  }
}

class NotificationViewModel extends ChangeNotifier {
  final NotificationRepository _repository;

  List<NotificationItem> _notifications = [];
  List<NotificationItem> get notifications => _notifications;

  List<NotificationItem> get unreadNotifications =>
      _notifications.where((n) => !n.isRead).toList();

  NotificationFilter _filter = NotificationFilter.all;
  NotificationFilter get filter => _filter;

  List<NotificationItem> get filteredNotifications =>
      _notifications.where(_filter.matches).toList();

  Map<String, int> _statusCounts = const {};

  /// Prefers the server-side count so the badge stays accurate even when only
  /// the first pages have been loaded.
  int get unreadCount =>
      _statusCounts['unread'] ?? _notifications.where((n) => !n.isRead).length;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isLoadingMore = false;
  bool get isLoadingMore => _isLoadingMore;

  String? _error;
  String? get error => _error;

  int _page = 1;
  final int _limit = 10;
  bool _hasNextPage = true;
  bool get hasNextPage => _hasNextPage;

  NotificationViewModel(this._repository, {bool autoFetch = false}) {
    if (autoFetch) {
      fetchNotifications();
    }
    _setupFirebaseListener();
  }

  void _setupFirebaseListener() {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      fetchNotifications(refresh: true);
    });
  }

  void setFilter(NotificationFilter filter) {
    if (_filter == filter) return;
    _filter = filter;
    notifyListeners();
  }

  Future<void> fetchNotifications({bool refresh = false}) async {
    if (refresh) {
      _page = 1;
      _hasNextPage = true;
      _notifications = [];
      _error = null;
      _isLoading = true;
      notifyListeners();
    } else {
      if (!_hasNextPage || _isLoading || _isLoadingMore) return;
      _isLoadingMore = true;
      notifyListeners();
    }

    try {
      final response = await _repository.getMyNotifications(_page, _limit);
      final newItems = response.items.map(_mapModelToItem).toList();

      if (refresh) {
        _notifications = newItems;
      } else {
        _notifications.addAll(newItems);
      }

      _statusCounts = response.statusCounts;
      _hasNextPage = response.items.length == _limit;
      if (_hasNextPage) _page++;
      _error = null;
    } catch (e) {
      if (e is ApiException && e.statusCode == 401) {
        _notifications = [];
        _statusCounts = const {};
        _error = null;
      } else {
        _error = 'Không tải được thông báo. Vui lòng thử lại.';
        debugPrint('Failed to fetch notifications: $e');
      }
    } finally {
      _isLoading = false;
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  Future<void> markAsRead(String id) async {
    final intId = int.tryParse(id);
    if (intId == null) return;

    final index = _notifications.indexWhere((n) => n.id == id);
    if (index == -1 || _notifications[index].isRead) return;

    _notifications[index] = _notifications[index].copyWith(isRead: true);
    _bumpUnreadCount(-1);
    notifyListeners();

    try {
      await _repository.markAsRead(intId);
    } catch (e) {
      _notifications[index] = _notifications[index].copyWith(isRead: false);
      _bumpUnreadCount(1);
      notifyListeners();
      debugPrint('Failed to mark as read: $e');
    }
  }

  Future<void> markAllAsRead() async {
    final oldList = List<NotificationItem>.from(_notifications);
    final oldCounts = _statusCounts;
    _notifications = _notifications
        .map((n) => n.copyWith(isRead: true))
        .toList();
    _statusCounts = {..._statusCounts, 'unread': 0};
    notifyListeners();

    try {
      await _repository.markAllAsRead();
    } catch (e) {
      _notifications = oldList;
      _statusCounts = oldCounts;
      notifyListeners();
      debugPrint('Failed to mark all as read: $e');
    }
  }

  Future<String?> deleteNotification(String id) async {
    final intId = int.tryParse(id);
    if (intId == null) return 'Thông báo không hợp lệ.';

    final index = _notifications.indexWhere((n) => n.id == id);
    if (index == -1) return null;
    if (!_notifications[index].isRead) {
      return 'Chỉ có thể xoá thông báo đã đọc.';
    }

    final removed = _notifications.removeAt(index);
    notifyListeners();

    try {
      await _repository.deleteReadNotification(intId);
      return null;
    } catch (e) {
      _notifications.insert(index, removed);
      notifyListeners();
      return 'Không xoá được thông báo.';
    }
  }

  Future<void> deleteAllRead() async {
    final oldList = List<NotificationItem>.from(_notifications);
    _notifications = _notifications.where((n) => !n.isRead).toList();
    notifyListeners();

    try {
      await _repository.deleteAllReadNotifications();
    } catch (e) {
      _notifications = oldList;
      notifyListeners();
      debugPrint('Failed to delete all read: $e');
    }
  }

  Future<bool> isReferenceAvailable(String id) async {
    final intId = int.tryParse(id);
    if (intId == null) return false;
    try {
      return await _repository.isReferenceAvailable(intId);
    } catch (e) {
      debugPrint('Failed to resolve notification reference: $e');
      return false;
    }
  }

  void _bumpUnreadCount(int delta) {
    final current = _statusCounts['unread'];
    if (current == null) return;
    _statusCounts = {
      ..._statusCounts,
      'unread': (current + delta).clamp(0, 1 << 31),
    };
  }

  NotificationItem _mapModelToItem(NotificationModel model) {
    return NotificationItem(
      id: model.id.toString(),
      title: model.title,
      body: model.content,
      timeText: _formatTime(model.createdAt),
      isRead: model.isRead,
      type: model.type.toUpperCase(),
      referenceId: model.referenceId,
      referenceType: model.referenceType,
    );
  }

  String _formatTime(DateTime time) {
    final local = time.toLocal();
    final difference = DateTime.now().difference(local);

    if (difference.inDays == 0) {
      if (difference.inHours > 0) return '${difference.inHours} giờ trước';
      if (difference.inMinutes > 0) return '${difference.inMinutes} phút trước';
      return 'Vừa xong';
    }
    if (difference.inDays == 1) {
      return 'Hôm qua, ${DateFormat('HH:mm').format(local)}';
    }
    if (difference.inDays < 7) return '${difference.inDays} ngày trước';
    return DateFormat('dd/MM/yyyy').format(local);
  }
}
