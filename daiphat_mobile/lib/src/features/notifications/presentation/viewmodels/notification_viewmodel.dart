import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import '../../data/repositories/notification_repository.dart';
import '../../data/models/notification_model.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationItem {
  final String id;
  final String title;
  final String body;
  final String timeText;
  final bool isRead;
  final String type; // 'success', 'offer', 'payment', 'result', 'security'
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

class NotificationViewModel extends ChangeNotifier {
  final NotificationRepository _repository;

  List<NotificationItem> _notifications = [];
  List<NotificationItem> get notifications => _notifications;
  List<NotificationItem> get unreadNotifications => _notifications.where((n) => !n.isRead).toList();

  int get unreadCount => unreadNotifications.length;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isLoadingMore = false;
  bool get isLoadingMore => _isLoadingMore;

  int _page = 1;
  final int _limit = 7;
  bool _hasNextPage = true;
  bool get hasNextPage => _hasNextPage;

  NotificationViewModel(this._repository) {
    fetchNotifications();
    _setupFirebaseListener();
  }

  void _setupFirebaseListener() {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      // Whenever a foreground message arrives, refresh the list
      fetchNotifications(refresh: true);
    });
  }

  Future<void> fetchNotifications({bool refresh = false}) async {
    if (refresh) {
      _page = 1;
      _hasNextPage = true;
      _notifications = [];
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
      debugPrint('DEBUG: Fetched ${newItems.length} notifications. Total: ${response.totalElements}');
      
      if (refresh) {
        _notifications = newItems;
      } else {
        _notifications.addAll(newItems);
      }
      
      _hasNextPage = response.items.length == _limit;
      if (_hasNextPage) {
        _page++;
      }
    } catch (e, st) {
      debugPrint('Failed to fetch notifications: $e');
      debugPrint('Stack trace: $st');
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

    // Optimistic update
    _notifications[index] = _notifications[index].copyWith(isRead: true);
    notifyListeners();

    try {
      await _repository.markAsRead(intId);
    } catch (e) {
      // Revert if failed
      _notifications[index] = _notifications[index].copyWith(isRead: false);
      notifyListeners();
      debugPrint('Failed to mark as read: $e');
    }
  }

  Future<void> markAllAsRead() async {
    // Optimistic update
    final oldList = List<NotificationItem>.from(_notifications);
    _notifications = _notifications.map((n) => n.copyWith(isRead: true)).toList();
    notifyListeners();

    try {
      await _repository.markAllAsRead();
    } catch (e) {
      _notifications = oldList;
      notifyListeners();
      debugPrint('Failed to mark all as read: $e');
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

  NotificationItem _mapModelToItem(NotificationModel model) {
    String uiType = 'info';
    if (model.type == 'AUTH') uiType = 'security';
    else if (model.type == 'BLOG') uiType = 'result';
    else if (model.type == 'SYSTEM') uiType = 'info';

    return NotificationItem(
      id: model.id.toString(),
      title: model.title,
      body: model.content,
      timeText: _formatTime(model.createdAt),
      isRead: model.isRead,
      type: uiType,
      referenceId: model.referenceId,
      referenceType: model.referenceType,
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inDays == 0) {
      if (difference.inHours > 0) return '${difference.inHours} giờ trước';
      if (difference.inMinutes > 0) return '${difference.inMinutes} phút trước';
      return 'Vừa xong';
    } else if (difference.inDays == 1) {
      return 'Hôm qua, ${DateFormat('HH:mm').format(time)}';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} ngày trước';
    }
    return DateFormat('dd/MM/yyyy').format(time);
  }
}
