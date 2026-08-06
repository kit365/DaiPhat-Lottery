import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_response.dart';

import '../models/chat_models.dart';

class ChatApiService {
  ChatApiService(this._apiClient);

  final ApiClient _apiClient;
  static const _base = '/chat/conversations';

  Future<bool> getAiStatus() async {
    try {
      final response = await _apiClient.get('/chat/ai-status');
      final apiResponse = ApiResponse<Map<String, dynamic>>.fromJson(
        response,
        (json) => Map<String, dynamic>.from(json as Map),
      );
      return apiResponse.data?['enabled'] != false;
    } catch (_) {
      return true;
    }
  }

  Future<ConversationDetailModel?> initConversation({
    String? title,
    String? content,
    bool requestStaff = false,
  }) async {
    final response = await _apiClient.post(
      '$_base/init',
      data: {
        'title': ?title,
        'content': ?content,
        'requestStaff': requestStaff,
      },
    );
    return _parseDetailResponse(response);
  }

  Future<ConversationDetailModel?> getOpenConversation() async {
    try {
      final response = await _apiClient.get('$_base/my/open');
      return _parseDetailResponse(response);
    } catch (_) {
      return null;
    }
  }

  Future<ConversationDetailModel?> getConversationDetail(int id) async {
    try {
      final response = await _apiClient.get('$_base/my/$id');
      return _parseDetailResponse(response);
    } catch (_) {
      return null;
    }
  }

  Future<ConversationDetailModel?> escalateConversation(int id) async {
    final response = await _apiClient.post(
      '$_base/my/$id/escalate',
      data: const {'reason': 'CUSTOMER_REQUEST'},
    );
    return _parseDetailResponse(response);
  }

  Future<ConversationDetailModel?> cancelStaffRequest(int id) async {
    final response = await _apiClient.post('$_base/my/$id/cancel-staff-request');
    return _parseDetailResponse(response);
  }

  Future<ConversationDetailModel?> disconnectStaff(int id) async {
    final response = await _apiClient.post('$_base/my/$id/disconnect-staff');
    return _parseDetailResponse(response);
  }

  Future<void> markAsRead(int id) async {
    try {
      await _apiClient.post('$_base/my/$id/read');
    } catch (_) {}
  }

  Future<ChatTimelinePageModel> getMyTimeline({
    int limit = 30,
    String? beforeCreatedAt,
    int? beforeId,
  }) async {
    final response = await _apiClient.get(
      '$_base/my/timeline',
      queryParameters: {
        'limit': limit,
        'beforeCreatedAt': ?beforeCreatedAt,
        'beforeId': ?beforeId,
      },
    );
    final apiResponse = ApiResponse<Map<String, dynamic>>.fromJson(
      response,
      (json) => Map<String, dynamic>.from(json as Map),
    );
    if (!apiResponse.isSuccess || apiResponse.data == null) {
      throw Exception(apiResponse.message);
    }
    return ChatTimelinePageModel.fromJson(apiResponse.data!);
  }

  ConversationDetailModel? _parseDetailResponse(Map<String, dynamic> response) {
    final apiResponse = ApiResponse<Map<String, dynamic>>.fromJson(
      response,
      (json) => Map<String, dynamic>.from(json as Map),
    );
    if (!apiResponse.isSuccess || apiResponse.data == null) {
      return null;
    }
    return ConversationDetailModel.fromJson(apiResponse.data!);
  }
}
