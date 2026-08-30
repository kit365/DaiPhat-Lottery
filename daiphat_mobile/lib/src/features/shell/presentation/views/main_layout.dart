import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/viewmodels/notification_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

class MainLayout extends StatelessWidget {
  final LoginViewModel loginViewModel;
  final NotificationViewModel notificationViewModel;
  final StatefulNavigationShell navigationShell;

  const MainLayout({
    super.key,
    required this.loginViewModel,
    required this.notificationViewModel,
    required this.navigationShell,
  });

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: navigationShell.currentIndex == 2,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && navigationShell.currentIndex != 2) {
          navigationShell.goBranch(2);
        }
      },
      child: Scaffold(
        body: navigationShell,
        bottomNavigationBar: ListenableBuilder(
          listenable: Listenable.merge([notificationViewModel, loginViewModel]),
          builder: (context, _) => _AnimatedBottomNavigation(
            selectedIndex: navigationShell.currentIndex,
            notificationBadge: notificationViewModel.unreadCount,
            onTap: (index) {
              if (!loginViewModel.isAuthenticated &&
                  (index == 4 || index == 5)) {
                context.go(
                  index == 4
                      ? AppRoute.notifications.path
                      : AppRoute.profile.path,
                );
                return;
              }
              navigationShell.goBranch(index);
            },
          ),
        ),
      ),
    );
  }
}

class _AnimatedBottomNavigation extends StatelessWidget {
  const _AnimatedBottomNavigation({
    required this.selectedIndex,
    required this.onTap,
    this.notificationBadge = 0,
  });

  final int selectedIndex;
  final ValueChanged<int> onTap;
  final int notificationBadge;

  static const _items = <({String label, IconData icon, IconData activeIcon})>[
    (
      label: 'Mua vé',
      icon: Icons.confirmation_number_outlined,
      activeIcon: Icons.confirmation_number_rounded,
    ),
    (
      label: 'Dò vé',
      icon: Icons.qr_code_scanner_rounded,
      activeIcon: Icons.qr_code_scanner_rounded,
    ),
    (
      label: 'Trang chủ',
      icon: Icons.home_outlined,
      activeIcon: Icons.home_rounded,
    ),
    (
      label: 'Tiện ích',
      icon: Icons.dashboard_customize_outlined,
      activeIcon: Icons.dashboard_customize_rounded,
    ),
    (
      label: 'Thông báo',
      icon: Icons.notifications_none_rounded,
      activeIcon: Icons.notifications_rounded,
    ),
    (
      label: 'Cá nhân',
      icon: Icons.person_outline_rounded,
      activeIcon: Icons.person_rounded,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final scaledLabelHeight = MediaQuery.textScalerOf(context).scale(13) * 2;
    final navigationHeight = (54 + scaledLabelHeight).clamp(78.0, 96.0);

    return Container(
      height: navigationHeight + bottomInset,
      padding: EdgeInsets.fromLTRB(4, 6, 4, bottomInset),
      decoration: const BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.vertical(top: Radius.circular(25)),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadowBrandFaint,
            blurRadius: 24,
            spreadRadius: -6,
            offset: Offset(0, -6),
          ),
        ],
      ),
      child: Row(
        children: [
          for (var index = 0; index < _items.length; index++)
            Expanded(
              child: _AnimatedNavItem(
                item: _items[index],
                selected: selectedIndex == index,
                badge: index == 4 ? notificationBadge : 0,
                onTap: () => onTap(index),
              ),
            ),
        ],
      ),
    );
  }
}

class _AnimatedNavItem extends StatelessWidget {
  const _AnimatedNavItem({
    required this.item,
    required this.selected,
    required this.onTap,
    this.badge = 0,
  });

  final ({String label, IconData icon, IconData activeIcon}) item;
  final bool selected;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: item.label,
      child: InkResponse(
        onTap: onTap,
        containedInkWell: true,
        radius: 28,
        child: ExcludeSemantics(
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: selected ? 1 : 0),
            duration: const Duration(milliseconds: 280),
            curve: Curves.easeOutCubic,
            builder: (context, value, child) {
              final activeColor = Color.lerp(
                AppColors.contentHeading,
                AppColors.primary,
                value,
              )!;
              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 280),
                    curve: Curves.easeOutCubic,
                    width: selected ? 42 : 32,
                    height: 31,
                    decoration: BoxDecoration(
                      color: Color.lerp(
                        AppColors.transparent,
                        AppColors.surfaceBrandWarm,
                        value,
                      ),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    alignment: Alignment.center,
                    child: Transform.translate(
                      offset: Offset(0, -1.5 * value),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Icon(
                            selected ? item.activeIcon : item.icon,
                            color: activeColor,
                            size: 20 + (2 * value),
                          ),
                          if (badge > 0)
                            Positioned(
                              right: -8,
                              top: -6,
                              child: Container(
                                constraints: const BoxConstraints(
                                  minWidth: 16,
                                  minHeight: 16,
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                    color: AppColors.surfacePrimary,
                                    width: 1.2,
                                  ),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  badge > 99 ? '99+' : '$badge',
                                  style: AppTypography.overline(
                                    color: AppColors.surfacePrimary,
                                    fontSize: 9,
                                    height: 1,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Flexible(
                    child: AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 220),
                      style: AppTypography.labelSmall(
                        fontSize: 12,
                        height: 1.1,
                        color: activeColor,
                        fontWeight: selected
                            ? FontWeight.w700
                            : FontWeight.w500,
                      ),
                      child: Text(
                        item.label,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
