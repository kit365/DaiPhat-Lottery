import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/api_response.dart';
import '../../core/network/page_response.dart';
import '../models/blog_category.dart';
import '../models/public_blog_post.dart';
import '../models/public_blog_post_detail.dart';

/// Service gọi API blog public — mirror daiphat-fe/src/client/services/blogService.ts
class BlogApiService {
  final ApiClient _apiClient;

  BlogApiService(this._apiClient);

  /// GET /blogs/categories/public
  Future<List<BlogCategory>> getPublicCategories() async {
    final response = await _apiClient.get('/blogs/categories/public');
    final apiResponse = ApiResponse<List<BlogCategory>>.fromJson(
      response,
      (json) => (json as List<dynamic>)
          .map((item) => BlogCategory.fromJson(item as Map<String, dynamic>))
          .toList(),
    );

    if (!apiResponse.isSuccess) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không thể tải danh mục blog.',
      );
    }

    return apiResponse.data ?? [];
  }

  /// GET /blogs/public?page&limit&q&categoryId&sortBy&direction
  Future<PageResponse<PublicBlogPost>> getPublicPosts({
    int page = 1,
    int limit = 10,
    String? q,
    int? categoryId,
    String sortBy = 'createdAt',
    String direction = 'desc',
  }) async {
    final queryParameters = <String, dynamic>{
      'page': page,
      'limit': limit,
      'sortBy': sortBy,
      'direction': direction,
    };

    if (q != null && q.trim().isNotEmpty) {
      queryParameters['q'] = q.trim();
    }
    if (categoryId != null) {
      queryParameters['categoryId'] = categoryId;
    }

    final response = await _apiClient.get(
      '/blogs/public',
      queryParameters: queryParameters,
    );

    final apiResponse = ApiResponse<PageResponse<PublicBlogPost>>.fromJson(
      response,
      (json) => PageResponse.fromJson(
        json as Map<String, dynamic>,
        (item) => PublicBlogPost.fromJson(item as Map<String, dynamic>),
      ),
    );

    if (!apiResponse.isSuccess || apiResponse.data == null) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không thể tải danh sách bài viết.',
      );
    }

    return apiResponse.data!;
  }

  /// GET /blogs/public/{slug}
  Future<PublicBlogPostDetail> getPublicPostBySlug(String slug) async {
    final response = await _apiClient.get('/blogs/public/$slug');
    final apiResponse = ApiResponse<PublicBlogPostDetail>.fromJson(
      response,
      (json) => PublicBlogPostDetail.fromJson(json as Map<String, dynamic>),
    );

    if (!apiResponse.isSuccess || apiResponse.data == null) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không thể tải chi tiết bài viết.',
      );
    }

    return apiResponse.data!;
  }

  /// GET /blogs/public/{slug}/related?limit
  Future<List<PublicBlogPost>> getRelatedPublicPosts(
    String slug, {
    int limit = 4,
  }) async {
    final response = await _apiClient.get(
      '/blogs/public/$slug/related',
      queryParameters: {'limit': limit},
    );

    final apiResponse = ApiResponse<List<PublicBlogPost>>.fromJson(
      response,
      (json) => (json as List<dynamic>)
          .map((item) => PublicBlogPost.fromJson(item as Map<String, dynamic>))
          .toList(),
    );

    if (!apiResponse.isSuccess) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không thể tải bài viết liên quan.',
      );
    }

    return apiResponse.data ?? [];
  }

  /// PATCH /blogs/{id}/view
  Future<void> incrementPostView(int id) async {
    final response = await _apiClient.patch('/blogs/$id/view');
    final apiResponse = ApiResponse<dynamic>.fromJson(response, null);

    if (!apiResponse.isSuccess) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không thể cập nhật lượt xem.',
      );
    }
  }
}
