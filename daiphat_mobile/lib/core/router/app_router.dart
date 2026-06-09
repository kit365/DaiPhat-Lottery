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
import 'app_routes.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');
final _shellNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'shell');

GoRouter createAppRouter({
  required LoginViewModel loginViewModel,
  required RegisterViewModel registerViewModel,
  required ForgotPasswordViewModel forgotPasswordViewModel,
  required ProfileViewModel profileViewModel,
}) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoute.home.path,
    routes: [
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) =>
            MainLayout(loginViewModel: loginViewModel, child: child),
        routes: [
          _route(AppRoute.home, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel),
          _route(AppRoute.buyTicket, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel),
          _route(AppRoute.profile, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel),
        ],
      ),
      _route(AppRoute.login, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel),
      _route(AppRoute.register, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel),
      _route(AppRoute.forgotPassword, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel),
      _route(AppRoute.cart, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel),
      _route(AppRoute.profileEdit, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel),
      _route(AppRoute.profileDetail, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel),
    ],
  );
}

GoRoute _route(
  AppRoute route,
  LoginViewModel loginViewModel,
  RegisterViewModel registerViewModel,
  ForgotPasswordViewModel forgotPasswordViewModel,
  ProfileViewModel profileViewModel,
) {
  return GoRoute(
    parentNavigatorKey: route.usesRootNavigator ? _rootNavigatorKey : null,
    path: route.path,
    name: route.name,
    builder: (context, state) => _buildRoute(route, loginViewModel, registerViewModel, forgotPasswordViewModel, profileViewModel),
  );
}

Widget _buildRoute(
  AppRoute route,
  LoginViewModel loginViewModel,
  RegisterViewModel registerViewModel,
  ForgotPasswordViewModel forgotPasswordViewModel,
  ProfileViewModel profileViewModel,
) {
  switch (route) {
    case AppRoute.home:
      return const HomeView();
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
  }
}
