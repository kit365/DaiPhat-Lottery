import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import '../models/blog_post.dart';
import '../viewmodels/blog_viewmodel.dart';

const _primary = AppColors.primary;
const _gold = AppColors.brandAccentYellow;
const _goldLight = AppColors.surfaceWarning;
const _ink = AppColors.contentHeading;
const _secondary = AppColors.contentSecondary;
const _surface = AppColors.surfacePrimary;
const _pageBg = AppColors.surfacePrimary;
const _tagBg = AppColors.brandPrimaryBorderLight;
const _divider = AppColors.borderLight;
const _brandAvatarAsset = 'assets/images/logoApp.png';

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
                  child:
                      _buildRelatedSection(context, ref, data.post, data.related),
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
                          style: AppTypography.h4(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: _ink,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          error.toString(),
                          textAlign: TextAlign.center,
                          style: AppTypography.bodyMedium(
                            fontSize: 14,
                            color: _secondary,
                            height: 1.5,
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
                          child: Text(
                            'Thử lại ngay',
                            style: AppTypography.buttonMedium(
                              color: AppColors.surfacePrimary,
                            ),
                          ),
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
    return SizedBox(
      height: 78,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Stack(
          alignment: Alignment.center,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: _CircleHeaderButton(
              icon: Icons.arrow_back_rounded,
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 66),
            child: Text(
              'Chi tiết bài viết',
              textAlign: TextAlign.center,
              style: AppTypography.h3(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: _primary,
              ),
            ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: _CircleHeaderButton(
              icon: Icons.share_outlined,
              onPressed: () {},
            ),
          ),
        ],
        ),
      ),
    );
  }

  Widget _buildArticle(BlogPost post) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (post.category.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: _tagBg,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                post.category,
                style: AppTypography.labelMedium(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: _primary,
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
          Text(
            post.title,
            style: AppTypography.h2(
              fontSize: 26,
              fontWeight: FontWeight.w900,
              color: _ink,
              height: 1.22,
            ),
          ),
          const SizedBox(height: 18),
          _buildAuthorRow(post),
          const SizedBox(height: 18),
          _buildHeroImage(post),
          if (post.excerpt.isNotEmpty) ...[
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
              decoration: BoxDecoration(
                color: AppColors.surfaceDestructiveSoft,
                borderRadius: BorderRadius.circular(10),
                border: const Border(left: BorderSide(color: _primary, width: 3)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.format_quote_rounded,
                      color: _primary, size: 34),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      post.excerpt,
                      style: AppTypography.bodyLarge(
                        fontSize: 17,
                        fontWeight: FontWeight.w500,
                        color: _ink,
                        height: 1.55,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 22),
          _buildBody(post),
          if (post.tags.isNotEmpty) ...[
            const SizedBox(height: 24),
            _buildTags(post),
          ],
          const SizedBox(height: 18),
        ],
      ),
    );
  }

  Widget _buildAuthorRow(BlogPost post) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: AppColors.surfacePrimary,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: _primary.withValues(alpha: 0.18),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsets.all(3),
          clipBehavior: Clip.antiAlias,
          child: ClipOval(
            child: Image.asset(
              _brandAvatarAsset,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Center(
                child: Text(
                  'DP',
                  style: AppTypography.buttonMedium(
                    color: AppColors.surfacePrimary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      post.author.isEmpty ? 'DAI PHAT' : post.author.toUpperCase(),
                      style: AppTypography.subtitle1(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: _ink,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(
                    Icons.verified_rounded,
                    size: 16,
                    color: AppColors.statusSuccess,
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 6,
                runSpacing: 4,
                children: [
                  _metaIconText(Icons.calendar_month_outlined, post.date),
                  _metaDot(),
                  _metaIconText(Icons.visibility_outlined, _formatViews(post.viewCount)),
                  _metaDot(),
                  _metaIconText(Icons.schedule_rounded, _estimateReadTime(post)),
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
          borderRadius: BorderRadius.circular(14),
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
            fontFamily: AppTypography.mainFamily,
          ),
          'p': Style(
            margin: Margins.only(bottom: 20),
            color: _ink,
            fontSize: FontSize(16),
            lineHeight: const LineHeight(1.8),
            fontFamily: AppTypography.mainFamily,
          ),
          'h1': Style(
            fontFamily: AppTypography.displayFamily,
            fontSize: FontSize(24),
            fontWeight: FontWeight.w700,
            color: _ink,
            lineHeight: const LineHeight(1.4),
            margin: Margins.only(bottom: 18),
          ),
          'h2': Style(
            fontFamily: AppTypography.displayFamily,
            fontSize: FontSize(22),
            fontWeight: FontWeight.w700,
            color: _ink,
            lineHeight: const LineHeight(1.4),
            margin: Margins.only(top: 10, bottom: 18),
          ),
          'h3': Style(
            fontFamily: AppTypography.displayFamily,
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
            fontFamily: AppTypography.mainFamily,
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
            fontFamily: AppTypography.mainFamily,
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
            style: AppTypography.bodyLarge(
              fontSize: 16,
              fontWeight: FontWeight.w400,
              color: _ink,
              height: 1.85,
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
        style: AppTypography.caption(
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
                  style: AppTypography.h4(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: _ink,
                    letterSpacing: 0.6,
                    height: 1.3,
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
          boxShadow: const [
            BoxShadow(
              color: AppColors.shadowLight,
              blurRadius: 10,
              offset: Offset(0, 4),
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
                        style: AppTypography.overline(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: _primary,
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    Text(
                      item.title,
                      style: AppTypography.subtitle1(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: _ink,
                        height: 1.45,
                      ),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      item.authorDate.isNotEmpty ? item.authorDate : item.date,
                      style: AppTypography.caption(
                        fontSize: 13,
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

  Widget _metaText(String text) {
    return Text(
      text,
      style: AppTypography.caption(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: _secondary,
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

class _CircleHeaderButton extends StatelessWidget {
  const _CircleHeaderButton({
    required this.icon,
    required this.onPressed,
  });

  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.borderLight),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: IconButton(
        onPressed: onPressed,
        splashRadius: 24,
        icon: Icon(icon, color: _primary, size: 28),
      ),
    );
  }
}
