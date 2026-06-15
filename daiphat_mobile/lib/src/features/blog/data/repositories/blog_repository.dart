import 'package:daiphat_mobile/src/features/blog/presentation/models/blog_post.dart';
import '../models/blog_category.dart';
import '../models/public_blog_post.dart';
import '../models/public_blog_post_detail.dart';
import '../services/blog_api_service.dart';

class BlogListResult {
  final List<BlogCategory> categories;
  final BlogPost? featured;
  final List<BlogPost> popular;
  final List<BlogPost> recent;

  const BlogListResult({
    required this.categories,
    this.featured,
    required this.popular,
    required this.recent,
  });
}

class BlogDetailResult {
  final BlogPost post;
  final List<BlogPost> related;

  const BlogDetailResult({
    required this.post,
    required this.related,
  });
}

class BlogRepository {
  final BlogApiService _apiService;

  BlogRepository(this._apiService);

  Future<BlogListResult> fetchBlogList({
    String? q,
    int? categoryId,
  }) async {
    final apiCategories = await _apiService.getPublicCategories();
    final totalCount = apiCategories.fold<int>(
      0,
      (sum, category) => sum + category.postCount,
    );
    final categories = [
      BlogCategory(
        id: 0,
        name: 'Tất cả bài viết',
        slug: 'all',
        postCount: totalCount,
      ),
      ...apiCategories,
    ];

    final popularResponse = await _apiService.getPublicPosts(
      page: 1,
      limit: 5,
      q: q,
      categoryId: categoryId,
      sortBy: 'viewCount',
      direction: 'desc',
    );

    final recentResponse = await _apiService.getPublicPosts(
      page: 1,
      limit: 10,
      q: q,
      categoryId: categoryId,
      sortBy: 'createdAt',
      direction: 'desc',
    );

    final popularPosts = popularResponse.items.map(_mapToUiPost).toList();
    final recentPosts = recentResponse.items.map(_mapToUiPost).toList();

    return BlogListResult(
      categories: categories,
      featured: popularPosts.isNotEmpty ? popularPosts.first : null,
      popular: popularPosts.length > 1 ? popularPosts.sublist(1) : const [],
      recent: recentPosts,
    );
  }

  Future<BlogDetailResult> fetchBlogDetail(String slug) async {
    final detail = await _apiService.getPublicPostBySlug(slug);
    final related = await _apiService.getRelatedPublicPosts(slug, limit: 4);

    return BlogDetailResult(
      post: _mapDetailToUiPost(detail),
      related: related.map(_mapToUiPost).toList(),
    );
  }

  Future<void> incrementPostView(int id) {
    return _apiService.incrementPostView(id);
  }

  BlogPost _mapToUiPost(PublicBlogPost post) {
    return BlogPost(
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.summary,
      author: 'ĐẠI PHÁT',
      authorDate: _formatRelativeDate(post.publishedAt),
      date: _formatDate(post.publishedAt),
      imageUrl: post.thumbnail ?? '',
      category: post.category?.name ?? 'Tất cả bài viết',
      viewCount: post.viewCount,
      bodyParagraphs: _parseHtmlToParagraphs(post.summary),
      htmlContent: '',
      tags: post.category != null
          ? ['#${post.category!.name.replaceAll(' ', '')}']
          : const [],
    );
  }

  BlogPost _mapDetailToUiPost(PublicBlogPostDetail post) {
    final paragraphs = _parseHtmlToParagraphs(post.content);
    return BlogPost(
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.summary,
      author: 'ĐẠI PHÁT',
      authorDate: _formatRelativeDate(post.publishedAt),
      date: _formatDate(post.publishedAt),
      imageUrl: post.thumbnail ?? '',
      category: post.category?.name ?? 'Tất cả bài viết',
      viewCount: post.viewCount,
      bodyParagraphs: paragraphs.isNotEmpty ? paragraphs : [post.summary],
      htmlContent: post.content,
      tags: post.tags.map((tag) => '#${tag.name}').toList(),
    );
  }

  List<String> _parseHtmlToParagraphs(String html) {
    if (html.trim().isEmpty) return [];

    final paragraphMatches = RegExp(
      r'<p[^>]*>(.*?)</p>',
      caseSensitive: false,
      dotAll: true,
    ).allMatches(html);

    if (paragraphMatches.isNotEmpty) {
      return paragraphMatches
          .map((match) => _decodeHtmlEntities(match.group(1)!.trim()))
          .where((text) => text.isNotEmpty)
          .toList();
    }

    final plainText = _decodeHtmlEntities(
      html.replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
          .replaceAll(RegExp(r'<[^>]*>'), ' ')
          .trim(),
    );

    return plainText.isEmpty ? [] : [plainText];
  }

  String _decodeHtmlEntities(String text) {
    return text
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  String _formatDate(String isoDate) {
    try {
      final date = DateTime.parse(isoDate);
      final d = date.day.toString().padLeft(2, '0');
      final m = date.month.toString().padLeft(2, '0');
      return '$d/$m/${date.year}';
    } catch (_) {
      return isoDate;
    }
  }

  String _formatRelativeDate(String isoDate) {
    try {
      final date = DateTime.parse(isoDate);
      final diff = DateTime.now().difference(date);
      if (diff.inDays == 0) return 'Hôm nay';
      if (diff.inDays == 1) return '1 ngày trước';
      if (diff.inDays < 7) return '${diff.inDays} ngày trước';
      return _formatDate(isoDate);
    } catch (_) {
      return isoDate;
    }
  }
}

