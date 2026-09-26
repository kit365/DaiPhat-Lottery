import '../repositories/blog_repository.dart';

class FetchBlogList {
  final BlogRepository _repository;
  const FetchBlogList(this._repository);

  Future<BlogListResult> call({String? q, int? categoryId}) =>
      _repository.fetchBlogList(q: q, categoryId: categoryId);
}

class FetchBlogDetail {
  final BlogRepository _repository;
  const FetchBlogDetail(this._repository);

  Future<BlogDetailResult> call(String slug) =>
      _repository.fetchBlogDetail(slug);
}

class IncrementBlogPostView {
  final BlogRepository _repository;
  const IncrementBlogPostView(this._repository);

  Future<void> call(int id) => _repository.incrementPostView(id);
}
