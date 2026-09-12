import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/blog_category.dart';
import '../../domain/entities/blog_post.dart';
import '../../domain/repositories/blog_repository.dart';
import '../../domain/usecases/blog_usecases.dart';

final blogRepositoryProvider = Provider<BlogRepository>((ref) {
  throw UnimplementedError(
    'blogRepositoryProvider must be overridden in bootstrap',
  );
});

final fetchBlogListProvider = Provider<FetchBlogList>((ref) {
  return FetchBlogList(ref.watch(blogRepositoryProvider));
});

final fetchBlogDetailProvider = Provider<FetchBlogDetail>((ref) {
  return FetchBlogDetail(ref.watch(blogRepositoryProvider));
});

final incrementBlogPostViewProvider = Provider<IncrementBlogPostView>((ref) {
  return IncrementBlogPostView(ref.watch(blogRepositoryProvider));
});

final blogViewModelProvider =
    AsyncNotifierProvider<BlogViewModel, BlogListState>(BlogViewModel.new);

final blogDetailProvider = FutureProvider.autoDispose
    .family<BlogDetailResult, String>((ref, slug) async {
  final result = await ref.read(fetchBlogDetailProvider)(slug);

  if (result.post.id != null) {
    unawaited(ref.read(incrementBlogPostViewProvider)(result.post.id!));
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

  Future<BlogListState> _load({
    int selectedCategoryIndex = 0,
    String searchQuery = '',
    List<BlogCategory>? knownCategories,
  }) async {
    final result = await ref.read(fetchBlogListProvider)(
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
    if (index <= 0 || categories == null) {
      return null;
    }
    final categoryIndex = index - 1;
    if (categoryIndex >= categories.length) {
      return null;
    }
    final categoryId = categories[categoryIndex].id;
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

  Future<void> resetFilters() async {
    final current = state.asData?.value;
    if ((current?.selectedCategoryIndex ?? 0) == 0 &&
        (current?.searchQuery ?? '').isEmpty) {
      return;
    }

    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _load(
        selectedCategoryIndex: 0,
        searchQuery: '',
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

