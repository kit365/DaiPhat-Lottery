import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/cart/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/views/chat_screen.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_header_action_button.dart';

class UtilitiesView extends ConsumerWidget {
  const UtilitiesView({
    super.key,
    required this.isAuthenticated,
    required this.onOpenNotifications,
    required this.onOpenBlog,
  });

  final bool isAuthenticated;
  final VoidCallback onOpenNotifications;
  final VoidCallback onOpenBlog;

  void _openChat(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ChatScreen(
          isAuthenticated: isAuthenticated,
          isActive: true,
          onBack: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartCount = ref.watch(cartTicketCountProvider);

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 320,
            child: ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [AppColors.surfacePrimary, AppColors.transparent],
                stops: [0.4, 1.0],
              ).createShader(bounds),
              blendMode: BlendMode.dstIn,
              child: Image.asset('assets/images/home_bg.png', fit: BoxFit.cover),
            ),
          ),
          SafeArea(
            bottom: false,
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(
                  child: _UtilitiesHeader(
                    cartCount: cartCount,
                    onCartTap: () => context.pushNamed(AppRoute.cart.name),
                    onChatTap: () => _openChat(context),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    child: _UtilitiesHero(onTap: () {}),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  sliver: SliverGrid.count(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.82,
                    children: [
                      _UtilityCard(
                        icon: Icons.notifications_active_outlined,
                        title: 'Thông báo',
                        subtitle: 'Cập nhật các thông báo mới nhất từ hệ thống',
                        actionLabel: 'Xem ngay',
                        onTap: onOpenNotifications,
                      ),
                      _UtilityCard(
                        icon: Icons.auto_awesome_rounded,
                        title: 'Gieo quẻ',
                        subtitle: 'Gieo quẻ may mắn nhận lời giải cho bạn',
                        actionLabel: 'Gieo ngay',
                        onTap: () => context.push(AppRoute.fortune.path),
                      ),
                      _UtilityCard(
                        icon: Icons.calendar_month_outlined,
                        title: 'Lịch mở thưởng',
                        subtitle: 'Theo dõi lịch mở thưởng và kết quả chi tiết',
                        actionLabel: 'Xem lịch',
                        onTap: () => context.push(AppRoute.schedule.path),
                      ),
                      _UtilityCard(
                        icon: Icons.article_outlined,
                        title: 'Tin tức',
                        subtitle:
                            'Cập nhật tin tức, sự kiện và khuyến mãi mới nhất',
                        actionLabel: 'Đọc ngay',
                        onTap: onOpenBlog,
                      ),
                    ],
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
                    child: _SupportBanner(onTap: () => _openChat(context)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _UtilitiesHeader extends StatelessWidget {
  const _UtilitiesHeader({
    required this.cartCount,
    required this.onCartTap,
    required this.onChatTap,
  });

  final int cartCount;
  final VoidCallback onCartTap;
  final VoidCallback onChatTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFBF1A22),
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      child: Stack(
        alignment: Alignment.center,
        children: [
          const Text(
            'Tiện Ích',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: AppColors.surfacePrimary,
            ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AppHeaderActionButton(
                  icon: Icons.chat_bubble_outline_rounded,
                  tooltip: 'Trò chuyện / Hỗ trợ',
                  onTap: onChatTap,
                ),
                const SizedBox(width: 8),
                AppHeaderActionButton(
                  icon: Icons.shopping_cart_outlined,
                  tooltip: 'Giỏ hàng',
                  badgeCount: cartCount,
                  onTap: onCartTap,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _UtilitiesHero extends StatelessWidget {
  const _UtilitiesHero({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFE9282D), Color(0xFFC90D0D)],
        ),
        border: Border.all(color: AppColors.surfacePrimary.withValues(alpha: 0.22)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Khám phá ngay',
                  style: TextStyle(
                    color: AppColors.surfacePrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Những tiện ích\nhấp dẫn',
                  style: TextStyle(
                    color: AppColors.surfacePrimary,
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    height: 1.16,
                  ),
                ),
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: onTap,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.transparent,
                    foregroundColor: const Color(0xFF7A1B12),
                    shadowColor: AppColors.transparent,
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                  child: Ink(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Color(0xFFFFF2A3),
                          Color(0xFFFFD23F),
                          Color(0xFFFFA81D),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(999),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFFFB21D).withValues(alpha: 0.42),
                          blurRadius: 14,
                          offset: const Offset(0, 6),
                        ),
                        BoxShadow(
                          color: Colors.white.withValues(alpha: 0.7),
                          blurRadius: 1,
                          offset: const Offset(0, -1),
                        ),
                      ],
                    ),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Khám phá ngay',
                            style: TextStyle(fontWeight: FontWeight.w900),
                          ),
                          SizedBox(width: 6),
                          Icon(Icons.chevron_right_rounded, size: 20),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 116,
            height: 128,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: 92,
                  height: 92,
                  decoration: BoxDecoration(
                    color: AppColors.surfacePrimary.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(22),
                  ),
                ),
                const Positioned(
                  left: 0,
                  top: 12,
                  child: _HeroIconTile(icon: Icons.notifications_active),
                ),
                const Positioned(
                  right: 0,
                  top: 0,
                  child: _HeroIconTile(icon: Icons.auto_awesome),
                ),
                const Positioned(
                  left: 14,
                  bottom: 2,
                  child: _HeroIconTile(icon: Icons.calendar_month),
                ),
                const Positioned(
                  right: 4,
                  bottom: 18,
                  child: _HeroIconTile(icon: Icons.article),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroIconTile extends StatelessWidget {
  const _HeroIconTile({required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        color: const Color(0xFFFFF6EA),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.16),
            blurRadius: 12,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Icon(icon, color: AppColors.primary, size: 27),
    );
  }
}

class _UtilityCard extends StatelessWidget {
  const _UtilityCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.actionLabel,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String actionLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Ink(
        padding: const EdgeInsets.fromLTRB(12, 16, 12, 14),
        decoration: BoxDecoration(
          color: AppColors.surfacePrimary,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFF0E5E3)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.035),
              blurRadius: 16,
              offset: const Offset(0, 7),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: Color(0xFFFCE7E7),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Container(
                  width: 54,
                  height: 54,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: AppColors.surfacePrimary, size: 30),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFF1B1110),
                fontSize: 20,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFF3F3A38),
                fontSize: 13,
                fontWeight: FontWeight.w500,
                height: 1.3,
              ),
            ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF1F1),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Flexible(
                    child: Text(
                      actionLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.primary,
                    size: 18,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SupportBanner extends StatelessWidget {
  const _SupportBanner({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Ink(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFCF1),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFFFF0BC)),
        ),
        child: Row(
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: const BoxDecoration(
                color: Color(0xFFFFF3C4),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.support_agent_rounded,
                color: AppColors.primary,
                size: 30,
              ),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Bạn cần hỗ trợ?',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Đội ngũ CSKH luôn sẵn sàng hỗ trợ bạn 24/7',
                    style: TextStyle(
                      color: Color(0xFF6B625F),
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              width: 44,
              height: 44,
              decoration: const BoxDecoration(
                color: Color(0xFFFFD33F),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.surfacePrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
