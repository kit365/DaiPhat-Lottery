import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../ui/viewmodels/login_viewmodel.dart';
import '../../ui/viewmodels/register_viewmodel.dart';
import '../../ui/viewmodels/forgot_password_viewmodel.dart';
import '../../ui/viewmodels/profile_viewmodel.dart';
import '../../ui/views/buy_ticket/buy_ticket_view.dart';
import '../../ui/views/cart/cart_view.dart';
import '../../ui/views/home/home_view.dart';
import '../../ui/views/login/login_view.dart';
import '../../ui/views/register/register_view.dart';
import '../../ui/views/forgot_password/forgot_password_view.dart';
import '../../ui/views/main_layout.dart';
import '../../ui/views/profile/profile_view.dart';
import '../../ui/views/profile/profile_edit_view.dart';
import '../../ui/views/profile/profile_detail_view.dart';
import '../../ui/views/notification/notification_view.dart';
import '../../ui/viewmodels/notification_viewmodel.dart';
import 'app_routes.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');
final _shellNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'shell');

GoRouter createAppRouter({
  required LoginViewModel loginViewModel,
  required RegisterViewModel registerViewModel,
  required ForgotPasswordViewModel forgotPasswordViewModel,
  required ProfileViewModel profileViewModel,
  required NotificationViewModel notificationViewModel,
}) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: AppRoute.home.path,
    routes: [
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) =>
            MainLayout(loginViewModel: loginViewModel, child: child),
        routes: [
          _route(AppRoute.home, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel, notificationViewModel),
          _route(AppRoute.buyTicket, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel, notificationViewModel),
          _route(AppRoute.profile, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel, notificationViewModel),
        ],
      ),
      _route(AppRoute.login, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel, notificationViewModel),
      _route(AppRoute.register, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel, notificationViewModel),
      _route(AppRoute.forgotPassword, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel, notificationViewModel),
      _route(AppRoute.cart, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel, notificationViewModel),
      _route(AppRoute.profileEdit, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel, notificationViewModel),
      _route(AppRoute.profileDetail, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel, notificationViewModel),
      _route(AppRoute.notifications, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel, notificationViewModel),
    ],
  );
}

GoRoute _route(
  AppRoute route,
  LoginViewModel loginViewModel,
  RegisterViewModel registerViewModel,
  ForgotPasswordViewModel forgotPasswordViewModel,
  ProfileViewModel profileViewModel,
  NotificationViewModel notificationViewModel,
) {
  return GoRoute(
    parentNavigatorKey: route.usesRootNavigator ? rootNavigatorKey : null,
    path: route.path,
    name: route.name,
    builder: (context, state) => _buildRoute(route, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel, notificationViewModel),
  );
}

Widget _buildRoute(
  AppRoute route,
  LoginViewModel loginViewModel,
  RegisterViewModel registerViewModel,
  ForgotPasswordViewModel forgotPasswordViewModel,
  ProfileViewModel profileViewModel,
  NotificationViewModel notificationViewModel,
) {
  switch (route) {
    case AppRoute.home:
      return HomeView(loginViewModel: loginViewModel, notificationViewModel: notificationViewModel);
    case AppRoute.login:
      return LoginView(viewModel: loginViewModel);
    case AppRoute.register:
      return RegisterView(viewModel: registerViewModel);
    case AppRoute.forgotPassword:
      return ForgotPasswordView(viewModel: forgotPasswordViewModel);
    case AppRoute.buyTicket:
      return const BuyTicketView();
    case AppRoute.cart:
      return const CartView();
    case AppRoute.profile:
      return ProfileView(viewModel: profileViewModel);
    case AppRoute.profileEdit:
      return ProfileEditView(viewModel: profileViewModel);
    case AppRoute.profileDetail:
      return ProfileDetailView(viewModel: profileViewModel);
    case AppRoute.notifications:
      return NotificationView(viewModel: notificationViewModel);
  }
}
