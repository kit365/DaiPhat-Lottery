import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/theme/app_colors.dart';
import 'blog_data.dart';
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

// ── Main Widget ──────────────────────────────────────────────
class BlogScreen extends StatefulWidget {
  const BlogScreen({super.key, this.onBack});

  final VoidCallback? onBack;

  @override
  State<BlogScreen> createState() => _BlogScreenState();
}

class _BlogScreenState extends State<BlogScreen> {
  int _categoryIndex = 0;
  final _categories = ['Tất cả bài viết', 'Nổi bật', 'Khuyến mãi', 'Hướng dẫn'];
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openDetail(BlogPost post) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => BlogDetailScreen(post: post)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _pageBg,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _buildAppBar(context)),
            SliverToBoxAdapter(child: _buildSearchBar()),
            const SliverToBoxAdapter(child: SizedBox(height: 16)),
            SliverToBoxAdapter(child: _buildCategoryChips()),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
            SliverToBoxAdapter(child: _buildSectionHeader('Must Popular')),
            const SliverToBoxAdapter(child: SizedBox(height: 12)),
            SliverToBoxAdapter(child: _buildPopularSection()),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
            SliverToBoxAdapter(child: _buildSectionHeader('Recently Added')),
            const SliverToBoxAdapter(child: SizedBox(height: 12)),
            SliverList.separated(
              itemCount: recentPosts.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) => _buildRecentCard(recentPosts[i]),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        backgroundColor: _primary,
        foregroundColor: Colors.white,
        elevation: 4,
        child: const Icon(Icons.edit_rounded),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          GestureDetector(
            onTap: widget.onBack,
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

  Widget _buildSearchBar() {
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
          controller: _searchController,
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

  Widget _buildCategoryChips() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: List.generate(_categories.length, (i) {
          final selected = i == _categoryIndex;
          return GestureDetector(
            onTap: () => setState(() => _categoryIndex = i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: EdgeInsets.only(right: i < _categories.length - 1 ? 10 : 0),
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
                _categories[i],
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
          GestureDetector(
            onTap: () {},
            child: Text(
              'See All',
              style: GoogleFonts.publicSans(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: _primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPopularSection() {
    return SizedBox(
      height: 320,
      child: PageView.builder(
        padEnds: false,
        controller: PageController(viewportFraction: 0.88),
        itemCount: popularPosts.length + 1,
        itemBuilder: (_, i) {
          final post = i == 0 ? featuredPost : popularPosts[i - 1];
          return _buildFeaturedCard(post);
        },
      ),
    );
  }

  Widget _buildFeaturedCard(BlogPost post) {
    return GestureDetector(
      onTap: () => _openDetail(post),
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
                      Column(
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

  Widget _buildRecentCard(BlogPost post) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GestureDetector(
        onTap: () => _openDetail(post),
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
}
