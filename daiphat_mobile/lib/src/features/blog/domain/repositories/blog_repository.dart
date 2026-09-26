import '../entities/blog_category.dart';
import '../entities/blog_post.dart';

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

abstract class BlogRepository {
  Future<BlogListResult> fetchBlogList({
    String? q,
    int? categoryId,
  });

  Future<BlogDetailResult> fetchBlogDetail(String slug);

  Future<void> incrementPostView(int id);
}
