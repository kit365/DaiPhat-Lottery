import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'blog_data.dart';
import 'blog_post.dart';

const _primary = Color(0xFFEE1314);
const _gold = Color(0xFFFFD700);
const _goldLight = Color(0xFFFFF9E6);
const _ink = Color(0xFF17191F);
const _secondary = Color(0xFF505050);
const _surface = Colors.white;
const _pageBg = Color(0xFFFDFAF9);
const _tagBg = Color(0xFFF3F3FC);

class BlogDetailScreen extends StatelessWidget {
  const BlogDetailScreen({
    super.key,
    required this.post,
    this.related = relatedPosts,
  });

  final BlogPost post;
  final List<BlogPost> related;

  void _openPost(BuildContext context, BlogPost item) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => BlogDetailScreen(post: item),
      ),
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
            SliverToBoxAdapter(child: _buildHeroImage()),
            SliverToBoxAdapter(child: _buildArticleHeader()),
            SliverToBoxAdapter(child: _buildBody()),
            if (post.tags.isNotEmpty) SliverToBoxAdapter(child: _buildTags()),
            SliverToBoxAdapter(child: _buildRelatedSection(context)),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.arrow_back_ios_new, size: 20, color: _ink),
          ),
          Expanded(
            child: Text(
              'Chi tiết bài viết',
              textAlign: TextAlign.center,
              style: GoogleFonts.barlow(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: _ink,
              ),
            ),
          ),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.share_outlined, size: 22, color: _ink),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroImage() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: AspectRatio(
          aspectRatio: 16 / 10,
          child: Image.network(
            post.imageUrl,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              color: _goldLight,
              child: const Icon(Icons.image_outlined, size: 48, color: _gold),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildArticleHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            post.title,
            style: GoogleFonts.barlow(
              fontSize: 22,
              fontWeight: FontWeight.w600,
              color: _ink,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: _goldLight,
                  shape: BoxShape.circle,
                  border: Border.all(color: _primary.withValues(alpha: 0.2)),
                ),
                child: const Icon(Icons.person, size: 22, color: _primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post.author,
                      style: GoogleFonts.publicSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: _ink,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(
                          Icons.calendar_today_outlined,
                          size: 13,
                          color: _secondary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          post.date,
                          style: GoogleFonts.publicSans(
                            fontSize: 13,
                            color: _secondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < post.bodyParagraphs.length; i++) ...[
            if (i > 0) const SizedBox(height: 16),
            Text(
              post.bodyParagraphs[i],
              style: GoogleFonts.publicSans(
                fontSize: 16,
                fontWeight: FontWeight.w400,
                color: _ink,
                height: 1.5,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTags() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: post.tags.map(_buildTagChip).toList(),
      ),
    );
  }

  Widget _buildTagChip(String tag) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: _tagBg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        tag,
        style: GoogleFonts.publicSans(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: _secondary,
        ),
      ),
    );
  }

  Widget _buildRelatedSection(BuildContext context) {
    final items = related.where((p) => p.title != post.title).take(2).toList();
    if (items.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Bài viết liên quan',
            style: GoogleFonts.barlow(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: _ink,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              for (var i = 0; i < items.length; i++) ...[
                if (i > 0) const SizedBox(width: 12),
                Expanded(child: _buildRelatedCard(context, items[i])),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRelatedCard(BuildContext context, BlogPost item) {
    return GestureDetector(
      onTap: () => _openPost(context, item),
      child: Container(
        decoration: BoxDecoration(
          color: _surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: _primary.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 4 / 3,
              child: Image.network(
                item.imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: _goldLight,
                  child: const Icon(Icons.image_outlined, color: _gold),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                item.title,
                style: GoogleFonts.barlow(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: _ink,
                  height: 1.3,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
