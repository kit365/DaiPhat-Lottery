import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/cart/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/views/chat_screen.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_header_action_button.dart';

class UtilitiesTwoView extends ConsumerWidget {
  const UtilitiesTwoView({
    super.key,
    required this.isAuthenticated,
    this.onBack,
    required this.onOpenNotifications,
    required this.onOpenBlog,
  });

  final bool isAuthenticated;
  final VoidCallback? onBack;
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
          Positioned.fill(
            child: SafeArea(
              bottom: false,
              child: Column(
                children: [
                  _UtilitiesTwoHeader(
                    title: 'Tiện ích',
                    onBack: onBack,
                    onOpenCart: () => context.pushNamed(AppRoute.cart.name),
                    onOpenChat: () => _openChat(context),
                  ),
                Expanded(
                  child: RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: () async {},
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: EdgeInsets.zero,
                      children: [
                        const _UtilitiesTwoShowcase(),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
                          child: Column(
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: _UtilityCard(
                                      icon: Icons.notifications_active_outlined,
                                      title: 'Thông báo',
                                      subtitle:
                                          'Cập nhật các thông báo mới nhất từ hệ thống',
                                      actionLabel: 'Xem ngay',
                                      onTap: onOpenNotifications,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: _UtilityCard(
                                      icon: Icons.auto_awesome_rounded,
                                      title: 'Gieo quẻ',
                                      subtitle:
                                          'Gieo quẻ may mắn nhận lời giải cho bạn',
                                      actionLabel: 'Gieo ngay',
                                      onTap: () =>
                                          context.push(AppRoute.fortune.path),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: _UtilityCard(
                                      icon: Icons.calendar_month_outlined,
                                      title: 'Lịch mở thưởng',
                                      subtitle:
                                          'Theo dõi lịch mở thưởng và kết quả chi tiết',
                                      actionLabel: 'Xem lịch',
                                      onTap: () =>
                                          context.push(AppRoute.schedule.path),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: _UtilityCard(
                                      icon: Icons.article_outlined,
                                      title: 'Tin tức',
                                      subtitle:
                                          'Cập nhật tin tức, sự kiện và khuyến mãi mới nhất',
                                      actionLabel: 'Đọc ngay',
                                      onTap: onOpenBlog,
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
                ),
              ],
            ),
          ),
        ),
        ],
      ),
    );
  }
}

class _UtilitiesTwoHeader extends ConsumerWidget {
  const _UtilitiesTwoHeader({
    required this.title,
    this.onBack,
    required this.onOpenCart,
    required this.onOpenChat,
  });

  final String title;
  final VoidCallback? onBack;
  final VoidCallback onOpenCart;
  final VoidCallback onOpenChat;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(cartTicketCountProvider);

    return SizedBox(
      height: 56,
      child: Container(
        color: AppColors.brandPrimaryCrimson,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: [
            if (onBack != null)
              AppHeaderActionButton(
                icon: Icons.arrow_back_ios_new_rounded,
                tooltip: 'Quay lại',
                onTap: onBack!,
              )
            else
              const SizedBox(width: 42),
            Expanded(
              child: Text(
                title,
                textAlign: TextAlign.center,
                style: AppTypography.pageTitle().copyWith(
                  color: AppColors.surfacePrimary,
                ),
              ),
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AppHeaderActionButton(
                  icon: Icons.chat_bubble_outline_rounded,
                  tooltip: 'Trò chuyện / Hỗ trợ',
                  onTap: onOpenChat,
                ),
                const SizedBox(width: 8),
                AppHeaderActionButton(
                  icon: Icons.shopping_cart_outlined,
                  tooltip: 'Giỏ hàng',
                  badgeCount: count,
                  onTap: onOpenCart,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _UtilitiesTwoShowcase extends StatelessWidget {
  const _UtilitiesTwoShowcase();

  static const double _topPadding = 8;
  static const double _redTailPadding = 10;

  double get _redBackgroundHeight =>
      _topPadding + (_HeroBanner.height / 2) + _redTailPadding;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          height: _redBackgroundHeight,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.primaryDark,
                  AppColors.brandPrimaryStrong,
                  AppColors.primary.withValues(alpha: 0.92),
                  AppColors.surfaceSlate50,
                ],
                stops: const [0, .45, .82, 1],
              ),
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(28),
              ),
              boxShadow: const [
                BoxShadow(
                  color: AppColors.shadowBrandFaint,
                  blurRadius: 18,
                  spreadRadius: -6,
                  offset: Offset(0, 8),
                ),
              ],
            ),
          ),
        ),
        Positioned(
          right: -56,
          top: 28,
          child: Container(
            width: 190,
            height: 190,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  AppColors.brandAccentGoldAmber.withValues(alpha: 0.27),
                  AppColors.transparent,
                ],
              ),
            ),
          ),
        ),
        const Padding(
          padding: EdgeInsets.fromLTRB(16, _topPadding, 16, 18),
          child: _HeroBanner(),
        ),
      ],
    );
  }
}

class _HeroBannerSlide {
  const _HeroBannerSlide({
    required this.imageAsset,
    required this.eyebrow,
    required this.title,
    required this.ctaLabel,
  });

  final String imageAsset;
  final String eyebrow;
  final String title;
  final String ctaLabel;
}

class _HeroBanner extends StatefulWidget {
  const _HeroBanner();

  static const double height = 194;

  static const List<_HeroBannerSlide> slides = [
    _HeroBannerSlide(
      imageAsset: 'assets/images/hero_banner.jpg',
      eyebrow: 'Khám phá tiện ích',
      title: 'Một chạm\nmở nhanh',
      ctaLabel: 'Xem ngay',
    ),
    _HeroBannerSlide(
      imageAsset: 'assets/images/lucky_girl_banner.png',
      eyebrow: 'Đại Phát hỗ trợ',
      title: 'Tiện ích\ntrong tay',
      ctaLabel: 'Bắt đầu',
    ),
  ];

  @override
  State<_HeroBanner> createState() => _HeroBannerState();
}

class _HeroBannerState extends State<_HeroBanner> {
  late final PageController _pageController;
  Timer? _autoPlayTimer;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _startAutoPlay();
  }

  @override
  void dispose() {
    _autoPlayTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _startAutoPlay() {
    _autoPlayTimer?.cancel();
    _autoPlayTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || !_pageController.hasClients) return;
      final next = (_currentIndex + 1) % _HeroBanner.slides.length;
      _pageController.animateToPage(
        next,
        duration: const Duration(milliseconds: 480),
        curve: Curves.easeOutCubic,
      );
    });
  }

  void _onPageChanged(int index) {
    setState(() => _currentIndex = index);
    _startAutoPlay();
  }

  @override
  Widget build(BuildContext context) {
    final slides = _HeroBanner.slides;

    return Container(
      height: _HeroBanner.height,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 36,
            spreadRadius: -4,
            offset: Offset(0, 14),
          ),
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 10,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            controller: _pageController,
            onPageChanged: _onPageChanged,
            itemCount: slides.length,
            itemBuilder: (context, index) {
              final slide = slides[index];
              return Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(slide.imageAsset, fit: BoxFit.cover),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                        colors: [
                          AppColors.brandPrimaryDarkRed.withValues(alpha: 0.96),
                          AppColors.brandPrimaryStrong.withValues(alpha: 0.76),
                          AppColors.brandPrimaryCrimson.withValues(alpha: 0.18),
                          AppColors.transparent,
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          slide.eyebrow,
                          style: AppTypography.caption(
                            color: AppColors.surfacePrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 5),
                        SizedBox(
                          width: 188,
                          child: Text(
                            slide.title,
                            style: AppTypography.h3(
                              color: AppColors.surfacePrimary,
                              fontSize: 25,
                              fontWeight: FontWeight.w900,
                              height: 1.12,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                AppColors.fortuneGoldLight,
                                AppColors.brandAccentYellow,
                                AppColors.brandAccentGoldAmber,
                              ],
                            ),
                            borderRadius: BorderRadius.circular(999),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.brandAccentGoldAmber
                                    .withValues(alpha: 0.42),
                                blurRadius: 14,
                                offset: const Offset(0, 6),
                              ),
                              BoxShadow(
                                color: Colors.white.withValues(alpha: 0.65),
                                blurRadius: 1,
                                offset: const Offset(0, -1),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                slide.ctaLabel,
                                style: AppTypography.buttonSmall(
                                  color: AppColors.brandNavy,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(
                                Icons.arrow_forward_ios_rounded,
                                color: AppColors.brandNavy,
                                size: 13,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
          Positioned(
            bottom: 11,
            right: 18,
            child: Row(
              children: List.generate(slides.length, (index) {
                final active = index == _currentIndex;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: active ? 18 : 6,
                  height: 6,
                  margin: const EdgeInsets.only(left: 5),
                  decoration: BoxDecoration(
                    color: active ? AppColors.surfacePrimary : Colors.white54,
                    borderRadius: BorderRadius.circular(999),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
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
          border: Border.all(color: AppColors.borderLight),
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
                color: AppColors.surfaceBrandWarm,
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
              style: AppTypography.h4(
                color: AppColors.contentHeading,
                fontSize: 19,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.bodySmall(
                color: AppColors.contentSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w500,
                height: 1.3,
              ),
            ),
            const SizedBox(height: 10),
            Material(
              color: AppColors.surfaceDestructiveSoft,
              borderRadius: BorderRadius.circular(999),
              child: InkWell(
                onTap: onTap,
                borderRadius: BorderRadius.circular(999),
                hoverColor: AppColors.primary.withValues(alpha: 0.08),
                splashColor: AppColors.primary.withValues(alpha: 0.12),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Flexible(
                        child: Text(
                          actionLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.buttonSmall(
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
              ),
            ),
          ],
        ),
      ),
    );
  }
}
