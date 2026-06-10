class PublicBlogCategoryRef {
  final int id;
  final String name;
  final String slug;

  const PublicBlogCategoryRef({
    required this.id,
    required this.name,
    required this.slug,
  });

  factory PublicBlogCategoryRef.fromJson(Map<String, dynamic> json) {
    return PublicBlogCategoryRef(
      id: json['id'] as int,
      name: json['name'] as String,
      slug: json['slug'] as String,
    );
  }
}

class PublicBlogPost {
  final int id;
  final String title;
  final String slug;
  final String summary;
  final String? thumbnail;
  final PublicBlogCategoryRef? category;
  final int viewCount;
  final String publishedAt;

  const PublicBlogPost({
    required this.id,
    required this.title,
    required this.slug,
    required this.summary,
    this.thumbnail,
    this.category,
    this.viewCount = 0,
    required this.publishedAt,
  });

  factory PublicBlogPost.fromJson(Map<String, dynamic> json) {
    return PublicBlogPost(
      id: json['id'] as int,
      title: json['title'] as String,
      slug: json['slug'] as String,
      summary: json['summary'] as String,
      thumbnail: json['thumbnail'] as String?,
      category: json['category'] != null
          ? PublicBlogCategoryRef.fromJson(json['category'] as Map<String, dynamic>)
          : null,
      viewCount: json['viewCount'] as int? ?? 0,
      publishedAt: json['publishedAt'] as String,
    );
  }
}
