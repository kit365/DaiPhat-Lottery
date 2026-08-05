import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/features/profile/data/models/support_ticket.dart';
import 'package:daiphat_mobile/src/features/profile/data/support_ticket_service.dart';

class ComplaintDetailViewModel extends ChangeNotifier {
  final SupportTicketService _service;
  final int ticketId;

  ComplaintDetailViewModel(this._service, this.ticketId) {
    load();
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

  Future<void> load() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _service.getById(ticketId),
        _service.getCategories(),
      ]);
      _ticket = results[0] as SupportTicketResponse;
      final categories = results[1] as List<TicketCategoryResponse>;
      _categoryNames
        ..clear()
        ..addEntries(categories.map((c) => MapEntry(c.id, c.name)));
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshComments() async {
    try {
      final comments = await _service.getComments(ticketId);
      final current = _ticket;
      if (current == null) return;
      if (comments.length != current.comments.length) {
        _ticket = await _service.getById(ticketId);
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<String?> sendComment(String content, {String? filePath}) async {
    _isSendingComment = true;
    notifyListeners();
    try {
      await _service.addComment(ticketId, content, filePath: filePath);
      _ticket = await _service.getById(ticketId);
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
      _ticket = await _service.submitResolutionFeedback(ticketId, satisfied);
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
      _ticket = await _service.close(ticketId);
      return null;
    } catch (e) {
      return e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isBusy = false;
      notifyListeners();
    }
  }
}
