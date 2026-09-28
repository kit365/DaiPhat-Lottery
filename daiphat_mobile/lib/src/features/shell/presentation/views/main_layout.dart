import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/viewmodels/notification_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/profile_iconography.dart';

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
    const homeBranchIndex = _AnimatedBottomNavigation.homeBranchIndex;
    return PopScope(
      canPop: navigationShell.currentIndex == homeBranchIndex,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && navigationShell.currentIndex != homeBranchIndex) {
          navigationShell.goBranch(homeBranchIndex);
        }
      },
      child: Scaffold(
        body: navigationShell,
        bottomNavigationBar: ListenableBuilder(
          listenable: Listenable.merge([notificationViewModel, loginViewModel]),
          builder: (context, _) => _AnimatedBottomNavigation(
            selectedIndex: navigationShell.currentIndex,
            notificationBadgeCount: loginViewModel.isAuthenticated
                ? notificationViewModel.unreadCount
                : 0,
            onTap: (branchIndex) {
              if (!loginViewModel.isAuthenticated) {
                // Protected tabs go through the router redirect to login.
                final protectedPath = switch (branchIndex) {
                  _AnimatedBottomNavigation.notificationsBranchIndex =>
                    AppRoute.notifications.path,
                  _AnimatedBottomNavigation.profileBranchIndex =>
                    AppRoute.profile.path,
                  _ => null,
                };
                if (protectedPath != null) {
                  context.go(protectedPath);
                  return;
                }
              }
              navigationShell.goBranch(branchIndex);
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
    required this.notificationBadgeCount,
  });

  final int selectedIndex;
  final ValueChanged<int> onTap;
  final int notificationBadgeCount;
  static const homeBranchIndex = 1;
  static const utilitiesBranchIndex = 2;
  static const notificationsBranchIndex = 3;
  static const profileBranchIndex = 4;

  /// Shell branch per nav item, in display order.
  static const _branchIndexes = <int>[
    0,
    utilitiesBranchIndex,
    homeBranchIndex,
    notificationsBranchIndex,
    profileBranchIndex,
  ];

  static const _items = <({String label, IconData icon, IconData activeIcon})>[
    (
      label: 'Mua vé',
      icon: ProfileIconography.ticket,
      activeIcon: ProfileIconography.ticket,
    ),
    (
      label: 'Tiện ích',
      icon: Icons.dashboard_customize_outlined,
      activeIcon: Icons.dashboard_customize_rounded,
    ),
    (
      label: 'Trang chủ',
      icon: Icons.home_outlined,
      activeIcon: Icons.home_rounded,
    ),
    (
      label: 'Thông báo',
      icon: ProfileIconography.notifications,
      activeIcon: ProfileIconography.notifications,
    ),
    (
      label: 'Cá nhân',
      icon: ProfileIconography.profile,
      activeIcon: ProfileIconography.profile,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final scaledLabelHeight = MediaQuery.textScalerOf(context).scale(12) * 1.2;
    final navigationHeight = (68 + scaledLabelHeight).clamp(82.0, 108.0);
    final displayedSelectedIndex = _branchIndexes.indexOf(selectedIndex);

    return Container(
      height: navigationHeight + bottomInset,
      padding: EdgeInsets.fromLTRB(6, 7, 6, bottomInset),
      decoration: const BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        border: Border(
          top: BorderSide(color: AppColors.borderDecorative, width: 0.8),
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadowSubtle,
            blurRadius: 18,
            spreadRadius: -8,
            offset: Offset(0, -5),
          ),
        ],
      ),
      child: Row(
        children: [
          for (var index = 0; index < _items.length; index++)
            Expanded(
              child: _AnimatedNavItem(
                item: _items[index],
                index: index,
                itemCount: _items.length,
                isHome: _branchIndexes[index] == homeBranchIndex,
                selected: displayedSelectedIndex == index,
                badgeCount: _branchIndexes[index] == notificationsBranchIndex
                    ? notificationBadgeCount
                    : 0,
                onTap: () => onTap(_branchIndexes[index]),
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
    required this.index,
    required this.itemCount,
    required this.isHome,
    required this.selected,
    required this.onTap,
    this.badgeCount = 0,
  });

  final ({String label, IconData icon, IconData activeIcon}) item;
  final int index;
  final int itemCount;
  final bool isHome;
  final bool selected;
  final VoidCallback onTap;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final animationDuration = reduceMotion
        ? Duration.zero
        : const Duration(milliseconds: 240);

    return Semantics(
      button: true,
      selected: selected,
      label:
          '${item.label}, tab ${index + 1} trên $itemCount'
          '${badgeCount > 0 ? ', $badgeCount chưa đọc' : ''}'
          '${selected ? ', đang chọn' : ''}',
      child: InkResponse(
        onTap: onTap,
        containedInkWell: true,
        highlightShape: BoxShape.rectangle,
        radius: 30,
        child: ExcludeSemantics(
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: selected ? 1 : 0),
            duration: animationDuration,
            curve: Curves.easeOutCubic,
            builder: (context, value, child) {
              final activeColor = Color.lerp(
                AppColors.contentMuted,
                AppColors.primary,
                value,
              )!;
              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  AnimatedContainer(
                    duration: animationDuration,
                    curve: Curves.easeOutCubic,
                    width: isHome ? (selected ? 46 : 36) : (selected ? 42 : 34),
                    height: isHome ? (selected ? 32 : 30) : 30,
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
                      offset: Offset(0, -1.2 * value),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Icon(
                            selected ? item.activeIcon : item.icon,
                            color: isHome
                                ? Color.lerp(
                                    AppColors.contentHeading,
                                    AppColors.primary,
                                    value,
                                  )
                                : activeColor,
                            size: isHome ? 23 + (2 * value) : 20 + (2 * value),
                          ),
                          if (badgeCount > 0)
                            Positioned(
                              right: -8,
                              top: -6,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                  vertical: 1,
                                ),
                                constraints: const BoxConstraints(
                                  minWidth: 16,
                                  minHeight: 16,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.statusError,
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                    color: AppColors.surfacePrimary,
                                    width: 1.5,
                                  ),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  badgeCount > 99 ? '99+' : '$badgeCount',
                                  style: AppTypography.overline(
                                    color: AppColors.surfacePrimary,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
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
                      duration: animationDuration,
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
