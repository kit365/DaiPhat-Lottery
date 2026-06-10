import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/api_providers.dart';
import '../../data/models/blog_category.dart';
import '../../data/repositories/blog_repository.dart';
import '../../data/services/blog_api_service.dart';
import '../views/blog/blog_post.dart';

final blogApiServiceProvider = Provider<BlogApiService>((ref) {
  return BlogApiService(ref.watch(apiClientProvider));
});

final blogRepositoryProvider = Provider<BlogRepository>((ref) {
  return BlogRepository(ref.watch(blogApiServiceProvider));
});

final blogViewModelProvider =
    AsyncNotifierProvider<BlogViewModel, BlogListState>(BlogViewModel.new);

final blogDetailProvider = FutureProvider.autoDispose
    .family<BlogDetailResult, String>((ref, slug) async {
  final repository = ref.read(blogRepositoryProvider);
  final result = await repository.fetchBlogDetail(slug);

  if (result.post.id != null) {
    unawaited(repository.incrementPostView(result.post.id!));
  }

  return result;
});

class BlogListState {
  final List<BlogCategory> categories;
  final int selectedCategoryIndex;
  final String searchQuery;
  final BlogPost? featured;
  final List<BlogPost> popular;
  final List<BlogPost> recent;

  const BlogListState({
    required this.categories,
    this.selectedCategoryIndex = 0,
    this.searchQuery = '',
    this.featured,
    required this.popular,
    required this.recent,
  });

  BlogListState copyWith({
    List<BlogCategory>? categories,
    int? selectedCategoryIndex,
    String? searchQuery,
    BlogPost? featured,
    List<BlogPost>? popular,
    List<BlogPost>? recent,
  }) {
    return BlogListState(
      categories: categories ?? this.categories,
      selectedCategoryIndex: selectedCategoryIndex ?? this.selectedCategoryIndex,
      searchQuery: searchQuery ?? this.searchQuery,
      featured: featured ?? this.featured,
      popular: popular ?? this.popular,
      recent: recent ?? this.recent,
    );
  }
}

class BlogViewModel extends AsyncNotifier<BlogListState> {
  @override
  FutureOr<BlogListState> build() async {
    return _load();
  }

  BlogRepository get _repository => ref.read(blogRepositoryProvider);

  Future<BlogListState> _load({
    int selectedCategoryIndex = 0,
    String searchQuery = '',
    List<BlogCategory>? knownCategories,
  }) async {
    final result = await _repository.fetchBlogList(
      q: searchQuery.isEmpty ? null : searchQuery,
      categoryId: _resolveCategoryId(knownCategories, selectedCategoryIndex),
    );

    return BlogListState(
      categories: result.categories,
      selectedCategoryIndex: selectedCategoryIndex,
      searchQuery: searchQuery,
      featured: result.featured,
      popular: result.popular,
      recent: result.recent,
    );
  }

  int? _resolveCategoryId(List<BlogCategory>? categories, int index) {
    if (index <= 0 || categories == null || index >= categories.length) {
      return null;
    }
    final categoryId = categories[index].id;
    return categoryId == 0 ? null : categoryId;
  }

  Future<void> selectCategory(int index) async {
    final current = state.asData?.value;
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _load(
        selectedCategoryIndex: index,
        searchQuery: current?.searchQuery ?? '',
        knownCategories: current?.categories,
      ),
    );
  }

  Future<void> search(String query) async {
    final current = state.asData?.value;
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _load(
        selectedCategoryIndex: current?.selectedCategoryIndex ?? 0,
        searchQuery: query.trim(),
        knownCategories: current?.categories,
      ),
    );
  }

  Future<void> refresh() async {
    final current = state.asData?.value;
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _load(
        selectedCategoryIndex: current?.selectedCategoryIndex ?? 0,
        searchQuery: current?.searchQuery ?? '',
        knownCategories: current?.categories,
      ),
    );
  }
}
