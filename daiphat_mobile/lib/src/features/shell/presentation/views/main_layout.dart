import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/features/blog/presentation/views/blog_screen.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

class MainLayout extends StatefulWidget {
  final LoginViewModel loginViewModel;
  final Widget child;

  const MainLayout({
    super.key,
    required this.loginViewModel,
    required this.child,
  });

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  late final PageController _pageController;
  bool _onBlogPage = false;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: 1);
    _pageController.addListener(_onPageChanged);
  }

  void _onPageChanged() {
    final page = _pageController.page ?? 1.0;
    final isBlog = page < 0.5;
    if (isBlog != _onBlogPage) {
      setState(() => _onBlogPage = isBlog);
    }
  }

  @override
  void dispose() {
    _pageController.removeListener(_onPageChanged);
    _pageController.dispose();
    super.dispose();
  }

  void _goToBlog() {
    _pageController.animateToPage(
      0,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _goToMain() {
    _pageController.animateToPage(
      1,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  int _getNavIndex(BuildContext context) {
    if (_onBlogPage) {
      return 3;
    }

    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith(AppRoute.buyTicket.path)) {
      return 1;
    }
    if (location.startsWith('/results')) {
      return 2;
    }
    if (location.startsWith(AppRoute.profile.path)) {
      return 4;
    }
    return 0;
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
        break;
      case 3:
        _goToBlog();
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
        children: [
          BlogScreen(
            onBack: () {
              _goToMain();
              context.go(AppRoute.home.path);
            },
          ),
          widget.child,
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Color(0x12000000),
              blurRadius: 12,
              offset: Offset(0, -3),
            ),
          ],
        ),
        child: NavigationBar(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          height: 70,
          selectedIndex: navIndex,
          onDestinationSelected: (index) => _onNavTap(index, context),
          indicatorColor: const Color(0xFFFFF0F0),
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home, color: AppColors.primary),
              label: 'Trang chủ',
            ),
            const NavigationDestination(
              icon: Icon(Icons.confirmation_number_outlined),
              selectedIcon: Icon(
                Icons.confirmation_number,
                color: AppColors.primary,
              ),
              label: 'Mua vé',
            ),
            const NavigationDestination(
              icon: Icon(Icons.emoji_events_outlined),
              selectedIcon: Icon(Icons.emoji_events, color: AppColors.primary),
              label: 'Kết quả',
            ),
            const NavigationDestination(
              icon: Icon(Icons.article_outlined),
              selectedIcon: Icon(Icons.article, color: AppColors.primary),
              label: 'Tin tức',
            ),
            const NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person, color: AppColors.primary),
              label: 'Cá nhân',
            ),
          ],
        ),
      ),
    );
  }
}
