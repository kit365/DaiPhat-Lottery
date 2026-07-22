import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shimmer/shimmer.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import '../models/blog_post.dart';
import '../viewmodels/blog_viewmodel.dart';
import 'blog_detail_screen.dart';

const _primary = Color(0xFFEE1314);
const _gold = Color(0xFFFFD700);
const _goldLight = Color(0xFFFFF9E6);
const _ink = Color(0xFF17191F);
const _secondary = Color(0xFF6B5A57);
const _surface = Colors.white;
const _pageBg = Color(0xFFF7F7FB);
const _cardBorder = Color(0xFFE6E6EC);

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
              elevation: 6,
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
        const SliverToBoxAdapter(child: SizedBox(height: 18)),
        SliverToBoxAdapter(
          child: _buildCategoryChips(
            categories: categories,
            selectedIndex: data.selectedCategoryIndex,
            onSelected: onCategorySelected,
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 26)),
        if (featured != null || popular.isNotEmpty) ...[
          const SliverToBoxAdapter(child: _SectionHeader(title: 'Noi bat')),
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
        const SliverToBoxAdapter(child: _SectionHeader(title: 'Bai viet moi')),
        const SliverToBoxAdapter(child: SizedBox(height: 14)),
        if (recent.isEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Text(
                  'Khong tim thay bai viet nao.',
                  style: GoogleFonts.inter(color: _secondary),
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

Widget _buildAppBar(VoidCallback? onBack) {
  return Container(
    color: _surface,
    padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
    child: Row(
      children: [
        SizedBox(
          width: 40,
          height: 40,
          child: IconButton(
            onPressed: onBack,
            splashRadius: 20,
            padding: EdgeInsets.zero,
            icon: const Icon(
              Icons.arrow_back_rounded,
              size: 28,
              color: AppColors.primaryDark,
            ),
          ),
        ),
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Dai Phat Lottery',
                style: GoogleFonts.inter(
                  fontSize: 21,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryDark,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'XO SO - MAY MAN - THINH VUONG',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 9,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.9,
                  color: const Color(0xFF5B403D),
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          width: 40,
          height: 40,
          child: IconButton(
            onPressed: () {},
            splashRadius: 20,
            padding: EdgeInsets.zero,
            icon: const Icon(
              Icons.search_rounded,
              size: 30,
              color: AppColors.primaryDark,
            ),
          ),
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
        style: GoogleFonts.inter(fontSize: 14, color: _ink),
        decoration: InputDecoration(
          hintText: 'Tim kiem noi dung...',
          hintStyle: GoogleFonts.inter(
            fontSize: 14,
            color: _secondary.withValues(alpha: 0.75),
          ),
          prefixIcon: const Icon(Icons.search_rounded, color: _secondary, size: 30),
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
            margin: EdgeInsets.only(right: i < categories.length - 1 ? 12 : 0),
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
            decoration: BoxDecoration(
              color: selected ? _primary : _surface,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                color: selected ? _primary : const Color(0xFFD8DAE2),
              ),
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color: _primary.withValues(alpha: 0.25),
                        blurRadius: 14,
                        offset: const Offset(0, 5),
                      ),
                    ]
                  : [],
            ),
            child: Text(
              categories[i],
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: selected ? Colors.white : _ink,
              ),
            ),
          ),
        );
      }),
    ),
  );
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

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
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: _ink,
                ),
              ),
            ],
          ),
          Text(
            'Xem tat ca',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: _primary,
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
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    height: 1.35,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (post.excerpt.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    post.excerpt,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: Colors.white.withValues(alpha: 0.84),
                      height: 1.45,
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
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        (post.author.isEmpty ? 'Dai Phat' : post.author).toUpperCase(),
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          letterSpacing: 0.3,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      post.authorDate.isNotEmpty ? post.authorDate : post.date,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Colors.white.withValues(alpha: 0.78),
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
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      post.title,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: _ink,
                        height: 1.3,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      post.excerpt,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: _secondary,
                        height: 1.45,
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
                          style: GoogleFonts.inter(
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
                height: 56,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                ),
              ),
            ),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
        SliverToBoxAdapter(
          child: SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: 4,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (_, _) => Shimmer.fromColors(
                baseColor: Colors.grey[300]!,
                highlightColor: Colors.grey[100]!,
                child: Container(
                  width: 118,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
            ),
          ),
        ),
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
                  color: Colors.white,
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
                    color: Colors.white,
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
              'Khong the tai danh sach blog',
              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: _secondary),
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
