import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/features/blog/presentation/views/blog_screen.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/viewmodels/notification_viewmodel.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/views/notification_view.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

enum _ShellSidePage { main, blog, notifications }

class MainLayout extends StatefulWidget {
  final LoginViewModel loginViewModel;
  final NotificationViewModel notificationViewModel;
  final Widget child;

  const MainLayout({
    super.key,
    required this.loginViewModel,
    required this.notificationViewModel,
    required this.child,
  });

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  late final PageController _pageController;
  _ShellSidePage _sidePage = _ShellSidePage.main;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: 1);
  }

  void _syncSidePage(int index) {
    final nextPage = switch (index) {
      0 => _ShellSidePage.blog,
      2 => _ShellSidePage.notifications,
      _ => _ShellSidePage.main,
    };
    if (nextPage != _sidePage) {
      setState(() => _sidePage = nextPage);
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _goToMain() {
    if (_sidePage != _ShellSidePage.main) {
      setState(() => _sidePage = _ShellSidePage.main);
    }
    _pageController.animateToPage(
      1,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _goToNotifications() {
    if (_sidePage != _ShellSidePage.notifications) {
      setState(() => _sidePage = _ShellSidePage.notifications);
    }
    _pageController.animateToPage(
      2,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  int _getNavIndex(BuildContext context) {
    switch (_sidePage) {
      case _ShellSidePage.blog:
        return -1;
      case _ShellSidePage.notifications:
        return 3;
      case _ShellSidePage.main:
        final location = GoRouterState.of(context).uri.path;
        if (location.startsWith(AppRoute.buyTicket.path)) {
          return 1;
        }
        if (location.startsWith(AppRoute.checkTicket.path)) {
          return 2;
        }
        if (location.startsWith(AppRoute.profile.path)) {
          return 4;
        }
        return 0;
    }
  }

  void _onNavTap(int index, BuildContext context) {
    switch (index) {
      case 0:
        _goToMain();
        context.go(AppRoute.home.path);
        break;
      case 1:
        _goToMain();
        context.go(AppRoute.buyTicket.path);
        break;
      case 2:
        _goToMain();
        context.go(AppRoute.checkTicket.path);
        break;
      case 3:
        _goToNotifications();
        break;
      case 4:
        _goToMain();
        if (widget.loginViewModel.isAuthenticated) {
          context.go(AppRoute.profile.path);
        } else {
          context.go(AppRoute.login.path);
        }
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final navIndex = _getNavIndex(context);

    return Scaffold(
      body: PageView(
        controller: _pageController,
        physics: const BouncingScrollPhysics(),
        onPageChanged: _syncSidePage,
        children: [
          BlogScreen(
            key: const ValueKey('shell-blog'),
            onBack: () {
              _goToMain();
              context.go(AppRoute.home.path);
            },
          ),
          KeyedSubtree(
            key: ValueKey(GoRouterState.of(context).uri.path),
            child: widget.child,
          ),
          NotificationView(
            key: const ValueKey('shell-notifications'),
            viewModel: widget.notificationViewModel,
            onBack: () {
              _goToMain();
              context.go(AppRoute.home.path);
            },
          ),
        ],
      ),
      bottomNavigationBar: ListenableBuilder(
        listenable: widget.notificationViewModel,
        builder: (context, _) => _AnimatedBottomNavigation(
          selectedIndex: navIndex,
          notificationBadge: widget.notificationViewModel.unreadCount,
          onTap: (index) => _onNavTap(index, context),
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
      label: 'Trang chủ',
      icon: Icons.home_outlined,
      activeIcon: Icons.home_rounded,
    ),
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

    return Container(
      height: 70 + bottomInset,
      padding: EdgeInsets.fromLTRB(8, 7, 8, bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(25)),
        boxShadow: [
          BoxShadow(
            color: Color(0x1A3B1412),
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
                badge: index == 3 ? notificationBadge : 0,
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
        radius: 34,
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: selected ? 1 : 0),
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOutCubic,
          builder: (context, value, child) {
            final activeColor = Color.lerp(
              const Color(0xFF2E2928),
              AppColors.primary,
              value,
            )!;
            return Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 280),
                  curve: Curves.easeOutCubic,
                  width: selected ? 48 : 36,
                  height: 31,
                  decoration: BoxDecoration(
                    color: Color.lerp(
                      Colors.transparent,
                      const Color(0xFFFFE7EA),
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
                          size: 22 + (2 * value),
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
                                  color: Colors.white,
                                  width: 1.2,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                badge > 99 ? '99+' : '$badge',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
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
                AnimatedDefaultTextStyle(
                  duration: const Duration(milliseconds: 220),
                  style: TextStyle(
                    fontSize: 10,
                    height: 1,
                    color: activeColor,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  ),
                  child: Text(item.label),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
