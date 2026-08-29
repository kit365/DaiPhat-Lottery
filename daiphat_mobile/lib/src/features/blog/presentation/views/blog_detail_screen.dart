import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import '../models/blog_post.dart';
import '../viewmodels/blog_viewmodel.dart';

const _primary = Color(0xFFEE1314);
const _gold = Color(0xFFFFD700);
const _goldLight = Color(0xFFFFF9E6);
const _ink = Color(0xFF17191F);
const _secondary = Color(0xFF5D3F3C);
const _surface = AppColors.surfacePrimary;
const _pageBg = Color(0xFFF7F7FB);
const _tagBg = Color(0xFFF9ECEE);
const _divider = Color(0xFFE7BDB8);

class BlogDetailScreen extends ConsumerWidget {
  const BlogDetailScreen({
    super.key,
    required this.slug,
  });

  final String slug;

  void _openPost(BuildContext context, WidgetRef ref, BlogPost item) {
    final nextSlug = item.slug;
    if (nextSlug == null || nextSlug.isEmpty) return;

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => BlogDetailScreen(slug: nextSlug),
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
          data: (data) => RefreshIndicator(
            color: _primary,
            onRefresh: () async {
              ref.invalidate(blogDetailProvider(slug));
              await ref.read(blogDetailProvider(slug).future);
            },
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(
                parent: BouncingScrollPhysics(),
              ),
              slivers: [
                SliverToBoxAdapter(child: _buildAppBar(context)),
                SliverToBoxAdapter(child: _buildArticle(data.post)),
                SliverToBoxAdapter(
                  child: _buildRelatedSection(context, ref, data.post, data.related),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 32)),
              ],
            ),
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
                        const Icon(Icons.cloud_off_rounded, size: 56, color: _primary),
                        const SizedBox(height: 16),
                        Text(
                          'Không thể tải bài viết',
                          style: AppTypography.display(
                            const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: _ink,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          error.toString(),
                          textAlign: TextAlign.center,
                          style: AppTypography.main(
                            const TextStyle(
                              fontSize: 14,
                              color: _secondary,
                              height: 1.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        FilledButton(
                          onPressed: () => ref.invalidate(blogDetailProvider(slug)),
                          style: FilledButton.styleFrom(
                            backgroundColor: _primary,
                            foregroundColor: AppColors.surfacePrimary,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 26,
                              vertical: 14,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: const Text('Thử lại ngay'),
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
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: _surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          SizedBox(
            width: 40,
            height: 40,
            child: IconButton(
              onPressed: () => Navigator.of(context).pop(),
              splashRadius: 20,
              padding: EdgeInsets.zero,
              icon: const Icon(Icons.arrow_back_rounded, size: 28, color: _ink),
            ),
          ),
          Expanded(
            child: Text(
              'Chi tiết bài viết',
              textAlign: TextAlign.center,
              style: AppTypography.display(
                const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: _primary,
                ),
              ),
            ),
          ),
          SizedBox(
            width: 40,
            height: 40,
            child: IconButton(
              onPressed: () {},
              splashRadius: 20,
              padding: EdgeInsets.zero,
              icon: const Icon(Icons.share_outlined, size: 24, color: _ink),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildArticle(BlogPost post) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (post.category.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: _tagBg,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: _divider.withValues(alpha: 0.5)),
              ),
              child: Text(
                post.category,
                style: AppTypography.main(
                  const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: _primary,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
          Text(
            post.title,
            style: AppTypography.display(
              const TextStyle(
                fontSize: 21,
                fontWeight: FontWeight.w700,
                color: _ink,
                height: 1.35,
              ),
            ),
          ),
          const SizedBox(height: 24),
          _buildAuthorRow(post),
          const SizedBox(height: 22),
          _buildHeroImage(post),
          if (post.excerpt.isNotEmpty) ...[
            const SizedBox(height: 28),
            Text(
              post.excerpt,
              style: AppTypography.main(
                const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w400,
                  color: _secondary,
                  height: 1.7,
                ),
              ),
            ),
          ],
          const SizedBox(height: 28),
          _buildBody(post),
          if (post.tags.isNotEmpty) ...[
            const SizedBox(height: 24),
            _buildTags(post),
          ],
          const SizedBox(height: 28),
          const Divider(color: _divider, height: 1),
        ],
      ),
    );
  }

  Widget _buildAuthorRow(BlogPost post) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: _goldLight,
            shape: BoxShape.circle,
            border: Border.all(color: _divider.withValues(alpha: 0.5)),
          ),
          alignment: Alignment.center,
          child: Text(
            'DP',
            style: AppTypography.display(
              const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: _primary,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      post.author.isEmpty ? 'DAI PHAT' : post.author.toUpperCase(),
                      style: AppTypography.main(
                        const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: _ink,
                          letterSpacing: 0.2,
                        ),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(
                    Icons.verified_rounded,
                    size: 16,
                    color: Color(0xFF27AE60),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 6,
                runSpacing: 4,
                children: [
                  _metaText(post.date),
                  _metaDot(),
                  _metaIconText(Icons.visibility_outlined, _formatViews(post.viewCount)),
                  _metaDot(),
                  _metaText(_estimateReadTime(post)),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHeroImage(BlogPost post) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: Image.network(
              post.imageUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Container(
                color: _goldLight,
                child: const Icon(Icons.image_outlined, size: 52, color: _gold),
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'Kỳ quay thưởng trực tiếp tại hội trường Dai Phat',
          textAlign: TextAlign.center,
          style: AppTypography.main(
            const TextStyle(
              fontSize: 14,
              fontStyle: FontStyle.italic,
              color: _secondary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBody(BlogPost post) {
    if (post.htmlContent.trim().isNotEmpty) {
      return Html(
        data: post.htmlContent,
        style: {
          'body': Style(
            margin: Margins.zero,
            padding: HtmlPaddings.zero,
            fontSize: FontSize(16),
            lineHeight: const LineHeight(1.8),
            color: _ink,
            fontFamily: AppTypography.main().fontFamily,
          ),
          'p': Style(
            margin: Margins.only(bottom: 20),
            color: _ink,
            fontSize: FontSize(16),
            lineHeight: const LineHeight(1.8),
            fontFamily: AppTypography.main().fontFamily,
          ),
          'h1': Style(
            fontFamily: AppTypography.display().fontFamily,
            fontSize: FontSize(24),
            fontWeight: FontWeight.w700,
            color: _ink,
            lineHeight: const LineHeight(1.4),
            margin: Margins.only(bottom: 18),
          ),
          'h2': Style(
            fontFamily: AppTypography.display().fontFamily,
            fontSize: FontSize(22),
            fontWeight: FontWeight.w700,
            color: _ink,
            lineHeight: const LineHeight(1.4),
            margin: Margins.only(top: 10, bottom: 18),
          ),
          'h3': Style(
            fontFamily: AppTypography.display().fontFamily,
            fontSize: FontSize(18),
            fontWeight: FontWeight.w700,
            color: _ink,
            lineHeight: const LineHeight(1.4),
            padding: HtmlPaddings.only(left: 12),
            border: Border(left: BorderSide(color: _primary, width: 4)),
            margin: Margins.only(top: 10, bottom: 18),
          ),
          'ul': Style(margin: Margins.only(bottom: 18, left: 10)),
          'ol': Style(margin: Margins.only(bottom: 18, left: 10)),
          'li': Style(
            margin: Margins.only(bottom: 10),
            fontSize: FontSize(16),
            lineHeight: const LineHeight(1.7),
            fontFamily: AppTypography.main().fontFamily,
          ),
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
            margin: Margins.only(top: 18, bottom: 22),
            padding: HtmlPaddings.only(left: 16, top: 18, right: 16, bottom: 18),
            border: Border(left: BorderSide(color: _primary, width: 4)),
            backgroundColor: _tagBg,
            color: _secondary,
            fontStyle: FontStyle.italic,
            lineHeight: const LineHeight(1.8),
            fontFamily: AppTypography.main().fontFamily,
          ),
        },
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < post.bodyParagraphs.length; i++) ...[
          if (i > 0) const SizedBox(height: 20),
          Text(
            post.bodyParagraphs[i],
            style: AppTypography.main(
              const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w400,
                color: _ink,
                height: 1.85,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildTags(BlogPost post) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: post.tags.map(_buildTagChip).toList(),
    );
  }

  Widget _buildTagChip(String tag) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: _tagBg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        tag,
        style: AppTypography.main(
          const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: _secondary,
          ),
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
      padding: const EdgeInsets.fromLTRB(16, 26, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 4,
                height: 30,
                decoration: BoxDecoration(
                  color: _primary,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'BÀI VIẾT LIÊN QUAN',
                  style: AppTypography.display(
                    const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: _ink,
                      letterSpacing: 0.6,
                      height: 1.3,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Column(
            children: [
              for (var i = 0; i < items.length; i++) ...[
                if (i > 0) const SizedBox(height: 16),
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
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: _surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: _divider.withValues(alpha: 0.28)),
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
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                width: 118,
                height: 118,
                child: Image.network(
                  item.imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(
                    color: _goldLight,
                    child: const Icon(Icons.image_outlined, color: _gold),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: SizedBox(
                height: 118,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (item.category.isNotEmpty) ...[
                      Text(
                        item.category.toUpperCase(),
                        style: AppTypography.main(
                          const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: _primary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    Text(
                      item.title,
                      style: AppTypography.display(
                        const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                          color: _ink,
                          height: 1.45,
                        ),
                      ),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      item.authorDate.isNotEmpty ? item.authorDate : item.date,
                      style: AppTypography.main(
                        const TextStyle(
                          fontSize: 13,
                          color: _secondary,
                        ),
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

  Widget _metaText(String text) {
    return Text(
      text,
      style: AppTypography.main(
        const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: _secondary,
        ),
      ),
    );
  }

  Widget _metaIconText(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: _secondary),
        const SizedBox(width: 3),
        _metaText(text),
      ],
    );
  }

  Widget _metaDot() {
    return Container(
      width: 4,
      height: 4,
      decoration: const BoxDecoration(
        color: _divider,
        shape: BoxShape.circle,
      ),
    );
  }

  String _formatViews(int count) {
    if (count >= 1000) {
      final value = count / 1000;
      final text = value.toStringAsFixed(value.truncateToDouble() == value ? 0 : 1);
      return '${text}k';
    }
    return '$count';
  }

  String _estimateReadTime(BlogPost post) {
    final content = [
      post.title,
      post.excerpt,
      post.htmlContent,
      ...post.bodyParagraphs,
    ].join(' ');

    final wordCount = RegExp(r'\S+').allMatches(content).length;
    final minutes = (wordCount / 220).ceil().clamp(1, 30);
    return '$minutes phút đọc';
  }
}
