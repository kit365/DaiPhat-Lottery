import 'dart:async';

import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/features/profile/domain/entities/support_ticket.dart';
import 'package:daiphat_mobile/src/features/profile/domain/usecases/support_ticket_usecases.dart';

class ComplaintDetailViewModel extends ChangeNotifier {
  final GetSupportTicketDetail _getSupportTicketDetail;
  final GetTicketCategories _getTicketCategories;
  final AddSupportTicketComment _addSupportTicketComment;
  final SubmitSupportTicketResolutionFeedback _submitResolutionFeedback;
  final CloseSupportTicket _closeSupportTicket;
  final int ticketId;

  static const _pollInterval = Duration(seconds: 3);

  ComplaintDetailViewModel(
    this._getSupportTicketDetail,
    this._getTicketCategories,
    this._addSupportTicketComment,
    this._submitResolutionFeedback,
    this._closeSupportTicket,
    this.ticketId,
  ) {
    load();
    _startPolling();
  }

  SupportTicketResponse? _ticket;
  SupportTicketResponse? get ticket => _ticket;

  final Map<int, String> _categoryNames = {};
  Map<int, String> get categoryNames => _categoryNames;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  bool _isBusy = false;
  bool get isBusy => _isBusy;

  bool _isSendingComment = false;
  bool get isSendingComment => _isSendingComment;

  Timer? _pollTimer;
  bool _disposed = false;

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(_pollInterval, (_) {
      if (_disposed || _isLoading || _isSendingComment || _isBusy) return;
      unawaited(refreshComments());
    });
  }

  Future<void> load() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _getSupportTicketDetail(ticketId),
        _getTicketCategories(),
      ]);
      if (_disposed) return;
      _ticket = results[0] as SupportTicketResponse;
      final categories = results[1] as List<TicketCategoryResponse>;
      _categoryNames
        ..clear()
        ..addEntries(categories.map((c) => MapEntry(c.id, c.name)));
    } catch (e) {
      if (_disposed) return;
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      if (!_disposed) {
        _isLoading = false;
        notifyListeners();
      }
    }
  }

  /// Poll nhẹ mỗi 3s (giống FE web) để cập nhật hội thoại / trạng thái.
  Future<void> refreshComments() async {
    try {
      final updated = await _getSupportTicketDetail(ticketId);
      if (_disposed) return;
      final current = _ticket;
      if (current == null) {
        _ticket = updated;
        notifyListeners();
        return;
      }

      final commentsChanged =
          updated.comments.length != current.comments.length ||
              (updated.comments.isNotEmpty &&
                  current.comments.isNotEmpty &&
                  updated.comments.last.id != current.comments.last.id);
      final statusChanged = updated.status != current.status;

      if (commentsChanged || statusChanged) {
        _ticket = updated;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<String?> sendComment(String content, {String? filePath}) async {
    _isSendingComment = true;
    notifyListeners();
    try {
      await _addSupportTicketComment(ticketId, content, filePath: filePath);
      _ticket = await _getSupportTicketDetail(ticketId);
      return null;
    } catch (e) {
      return e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isSendingComment = false;
      notifyListeners();
    }
  }

  Future<String?> submitFeedback(bool satisfied) async {
    _isBusy = true;
    notifyListeners();
    try {
      _ticket = await _submitResolutionFeedback(ticketId, satisfied);
      return null;
    } catch (e) {
      return e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isBusy = false;
      notifyListeners();
    }
  }

  Future<String?> cancel() async {
    _isBusy = true;
    notifyListeners();
    try {
      _ticket = await _closeSupportTicket(ticketId);
      return null;
    } catch (e) {
      return e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isBusy = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _pollTimer?.cancel();
    _pollTimer = null;
    super.dispose();
  }
}
