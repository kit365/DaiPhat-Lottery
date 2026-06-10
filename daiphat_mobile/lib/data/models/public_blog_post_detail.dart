import 'public_blog_post.dart';

class PublicBlogTag {
  final int id;
  final String name;
  final String slug;

  const PublicBlogTag({
    required this.id,
    required this.name,
    required this.slug,
  });

  factory PublicBlogTag.fromJson(Map<String, dynamic> json) {
    return PublicBlogTag(
      id: json['id'] as int,
      name: json['name'] as String,
      slug: json['slug'] as String,
    );
  }
}

class PublicBlogPostDetail {
  final int id;
  final String title;
  final String slug;
  final String summary;
  final String content;
  final String? thumbnail;
  final PublicBlogCategoryRef? category;
  final int viewCount;
  final String publishedAt;
  final List<PublicBlogTag> tags;

  const PublicBlogPostDetail({
    required this.id,
    required this.title,
    required this.slug,
    required this.summary,
    required this.content,
    this.thumbnail,
    this.category,
    this.viewCount = 0,
    required this.publishedAt,
    this.tags = const [],
  });

  factory PublicBlogPostDetail.fromJson(Map<String, dynamic> json) {
    final tagsJson = json['tags'] as List<dynamic>? ?? [];
    return PublicBlogPostDetail(
      id: json['id'] as int,
      title: json['title'] as String,
      slug: json['slug'] as String,
      summary: json['summary'] as String,
      content: json['content'] as String? ?? '',
      thumbnail: json['thumbnail'] as String?,
      category: json['category'] != null
          ? PublicBlogCategoryRef.fromJson(
              json['category'] as Map<String, dynamic>,
            )
          : null,
      viewCount: json['viewCount'] as int? ?? 0,
      publishedAt: json['publishedAt'] as String,
      tags: tagsJson
          .map((tag) => PublicBlogTag.fromJson(tag as Map<String, dynamic>))
          .toList(),
    );
  }
}
