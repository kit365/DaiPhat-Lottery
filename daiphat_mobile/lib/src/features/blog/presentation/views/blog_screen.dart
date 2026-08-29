import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_filter_tab_strip.dart';
import '../models/blog_post.dart';
import '../viewmodels/blog_viewmodel.dart';
import 'blog_detail_screen.dart';

const _primary = AppColors.brandPrimaryStrong;
const _gold = Color(0xFFFFD700);
const _goldLight = Color(0xFFFFF9E6);
const _ink = Color(0xFF17191F);
const _secondary = Color(0xFF6B5A57);
// const _surface = AppColors.surfacePrimary;// ban dau
const _surface = AppColors.surfacePrimary;

// const _pageBg = Color(0xFFF7F7FB); // ban dau
const _pageBg = AppColors.surfacePrimary;

const _cardBorder = Color(0xFFE6E6EC);

class BlogScreen extends ConsumerStatefulWidget {
  const BlogScreen({super.key, this.onBack});

  final VoidCallback? onBack;

  @override
  ConsumerState<BlogScreen> createState() => _BlogScreenState();
}

class _BlogScreenState extends ConsumerState<BlogScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      ref.read(blogViewModelProvider.notifier).resetFilters();
    });
  }

  void _openDetail(BlogPost post) {
    final slug = post.slug;
    if (slug == null || slug.isEmpty) return;

    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => BlogDetailScreen(slug: slug)));
  }

  Future<void> _openAllPosts() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const _BlogAllScreen()));
    if (!mounted) return;
    await ref.read(blogViewModelProvider.notifier).resetFilters();
  }

  @override
  Widget build(BuildContext context) {
    final blogState = ref.watch(blogViewModelProvider);

    return Scaffold(
      backgroundColor: _pageBg,
      body: SafeArea(
        child: blogState.when(
          data: (data) => RefreshIndicator(
            color: _primary,
            onRefresh: () => ref.read(blogViewModelProvider.notifier).refresh(),
            child: _BlogContent(
              data: data,
              onBack: widget.onBack,
              onOpenDetail: _openDetail,
              onOpenAll: _openAllPosts,
            ),
          ),
          loading: () => _BlogSkeleton(onBack: widget.onBack),
          error: (e, _) => _BlogError(
            message: e.toString(),
            onRetry: () => ref.invalidate(blogViewModelProvider),
          ),
        ),
      ),
    );
  }
}

class _BlogContent extends StatelessWidget {
  const _BlogContent({
    required this.data,
    required this.onBack,
    required this.onOpenDetail,
    required this.onOpenAll,
  });

  final BlogListState data;
  final VoidCallback? onBack;
  final void Function(BlogPost) onOpenDetail;
  final VoidCallback onOpenAll;

  @override
  Widget build(BuildContext context) {
    final featured = data.featured;
    final popular = data.popular;
    final recent = data.recent;
    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverToBoxAdapter(child: _buildAppBar(onBack)),
        const SliverToBoxAdapter(child: SizedBox(height: 12)),
        if (featured != null || popular.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: _SectionHeader(title: 'Nổi bật', onSeeAll: onOpenAll),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 14)),
          SliverToBoxAdapter(
            child: _buildPopularSection(
              featured: featured,
              popular: popular,
              onOpenDetail: onOpenDetail,
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 28)),
        ],
        SliverToBoxAdapter(
          child: _SectionHeader(title: 'Bài viết mới', onSeeAll: onOpenAll),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 14)),
        if (recent.isEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Text(
                  'Không tìm thấy bài viết nào.',
                  style: AppTypography.main(const TextStyle(color: _secondary)),
                ),
              ),
            ),
          )
        else
          SliverList.separated(
            itemCount: recent.length,
            separatorBuilder: (_, _) => const SizedBox(height: 16),
            itemBuilder: (_, i) => _buildRecentCard(recent[i], onOpenDetail),
          ),
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }
}

class _BlogAllScreen extends ConsumerStatefulWidget {
  const _BlogAllScreen();

  @override
  ConsumerState<_BlogAllScreen> createState() => _BlogAllScreenState();
}

class _BlogAllScreenState extends ConsumerState<_BlogAllScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final current = ref.read(blogViewModelProvider).asData?.value;
    _searchController.text = current?.searchQuery ?? '';
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openDetail(BlogPost post) {
    final slug = post.slug;
    if (slug == null || slug.isEmpty) return;
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => BlogDetailScreen(slug: slug)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final blogState = ref.watch(blogViewModelProvider);

    return Scaffold(
      backgroundColor: _pageBg,
      body: SafeArea(
        child: blogState.when(
          data: (data) {
            final categories = data.categories.map((c) => c.name).toList();
            final posts = <BlogPost>[
              if (data.featured != null) data.featured!,
              ...data.popular,
              ...data.recent,
            ];
            final seen = <String>{};
            final uniquePosts = posts.where((post) {
              final key = post.slug ?? post.title;
              return seen.add(key);
            }).toList();

            return RefreshIndicator(
              color: _primary,
              onRefresh: () =>
                  ref.read(blogViewModelProvider.notifier).refresh(),
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(child: _buildAllPostsAppBar(context)),
                  SliverToBoxAdapter(
                    child: _buildSearchBar(
                      controller: _searchController,
                      onSubmitted: (q) =>
                          ref.read(blogViewModelProvider.notifier).search(q),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 18)),
                  SliverToBoxAdapter(
                    child: _buildCategoryChips(
                      categories: categories,
                      selectedIndex: data.selectedCategoryIndex,
                      onSelected: (i) => ref
                          .read(blogViewModelProvider.notifier)
                          .selectCategory(i),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 22)),
                  if (uniquePosts.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(
                        child: Text(
                          'Không tìm thấy bài viết nào.',
                          style: AppTypography.main(
                            const TextStyle(color: _secondary),
                          ),
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 22),
                      sliver: SliverGrid.builder(
                        itemCount: uniquePosts.length,
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              mainAxisSpacing: 14,
                              crossAxisSpacing: 14,
                              childAspectRatio: 0.66,
                            ),
                        itemBuilder: (_, index) => _AllBlogCard(
                          post: uniquePosts[index],
                          onTap: () => _openDetail(uniquePosts[index]),
                        ),
                      ),
                    ),
                ],
              ),
            );
          },
          loading: () =>
              const Center(child: CircularProgressIndicator(color: _primary)),
          error: (e, _) => _BlogError(
            message: e.toString(),
            onRetry: () => ref.invalidate(blogViewModelProvider),
          ),
        ),
      ),
    );
  }
}

Widget _buildAllPostsAppBar(BuildContext context) {
  return Padding(
    padding: const EdgeInsets.fromLTRB(16, 10, 16, 18),
    child: Row(
      children: [
        _CircleIconButton(
          icon: Icons.arrow_back_ios_new_rounded,
          onTap: () => Navigator.of(context).pop(),
        ),
        Expanded(
          child: Text(
            'Tin tức',
            textAlign: TextAlign.center,
            style: AppTypography.display(
              const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: _primary,
              ),
            ),
          ),
        ),
        _CircleIconButton(icon: Icons.search_rounded, onTap: () {}),
      ],
    ),
  );
}

class _CircleIconButton extends StatelessWidget {
  const _CircleIconButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfacePrimary,
      shape: const CircleBorder(),
      elevation: 4,
      shadowColor: Colors.black.withValues(alpha: 0.16),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 52,
          height: 52,
          child: Icon(icon, color: _primary, size: 25),
        ),
      ),
    );
  }
}

class _AllBlogCard extends StatelessWidget {
  const _AllBlogCard({required this.post, required this.onTap});

  final BlogPost post;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfacePrimary,
      borderRadius: BorderRadius.circular(18),
      elevation: 2.5,
      shadowColor: Colors.black.withValues(alpha: 0.12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 118,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    post.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(
                      color: _goldLight,
                      child: const Icon(Icons.image_outlined, color: _gold),
                    ),
                  ),
                  Positioned(
                    left: 8,
                    top: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: _primary,
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.16),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Text(
                        post.category.isNotEmpty ? post.category : 'Tin tức',
                        style: AppTypography.main(
                          const TextStyle(
                            color: AppColors.surfacePrimary,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.display(
                        const TextStyle(
                          fontSize: 14,
                          height: 1.25,
                          fontWeight: FontWeight.w800,
                          color: _ink,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      post.excerpt,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.main(
                        const TextStyle(
                          fontSize: 12,
                          height: 1.45,
                          color: _secondary,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        const Icon(
                          Icons.calendar_today_outlined,
                          size: 13,
                          color: _secondary,
                        ),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            post.date,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.main(
                              const TextStyle(
                                fontSize: 11,
                                color: _secondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        Text(
                          'Đọc tiếp',
                          style: AppTypography.main(
                            const TextStyle(
                              fontSize: 11,
                              color: _primary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 3),
                        const Icon(
                          Icons.chevron_right_rounded,
                          size: 16,
                          color: _primary,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Widget _buildAppBar(VoidCallback? onBack) {
  return Container(
    color: _surface,
    padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
    child: Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppColors.surfacePrimary,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.10),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: IconButton(
            onPressed: onBack,
            splashRadius: 22,
            padding: EdgeInsets.zero,
            icon: const Icon(
              Icons.arrow_back_ios_new_rounded,
              size: 20,
              color: _primary,
            ),
          ),
        ),
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Dai Phat Lottery',
                style: AppTypography.display(
                  const TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryDark,
                    height: 1.1,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'XỔ SỐ - MAY MẮN - THỊNH VƯỢNG',
                textAlign: TextAlign.center,
                style: AppTypography.main(
                  const TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.9,
                    color: Color.fromARGB(255, 87, 91, 61),
                  ),
                ),
              ),
            ],
          ),
        ),
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppColors.surfacePrimary,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0xFFE8E8EE)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.10),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Image.asset('assets/images/login_logo.jpg', fit: BoxFit.cover),
        ),
      ],
    ),
  );
}

Widget _buildSearchBar({
  required TextEditingController controller,
  required void Function(String) onSubmitted,
}) {
  return Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16),
    child: Container(
      height: 56,
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD9DAE2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        textInputAction: TextInputAction.search,
        onSubmitted: onSubmitted,
        style: AppTypography.main(const TextStyle(fontSize: 14, color: _ink)),
        decoration: InputDecoration(
          hintText: 'Tìm kiếm ...',
          hintStyle: AppTypography.main(
            TextStyle(fontSize: 14, color: _secondary.withValues(alpha: 0.75)),
          ),
          prefixIcon: const Icon(
            Icons.search_rounded,
            color: _secondary,
            size: 30,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 15),
        ),
      ),
    ),
  );
}

Widget _buildCategoryChips({
  required List<String> categories,
  required int selectedIndex,
  required void Function(int) onSelected,
}) {
  final items = List.generate(categories.length, (i) {
    return AppFilterTabItem<int>(value: i + 1, label: categories[i]);
  });

  return AppFilterTabStrip<int>(
    items: [
      const AppFilterTabItem<int>(value: 0, label: 'Tất cả'),
      ...items,
    ],
    selectedValue: selectedIndex,
    onSelected: onSelected,
    height: 44,
  );
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.onSeeAll});

  final String title;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 4,
                height: 32,
                decoration: BoxDecoration(
                  color: _primary,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: AppTypography.display(
                  const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: _ink,
                  ),
                ),
              ),
            ],
          ),
          InkWell(
            onTap: onSeeAll,
            borderRadius: BorderRadius.circular(999),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              child: Text(
                'Xem tất cả',
                style: AppTypography.main(
                  const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: _primary,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

Widget _buildPopularSection({
  required BlogPost? featured,
  required List<BlogPost> popular,
  required void Function(BlogPost) onOpenDetail,
}) {
  final items = <BlogPost?>[
    featured,
    ...popular,
  ].whereType<BlogPost>().toList();

  if (items.isEmpty) return const SizedBox.shrink();

  return SizedBox(
    height: 382,
    child: PageView.builder(
      padEnds: false,
      controller: PageController(viewportFraction: 0.88),
      itemCount: items.length,
      itemBuilder: (_, i) => _buildFeaturedCard(items[i], onOpenDetail),
    ),
  );
}

Widget _buildFeaturedCard(BlogPost post, void Function(BlogPost) onOpenDetail) {
  return GestureDetector(
    onTap: () => onOpenDetail(post),
    child: Container(
      margin: const EdgeInsets.only(left: 16, right: 8),
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(
            child: Image.network(
              post.imageUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Container(
                color: _goldLight,
                child: const Icon(Icons.image_outlined, size: 48, color: _gold),
              ),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.05),
                    Colors.black.withValues(alpha: 0.18),
                    Colors.black.withValues(alpha: 0.74),
                  ],
                  stops: const [0.25, 0.55, 1],
                ),
              ),
            ),
          ),
          Positioned(
            left: 20,
            right: 20,
            bottom: 18,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  post.title,
                  style: AppTypography.display(
                    const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.surfacePrimary,
                      height: 1.35,
                    ),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (post.excerpt.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    post.excerpt,
                    style: AppTypography.main(
                      TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: AppColors.surfacePrimary.withValues(alpha: 0.84),
                        height: 1.45,
                      ),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: const BoxDecoration(
                        color: _primary,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'DP',
                        style: AppTypography.display(
                          const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: AppColors.surfacePrimary,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        (post.author.isEmpty ? 'Dai Phat' : post.author)
                            .toUpperCase(),
                        style: AppTypography.main(
                          const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.surfacePrimary,
                            letterSpacing: 0.3,
                          ),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      post.authorDate.isNotEmpty ? post.authorDate : post.date,
                      style: AppTypography.main(
                        TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: AppColors.surfacePrimary.withValues(
                            alpha: 0.78,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

Widget _buildRecentCard(BlogPost post, void Function(BlogPost) onOpenDetail) {
  return Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16),
    child: GestureDetector(
      onTap: () => onOpenDetail(post),
      child: Container(
        decoration: BoxDecoration(
          color: _surface,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: _cardBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 14,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(22),
                bottomLeft: Radius.circular(22),
              ),
              child: Image.network(
                post.imageUrl,
                width: 120,
                height: 120,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(
                  width: 120,
                  height: 120,
                  color: _goldLight,
                  child: const Icon(Icons.image_outlined, color: _gold),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      post.title,
                      style: AppTypography.display(
                        const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: _ink,
                          height: 1.3,
                        ),
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      post.excerpt,
                      style: AppTypography.main(
                        const TextStyle(
                          fontSize: 13,
                          color: _secondary,
                          height: 1.45,
                        ),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const Icon(
                          Icons.calendar_today_outlined,
                          size: 14,
                          color: _secondary,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          post.date,
                          style: AppTypography.main(
                            const TextStyle(
                              fontSize: 12,
                              color: _secondary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _BlogSkeleton extends StatelessWidget {
  const _BlogSkeleton({this.onBack});

  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(child: _buildAppBar(onBack)),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Shimmer.fromColors(
              baseColor: Colors.grey[300]!,
              highlightColor: Colors.grey[100]!,
              child: Container(
                height: 360,
                decoration: BoxDecoration(
                  color: AppColors.surfacePrimary,
                  borderRadius: BorderRadius.circular(26),
                ),
              ),
            ),
          ),
        ),
        ...List.generate(3, (_) {
          return SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Shimmer.fromColors(
                baseColor: Colors.grey[300]!,
                highlightColor: Colors.grey[100]!,
                child: Container(
                  height: 120,
                  decoration: BoxDecoration(
                    color: AppColors.surfacePrimary,
                    borderRadius: BorderRadius.circular(22),
                  ),
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}

class _BlogError extends StatelessWidget {
  const _BlogError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: _primary),
            const SizedBox(height: 16),
            Text(
              'Không thể tải danh sách blog',
              style: AppTypography.display(
                const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: AppTypography.main(const TextStyle(color: _secondary)),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: onRetry,
              style: FilledButton.styleFrom(backgroundColor: _primary),
              child: const Text('Thu lai'),
            ),
          ],
        ),
      ),
    );
  }
}
