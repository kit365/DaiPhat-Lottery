import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/register_viewmodel.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/forgot_password_viewmodel.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/viewmodels/profile_viewmodel.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/views/buy_ticket_view.dart';
import 'package:daiphat_mobile/src/features/cart/presentation/views/cart_view.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/views/checkout_view.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/views/checkout_result_view.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/views/payment_webview.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/home_view.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/views/login_view.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/views/register_view.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/views/forgot_password_view.dart';
import 'package:daiphat_mobile/src/features/shell/presentation/views/main_layout.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/views/profile_view.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/views/profile_edit_view.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/views/profile_detail_view.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/views/notification_view.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/viewmodels/notification_viewmodel.dart';
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
    // Handle deep links from PayOS redirect
    redirect: (context, state) {
      final uri = state.uri;

      // Deep link: daiphat://payment?code=...&orderCode=...
      if (uri.scheme == 'daiphat' && uri.host == 'payment') {
        final queryParams = uri.queryParameters;
        // Redirect to checkout result with payment params
        return Uri(
          path: AppRoute.checkoutResult.path,
          queryParameters: {
            if (queryParams.containsKey('code')) 'code': queryParams['code']!,
            if (queryParams.containsKey('orderCode'))
              'orderCode': queryParams['orderCode']!,
            if (queryParams.containsKey('internalCode'))
              'internalCode': queryParams['internalCode']!,
            if (queryParams.containsKey('status'))
              'status': queryParams['status']!,
            if (queryParams.containsKey('cancel'))
              'cancel': queryParams['cancel']!,
          },
        ).toString();
      }

      // Deep link: https://dai-phat.vn/payment?code=...&orderCode=...
      if (uri.scheme == 'https' &&
          uri.host.contains('dai-phat') &&
          uri.path.startsWith('/payment')) {
        final queryParams = uri.queryParameters;
        return Uri(
          path: AppRoute.checkoutResult.path,
          queryParameters: {
            if (queryParams.containsKey('code')) 'code': queryParams['code']!,
            if (queryParams.containsKey('orderCode'))
              'orderCode': queryParams['orderCode']!,
            if (queryParams.containsKey('internalCode'))
              'internalCode': queryParams['internalCode']!,
            if (queryParams.containsKey('status'))
              'status': queryParams['status']!,
            if (queryParams.containsKey('cancel'))
              'cancel': queryParams['cancel']!,
          },
        ).toString();
      }

      return null; // No redirect
    },
    routes: [
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) =>
            MainLayout(loginViewModel: loginViewModel, child: child),
        routes: [
          _route(
            AppRoute.home,
            loginViewModel,
            registerViewModel,
            forgotPasswordViewModel,
            profileViewModel,
            notificationViewModel,
          ),
          _route(
            AppRoute.buyTicket,
            loginViewModel,
            registerViewModel,
            forgotPasswordViewModel,
            profileViewModel,
            notificationViewModel,
          ),
          _route(
            AppRoute.profile,
            loginViewModel,
            registerViewModel,
            forgotPasswordViewModel,
            profileViewModel,
            notificationViewModel,
          ),
        ],
      ),
      _route(
        AppRoute.login,
        loginViewModel,
        registerViewModel,
        forgotPasswordViewModel,
        profileViewModel,
        notificationViewModel,
      ),
      _route(
        AppRoute.register,
        loginViewModel,
        registerViewModel,
        forgotPasswordViewModel,
        profileViewModel,
        notificationViewModel,
      ),
      _route(
        AppRoute.forgotPassword,
        loginViewModel,
        registerViewModel,
        forgotPasswordViewModel,
        profileViewModel,
        notificationViewModel,
      ),
      _route(
        AppRoute.cart,
        loginViewModel,
        registerViewModel,
        forgotPasswordViewModel,
        profileViewModel,
        notificationViewModel,
      ),
      _route(
        AppRoute.checkout,
        loginViewModel,
        registerViewModel,
        forgotPasswordViewModel,
        profileViewModel,
        notificationViewModel,
      ),
      _route(
        AppRoute.checkoutResult,
        loginViewModel,
        registerViewModel,
        forgotPasswordViewModel,
        profileViewModel,
        notificationViewModel,
      ),
      _route(
        AppRoute.paymentWebView,
        loginViewModel,
        registerViewModel,
        forgotPasswordViewModel,
        profileViewModel,
        notificationViewModel,
      ),
      _route(
        AppRoute.profileEdit,
        loginViewModel,
        registerViewModel,
        forgotPasswordViewModel,
        profileViewModel,
        notificationViewModel,
      ),
      _route(
        AppRoute.profileDetail,
        loginViewModel,
        registerViewModel,
        forgotPasswordViewModel,
        profileViewModel,
        notificationViewModel,
      ),
      _route(
        AppRoute.deepLinkPayment,
        loginViewModel,
        registerViewModel,
        forgotPasswordViewModel,
        profileViewModel,
        notificationViewModel,
      ),
      _route(
        AppRoute.notifications,
        loginViewModel,
        registerViewModel,
        forgotPasswordViewModel,
        profileViewModel,
        notificationViewModel,
      ),
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
    builder: (context, state) => _buildRoute(
      route,
      state,
      loginViewModel,
      registerViewModel,
      forgotPasswordViewModel,
      profileViewModel,
      notificationViewModel,
    ),
  );
}

Widget _buildRoute(
  AppRoute route,
  GoRouterState state,
  LoginViewModel loginViewModel,
  RegisterViewModel registerViewModel,
  ForgotPasswordViewModel forgotPasswordViewModel,
  ProfileViewModel profileViewModel,
  NotificationViewModel notificationViewModel,
) {
  switch (route) {
    case AppRoute.home:
      return HomeView(
        loginViewModel: loginViewModel,
        notificationViewModel: notificationViewModel,
      );
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
    case AppRoute.checkout:
      return const CheckoutView();
    case AppRoute.checkoutResult:
      final code = state.uri.queryParameters['code'];
      final orderCode = state.uri.queryParameters['orderCode'];
      final internalCode = state.uri.queryParameters['internalCode'];
      final status = state.uri.queryParameters['status'];
      final cancel = state.uri.queryParameters['cancel'];
      final checkoutUrl = state.uri.queryParameters['checkoutUrl'];
      return CheckoutResultView(
        code: code,
        orderCode: orderCode,
        internalCode: internalCode,
        status: status,
        cancel: cancel,
        checkoutUrl: checkoutUrl,
      );
    case AppRoute.paymentWebView:
      final checkoutUrl = state.uri.queryParameters['checkoutUrl'] ?? '';
      final callbackBaseUrl = state.uri.queryParameters['callbackBaseUrl'];
      return PaymentWebView(
        checkoutUrl: checkoutUrl,
        callbackBaseUrl: callbackBaseUrl,
      );
    case AppRoute.profile:
      return ProfileView(viewModel: profileViewModel);
    case AppRoute.profileEdit:
      return ProfileEditView(viewModel: profileViewModel);
    case AppRoute.profileDetail:
      return ProfileDetailView(viewModel: profileViewModel);
    case AppRoute.deepLinkPayment:
      // This route is handled by the redirect above; if somehow reached
      // directly, forward to checkout result
      final code = state.uri.queryParameters['code'];
      final orderCode = state.uri.queryParameters['orderCode'];
      final internalCode = state.uri.queryParameters['internalCode'];
      final status = state.uri.queryParameters['status'];
      final cancel = state.uri.queryParameters['cancel'];
      return CheckoutResultView(
        code: code,
        orderCode: orderCode,
        internalCode: internalCode,
        status: status,
        cancel: cancel,
      );
    case AppRoute.notifications:
      return NotificationView(viewModel: notificationViewModel);
  }
}
