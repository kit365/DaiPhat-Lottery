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
            onTap: (branchIndex) {
              if (!loginViewModel.isAuthenticated &&
                  branchIndex == _AnimatedBottomNavigation.profileBranchIndex) {
                context.go(AppRoute.profile.path);
                return;
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
  });

  final int selectedIndex;
  final ValueChanged<int> onTap;
  static const profileBranchIndex = 4;

  static const _branchIndexes = <int>[0, 1, 2, 3, profileBranchIndex];

  static const _items = <({String label, IconData icon, IconData activeIcon})>[
    (
      label: 'Mua vé',
      icon: ProfileIconography.ticket,
      activeIcon: ProfileIconography.ticket,
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
                isHome: index == 2,
                selected: displayedSelectedIndex == index,
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
  });

  final ({String label, IconData icon, IconData activeIcon}) item;
  final int index;
  final int itemCount;
  final bool isHome;
  final bool selected;
  final VoidCallback onTap;

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
          '${item.label}, tab ${index + 1} trên $itemCount${selected ? ', đang chọn' : ''}',
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
                      child: Icon(
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
