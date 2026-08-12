import 'dart:convert';

import 'package:dio/dio.dart';

import 'package:daiphat_mobile/src/features/profile/data/models/support_ticket.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';

/// Payload tạo/cập nhật một khiếu nại.
class SupportTicketFormData {
  final int ticketCategoryId;
  final String title;
  final String description;
  final String? refId;
  final String? refType;

  const SupportTicketFormData({
    required this.ticketCategoryId,
    required this.title,
    required this.description,
    this.refId,
    this.refType,
  });

  Map<String, dynamic> toJson() => {
        'ticketCategoryId': ticketCategoryId,
        'title': title,
        'description': description,
        if (refId != null && refId!.isNotEmpty) 'refId': refId,
        if (refType != null && refType!.isNotEmpty) 'refType': refType,
      };
}

class SupportTicketService {
  final ApiClient _apiClient;

  SupportTicketService(this._apiClient);

  Future<List<TicketCategoryResponse>> getCategories() async {
    final response = await _apiClient.get('/ticket-categories');
    final data = response['data'] as List<dynamic>? ?? const [];
    return data
        .map((e) => TicketCategoryResponse.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<SupportTicketPageResult> getMyTickets({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
  }) async {
    final response = await _apiClient.get(
      '/tickets/my',
      queryParameters: {
        'page': page,
        'limit': limit,
        if (status != null && status.isNotEmpty) 'status': status,
        if (search != null && search.isNotEmpty) 'search': search,
      },
    );
    final data = response['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không thể tải danh sách khiếu nại.',
      );
    }
    return SupportTicketPageResult.fromJson(data);
  }

  Future<int> getMyActiveCount() async {
    try {
      final response = await _apiClient.get('/tickets/my/active-count');
      final data = response['data'];
      if (data is int) return data;
      return int.tryParse(data?.toString() ?? '') ?? 0;
    } catch (_) {
      return 0;
    }
  }

  Future<SupportTicketResponse> getById(int id) async {
    final response = await _apiClient.get('/tickets/$id');
    final data = response['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không tìm thấy khiếu nại.',
      );
    }
    return SupportTicketResponse.fromJson(data);
  }

  Future<SupportTicketResponse> create(
    SupportTicketFormData data, {
    String? filePath,
  }) async {
    final formData = await _buildMultipart(data.toJson(), filePath);
    final response = await _apiClient.post('/tickets', data: formData);
    final result = response['data'];
    if (result is! Map<String, dynamic>) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không thể tạo khiếu nại.',
      );
    }
    return SupportTicketResponse.fromJson(result);
  }

  Future<SupportTicketResponse> update(
    int id,
    SupportTicketFormData data, {
    String? filePath,
  }) async {
    final formData = await _buildMultipart(data.toJson(), filePath);
    final response = await _apiClient.patch('/tickets/$id', data: formData);
    final result = response['data'];
    if (result is! Map<String, dynamic>) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không thể cập nhật khiếu nại.',
      );
    }
    return SupportTicketResponse.fromJson(result);
  }

  Future<SupportTicketResponse> close(int id) async {
    final response = await _apiClient.patch('/tickets/$id/close');
    final data = response['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không thể huỷ khiếu nại.',
      );
    }
    return SupportTicketResponse.fromJson(data);
  }

  Future<SupportTicketResponse> submitResolutionFeedback(
    int id,
    bool satisfied,
  ) async {
    final response = await _apiClient.put(
      '/tickets/$id/resolution-feedback',
      data: {'satisfied': satisfied},
    );
    final data = response['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không thể gửi phản hồi.',
      );
    }
    return SupportTicketResponse.fromJson(data);
  }

  Future<List<SupportTicketCommentResponse>> getComments(int id) async {
    final response = await _apiClient.get('/tickets/$id/comments');
    final data = response['data'] as List<dynamic>? ?? const [];
    return data
        .map((e) =>
            SupportTicketCommentResponse.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<SupportTicketCommentResponse> addComment(
    int id,
    String content, {
    String? filePath,
  }) async {
    final formData = await _buildMultipart({'content': content}, filePath);
    final response =
        await _apiClient.post('/tickets/$id/comments', data: formData);
    final data = response['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException(
        response['message']?.toString().isNotEmpty == true
            ? response['message'].toString()
            : 'Không thể gửi bình luận.',
      );
    }
    return SupportTicketCommentResponse.fromJson(data);
  }

  Future<FormData> _buildMultipart(
    Map<String, dynamic> data,
    String? filePath,
  ) async {
    final formData = FormData();
    formData.files.add(
      MapEntry(
        'data',
        MultipartFile.fromString(
          jsonEncode(data),
          contentType: DioMediaType('application', 'json'),
        ),
      ),
    );
    if (filePath != null && filePath.isNotEmpty) {
      formData.files.add(
        MapEntry('file', await MultipartFile.fromFile(filePath)),
      );
    }
    return formData;
  }
}
