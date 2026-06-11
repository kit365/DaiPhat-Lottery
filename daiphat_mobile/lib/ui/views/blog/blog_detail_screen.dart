import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../viewmodels/blog_viewmodel.dart';
import 'blog_post.dart';

const _primary = Color(0xFFEE1314);
const _gold = Color(0xFFFFD700);
const _goldLight = Color(0xFFFFF9E6);
const _ink = Color(0xFF17191F);
const _secondary = Color(0xFF505050);
const _surface = Colors.white;
const _pageBg = Color(0xFFFDFAF9);
const _tagBg = Color(0xFFF3F3FC);

class BlogDetailScreen extends ConsumerWidget {
  const BlogDetailScreen({
    super.key,
    required this.slug,
  });

  final String slug;

  void _openPost(BuildContext context, WidgetRef ref, BlogPost item) {
    if (item.slug == null || item.slug!.isEmpty) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => BlogDetailScreen(slug: item.slug!),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailState = ref.watch(blogDetailProvider(slug));

    return Scaffold(
      backgroundColor: _pageBg,
      body: SafeArea(
        child: detailState.when(
          data: (data) => CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _buildAppBar(context)),
              SliverToBoxAdapter(child: _buildHeroImage(data.post)),
              SliverToBoxAdapter(child: _buildArticleHeader(data.post)),
              SliverToBoxAdapter(child: _buildBody(data.post)),
              if (data.post.tags.isNotEmpty)
                SliverToBoxAdapter(child: _buildTags(data.post)),
              SliverToBoxAdapter(
                child: _buildRelatedSection(context, ref, data.post, data.related),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
            ],
          ),
          loading: () => Column(
            children: [
              _buildAppBar(context),
              const Expanded(
                child: Center(
                  child: CircularProgressIndicator(color: _primary),
                ),
              ),
            ],
          ),
          error: (error, _) => Column(
            children: [
              _buildAppBar(context),
              Expanded(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Không thể tải bài viết',
                          style: GoogleFonts.barlow(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: _ink,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          error.toString(),
                          textAlign: TextAlign.center,
                          style: GoogleFonts.publicSans(
                            fontSize: 14,
                            color: _secondary,
                          ),
                        ),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: () => ref.invalidate(blogDetailProvider(slug)),
                          style: FilledButton.styleFrom(backgroundColor: _primary),
                          child: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
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

  Widget _buildHeroImage(BlogPost post) {
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

  Widget _buildArticleHeader(BlogPost post) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (post.category.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: _goldLight,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                post.category,
                style: GoogleFonts.publicSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: _primary,
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
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
                        if (post.viewCount > 0) ...[
                          const SizedBox(width: 12),
                          const Icon(
                            Icons.visibility_outlined,
                            size: 14,
                            color: _secondary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${post.viewCount}',
                            style: GoogleFonts.publicSans(
                              fontSize: 13,
                              color: _secondary,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (post.excerpt.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              post.excerpt,
              style: GoogleFonts.publicSans(
                fontSize: 15,
                fontWeight: FontWeight.w400,
                color: _secondary,
                height: 1.6,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBody(BlogPost post) {
    if (post.htmlContent.trim().isNotEmpty) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
        child: Html(
          data: post.htmlContent,
          style: {
            'body': Style(
              margin: Margins.zero,
              padding: HtmlPaddings.zero,
              fontSize: FontSize(16),
              lineHeight: const LineHeight(1.6),
              color: _ink,
              fontFamily: GoogleFonts.publicSans().fontFamily,
            ),
            'p': Style(margin: Margins.only(bottom: 16)),
            'h1': Style(
              fontFamily: GoogleFonts.barlow().fontFamily,
              fontSize: FontSize(26),
              fontWeight: FontWeight.w700,
              color: _ink,
            ),
            'h2': Style(
              fontFamily: GoogleFonts.barlow().fontFamily,
              fontSize: FontSize(22),
              fontWeight: FontWeight.w700,
              color: _ink,
            ),
            'h3': Style(
              fontFamily: GoogleFonts.barlow().fontFamily,
              fontSize: FontSize(18),
              fontWeight: FontWeight.w700,
              color: _ink,
            ),
            'ul': Style(margin: Margins.only(bottom: 16, left: 8)),
            'ol': Style(margin: Margins.only(bottom: 16, left: 8)),
            'li': Style(margin: Margins.only(bottom: 8)),
            'a': Style(
              color: _primary,
              textDecoration: TextDecoration.underline,
            ),
            'strong': Style(fontWeight: FontWeight.w700),
            'img': Style(
              width: Width(double.infinity),
              margin: Margins.only(top: 12, bottom: 12),
            ),
            'blockquote': Style(
              margin: Margins.only(bottom: 16),
              padding: HtmlPaddings.only(left: 12, top: 8, bottom: 8),
              border: Border(left: BorderSide(color: _primary, width: 3)),
              backgroundColor: _goldLight,
            ),
          },
        ),
      );
    }

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

  Widget _buildTags(BlogPost post) {
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

  Widget _buildRelatedSection(
    BuildContext context,
    WidgetRef ref,
    BlogPost post,
    List<BlogPost> related,
  ) {
    final items = related.where((p) => p.slug != post.slug).take(4).toList();
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
          Column(
            children: [
              for (var i = 0; i < items.length; i++) ...[
                if (i > 0) const SizedBox(height: 12),
                _buildRelatedCard(context, ref, items[i]),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRelatedCard(BuildContext context, WidgetRef ref, BlogPost item) {
    return GestureDetector(
      onTap: () => _openPost(context, ref, item),
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
        child: Row(
          children: [
            SizedBox(
              width: 108,
              height: 108,
              child: Image.network(
                item.imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: _goldLight,
                  child: const Icon(Icons.image_outlined, color: _gold),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
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
                    const SizedBox(height: 6),
                    Text(
                      item.date,
                      style: GoogleFonts.publicSans(
                        fontSize: 12,
                        color: _secondary,
                      ),
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
