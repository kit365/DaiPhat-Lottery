import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';

import 'package:daiphat_mobile/src/features/blog/presentation/models/blog_post.dart';
import 'package:daiphat_mobile/src/features/blog/presentation/viewmodels/blog_viewmodel.dart';
import 'package:daiphat_mobile/src/features/blog/presentation/views/blog_detail_screen.dart';
import 'package:daiphat_mobile/src/features/blog/presentation/views/blog_screen.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

class HomeBlogSection extends ConsumerWidget {
  const HomeBlogSection({super.key});

  void _openAllNews(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => BlogScreen(
          onBack: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }

  void _openDetail(BuildContext context, BlogPost post) {
    final slug = post.slug;
    if (slug == null || slug.isEmpty) return;

    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => BlogDetailScreen(slug: slug),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final blogState = ref.watch(blogViewModelProvider);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfacePrimary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.cardBorder, width: 1.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: .03),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 12, 12),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFCE5DF),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.newspaper_rounded,
                      color: AppColors.primary,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'TIN TỨC XỔ SỐ',
                    style: AppTypography.display(
                      const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textMain,
                      ),
                    ),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => _openAllNews(context),
                    behavior: HitTestBehavior.opaque,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Xem tất cả',
                            style: AppTypography.main(
                              const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(
                            Icons.arrow_forward_ios_rounded,
                            size: 11,
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Divider(color: AppColors.cardBorder, height: 1, thickness: 1),

            // Content
            blogState.when(
              loading: () => _buildSkeleton(),
              error: (_, _) => const SizedBox.shrink(),
              data: (data) {
                final allPosts = <BlogPost>[
                  if (data.featured != null) data.featured!,
                  ...data.popular,
                  ...data.recent,
                ];

                // Deduplicate by slug
                final seenSlugs = <String>{};
                final uniquePosts = allPosts.where((p) {
                  final s = p.slug ?? '';
                  if (s.isEmpty || seenSlugs.contains(s)) return false;
                  seenSlugs.add(s);
                  return true;
                }).take(3).toList();

                if (uniquePosts.isEmpty) {
                  return const SizedBox.shrink();
                }

                return Column(
                  children: [
                    // Top featured card
                    _buildTopPost(context, uniquePosts.first),

                    // Smaller list items
                    for (var i = 1; i < uniquePosts.length; i++) ...[
                      const Divider(
                        color: AppColors.cardBorder,
                        height: 1,
                        thickness: .6,
                      ),
                      _buildPostRow(context, uniquePosts[i]),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopPost(BuildContext context, BlogPost post) {
    return InkWell(
      onTap: () => _openDetail(context, post),
      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(
                  post.imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(
                    color: const Color(0xFFFFF9E6),
                    child: const Icon(
                      Icons.image_outlined,
                      size: 40,
                      color: Color(0xFFFFD700),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            if (post.category.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9ECEE),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  post.category,
                  style: AppTypography.main(
                    const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 6),
            ],
            Text(
              post.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.display(
                const TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMain,
                  height: 1.35,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(
                  Icons.calendar_today_outlined,
                  size: 13,
                  color: AppColors.textMuted,
                ),
                const SizedBox(width: 5),
                Text(
                  post.authorDate.isNotEmpty ? post.authorDate : post.date,
                  style: AppTypography.main(
                    const TextStyle(
                      fontSize: 12,
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPostRow(BuildContext context, BlogPost post) {
    return InkWell(
      onTap: () => _openDetail(context, post),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.network(
                post.imageUrl,
                width: 76,
                height: 76,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(
                  width: 76,
                  height: 76,
                  color: const Color(0xFFFFF9E6),
                  child: const Icon(
                    Icons.image_outlined,
                    size: 28,
                    color: Color(0xFFFFD700),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: SizedBox(
                height: 76,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      post.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.display(
                        const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textMain,
                          height: 1.3,
                        ),
                      ),
                    ),
                    Row(
                      children: [
                        if (post.category.isNotEmpty) ...[
                          Text(
                            post.category,
                            style: AppTypography.main(
                              const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            '•',
                            style: TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 10,
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
                        Text(
                          post.date,
                          style: AppTypography.main(
                            const TextStyle(
                              fontSize: 11.5,
                              color: AppColors.textMuted,
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
    );
  }

  Widget _buildSkeleton() {
    return Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        children: [
          Shimmer.fromColors(
            baseColor: Colors.grey[300]!,
            highlightColor: Colors.grey[100]!,
            child: Container(
              height: 140,
              decoration: BoxDecoration(
                color: AppColors.surfacePrimary,
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Shimmer.fromColors(
            baseColor: Colors.grey[300]!,
            highlightColor: Colors.grey[100]!,
            child: Container(
              height: 16,
              decoration: BoxDecoration(
                color: AppColors.surfacePrimary,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
