import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shimmer/shimmer.dart';

import '../../../core/theme/app_colors.dart';
import '../../viewmodels/blog_viewmodel.dart';
import 'blog_detail_screen.dart';
import 'blog_post.dart';

// ── Design tokens (from DESIGN.md) ─────────────────────────
const _primary = Color(0xFFEE1314);
const _gold = Color(0xFFFFD700);
const _goldLight = Color(0xFFFFF9E6);
const _ink = Color(0xFF17191F);
const _secondary = Color(0xFF505050);
const _surface = Colors.white;
const _pageBg = Color(0xFFFDFAF9);
const _cardBorder = Color(0xFFE9BCB6);

class BlogScreen extends ConsumerStatefulWidget {
  const BlogScreen({super.key, this.onBack});

  final VoidCallback? onBack;

  @override
  ConsumerState<BlogScreen> createState() => _BlogScreenState();
}

class _BlogScreenState extends ConsumerState<BlogScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openDetail(BlogPost post) {
    final slug = post.slug;
    if (slug == null || slug.isEmpty) return;

    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => BlogDetailScreen(slug: slug)),
    );
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
              searchController: _searchController,
              onSearch: (q) => ref.read(blogViewModelProvider.notifier).search(q),
              onCategorySelected: (i) =>
                  ref.read(blogViewModelProvider.notifier).selectCategory(i),
              onOpenDetail: _openDetail,
            ),
          ),
          loading: () => _BlogSkeleton(onBack: widget.onBack),
          error: (e, _) => _BlogError(
            message: e.toString(),
            onRetry: () => ref.invalidate(blogViewModelProvider),
          ),
        ),
      ),
      floatingActionButton: blogState.hasValue
          ? FloatingActionButton(
              onPressed: () {},
              backgroundColor: _primary,
              foregroundColor: Colors.white,
              elevation: 4,
              child: const Icon(Icons.edit_rounded),
            )
          : null,
    );
  }
}

class _BlogContent extends StatelessWidget {
  const _BlogContent({
    required this.data,
    required this.onBack,
    required this.searchController,
    required this.onSearch,
    required this.onCategorySelected,
    required this.onOpenDetail,
  });

  final BlogListState data;
  final VoidCallback? onBack;
  final TextEditingController searchController;
  final void Function(String) onSearch;
  final void Function(int) onCategorySelected;
  final void Function(BlogPost) onOpenDetail;

  @override
  Widget build(BuildContext context) {
    final featured = data.featured;
    final popular = data.popular;
    final recent = data.recent;
    final categories = data.categories.map((c) => c.name).toList();

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverToBoxAdapter(child: _buildAppBar(onBack)),
        SliverToBoxAdapter(
          child: _buildSearchBar(
            controller: searchController,
            onSubmitted: onSearch,
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 16)),
        SliverToBoxAdapter(
          child: _buildCategoryChips(
            categories: categories,
            selectedIndex: data.selectedCategoryIndex,
            onSelected: onCategorySelected,
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
        if (featured != null || popular.isNotEmpty) ...[
          SliverToBoxAdapter(child: _buildSectionHeader('Nổi bật')),
          const SliverToBoxAdapter(child: SizedBox(height: 12)),
          SliverToBoxAdapter(
            child: _buildPopularSection(
              featured: featured,
              popular: popular,
              onOpenDetail: onOpenDetail,
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
        SliverToBoxAdapter(child: _buildSectionHeader('Bài viết mới')),
        const SliverToBoxAdapter(child: SizedBox(height: 12)),
        if (recent.isEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Text(
                  'Không tìm thấy bài viết nào.',
                  style: GoogleFonts.publicSans(color: _secondary),
                ),
              ),
            ),
          )
        else
          SliverList.separated(
            itemCount: recent.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _buildRecentCard(recent[i], onOpenDetail),
          ),
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }
}

Widget _buildAppBar(VoidCallback? onBack) {
  return Padding(
    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
    child: Row(
      children: [
        GestureDetector(
          onTap: onBack,
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _surface,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const Icon(Icons.arrow_back_ios_new, size: 18, color: _ink),
          ),
        ),
        const SizedBox(width: 8),
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: ClipOval(
            child: Image.asset(
              'assets/images/login_logo.jpg',
              fit: BoxFit.cover,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'ĐẠI PHÁT',
              style: GoogleFonts.barlow(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: AppColors.primaryDark,
                height: 1.1,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              'XỔ SỐ - MAY MẮN - THỊNH VƯỢNG',
              style: GoogleFonts.publicSans(
                fontSize: 9,
                fontWeight: FontWeight.w800,
                color: AppColors.goldDark,
              ),
            ),
          ],
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
      height: 48,
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        textInputAction: TextInputAction.search,
        onSubmitted: onSubmitted,
        style: GoogleFonts.publicSans(fontSize: 14, color: _ink),
        decoration: InputDecoration(
          hintText: 'Tìm kiếm nội dung...',
          hintStyle: GoogleFonts.publicSans(
            fontSize: 14,
            color: _secondary.withValues(alpha: 0.6),
          ),
          prefixIcon: const Icon(Icons.search, color: _secondary, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 14),
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
  return SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    padding: const EdgeInsets.symmetric(horizontal: 16),
    child: Row(
      children: List.generate(categories.length, (i) {
        final selected = i == selectedIndex;
        return GestureDetector(
          onTap: () => onSelected(i),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            margin: EdgeInsets.only(right: i < categories.length - 1 ? 10 : 0),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
            decoration: BoxDecoration(
              color: selected ? _primary : _surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: selected ? _primary : const Color(0xFFE5E7EB),
              ),
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color: _primary.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      )
                    ]
                  : [],
            ),
            child: Text(
              categories[i],
              style: GoogleFonts.publicSans(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : _secondary,
              ),
            ),
          ),
        );
      }),
    ),
  );
}

Widget _buildSectionHeader(String title) {
  return Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: GoogleFonts.barlow(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: _ink,
          ),
        ),
        Text(
          'Xem tất cả',
          style: GoogleFonts.publicSans(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: _primary,
          ),
        ),
      ],
    ),
  );
}

Widget _buildPopularSection({
  required BlogPost? featured,
  required List<BlogPost> popular,
  required void Function(BlogPost) onOpenDetail,
}) {
  final items = <BlogPost>[
    if (featured != null) featured,
    ...popular,
  ];

  if (items.isEmpty) return const SizedBox.shrink();

  return SizedBox(
    height: 320,
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
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: _primary.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Image.network(
              post.imageUrl,
              fit: BoxFit.cover,
              width: double.infinity,
              errorBuilder: (_, __, ___) => Container(
                color: _goldLight,
                child: const Icon(Icons.image_outlined, size: 48, color: _gold),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  post.title,
                  style: GoogleFonts.barlow(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: _ink,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  post.excerpt,
                  style: GoogleFonts.publicSans(
                    fontSize: 13,
                    color: _secondary,
                    height: 1.4,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: _goldLight,
                        shape: BoxShape.circle,
                        border: Border.all(color: _primary.withValues(alpha: 0.2)),
                      ),
                      child: const Icon(Icons.person, size: 18, color: _primary),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            post.author,
                            style: GoogleFonts.publicSans(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: _ink,
                            ),
                          ),
                          Text(
                            post.authorDate,
                            style: GoogleFonts.publicSans(
                              fontSize: 11,
                              color: _secondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (post.viewCount > 0) ...[
                      const Icon(Icons.visibility_outlined, size: 14, color: _secondary),
                      const SizedBox(width: 4),
                      Text(
                        '${post.viewCount}',
                        style: GoogleFonts.publicSans(fontSize: 11, color: _secondary),
                      ),
                    ],
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
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _cardBorder.withValues(alpha: 0.4)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                bottomLeft: Radius.circular(16),
              ),
              child: Image.network(
                post.imageUrl,
                width: 96,
                height: 96,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  width: 96,
                  height: 96,
                  color: _goldLight,
                  child: const Icon(Icons.image_outlined, color: _gold),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post.title,
                      style: GoogleFonts.barlow(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: _ink,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      post.excerpt,
                      style: GoogleFonts.publicSans(
                        fontSize: 12,
                        color: _secondary,
                        height: 1.35,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(
                          Icons.calendar_today_outlined,
                          size: 12,
                          color: _secondary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          post.date,
                          style: GoogleFonts.publicSans(
                            fontSize: 12,
                            color: _secondary,
                            fontWeight: FontWeight.w500,
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
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Shimmer.fromColors(
              baseColor: Colors.grey[300]!,
              highlightColor: Colors.grey[100]!,
              child: Container(
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
        SliverToBoxAdapter(
          child: SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: 4,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (_, __) => Shimmer.fromColors(
                baseColor: Colors.grey[300]!,
                highlightColor: Colors.grey[100]!,
                child: Container(
                  width: 100,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
              ),
            ),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ...List.generate(4, (i) {
          return SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Shimmer.fromColors(
                baseColor: Colors.grey[300]!,
                highlightColor: Colors.grey[100]!,
                child: Container(
                  height: i == 0 ? 200 : 96,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
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
              style: GoogleFonts.barlow(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.publicSans(color: _secondary),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: onRetry,
              style: FilledButton.styleFrom(backgroundColor: _primary),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }
}
