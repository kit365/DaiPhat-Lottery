class BlogCategory {
  final int id;
  final String name;
  final String slug;
  final String? avatar;
  final int postCount;

  const BlogCategory({
    required this.id,
    required this.name,
    required this.slug,
    this.avatar,
    this.postCount = 0,
  });

  factory BlogCategory.fromJson(Map<String, dynamic> json) {
    return BlogCategory(
      id: json['id'] as int,
      name: json['name'] as String,
      slug: json['slug'] as String,
      avatar: json['avatar'] as String?,
      postCount: json['postCount'] as int? ?? 0,
    );
  }
}
