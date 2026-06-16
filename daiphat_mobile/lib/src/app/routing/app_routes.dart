enum AppRoute {
  home,
  login,
  register,
  forgotPassword,
  buyTicket,
  cart,
  checkout,
  checkoutResult,
  paymentWebView,
  deepLinkPayment,
  profile,
  profileEdit,
  profileDetail,
  notifications,
}

extension AppRouteDefinition on AppRoute {
  String get path {
    switch (this) {
      case AppRoute.home:
        return '/';
      case AppRoute.login:
        return '/login';
      case AppRoute.register:
        return '/register';
      case AppRoute.forgotPassword:
        return '/forgot-password';
      case AppRoute.buyTicket:
        return '/buy-ticket';
      case AppRoute.cart:
        return '/cart';
      case AppRoute.checkout:
        return '/checkout';
      case AppRoute.checkoutResult:
        return '/checkout/result';
      case AppRoute.paymentWebView:
        return '/checkout/payment-webview';
      case AppRoute.deepLinkPayment:
        return '/payment';
      case AppRoute.profile:
        return '/profile';
      case AppRoute.profileEdit:
        return '/profile/edit';
      case AppRoute.profileDetail:
        return '/profile/detail';
      case AppRoute.notifications:
        return '/notifications';
    }
  }

  String get name {
    switch (this) {
      case AppRoute.home:
        return 'home';
      case AppRoute.login:
        return 'login';
      case AppRoute.register:
        return 'register';
      case AppRoute.forgotPassword:
        return 'forgot_password';
      case AppRoute.buyTicket:
        return 'buy_ticket';
      case AppRoute.cart:
        return 'cart';
      case AppRoute.checkout:
        return 'checkout';
      case AppRoute.checkoutResult:
        return 'checkout_result';
      case AppRoute.paymentWebView:
        return 'payment_webview';
      case AppRoute.deepLinkPayment:
        return 'deep_link_payment';
      case AppRoute.profile:
        return 'profile';
      case AppRoute.profileEdit:
        return 'profile_edit';
      case AppRoute.profileDetail:
        return 'profile_detail';
      case AppRoute.notifications:
        return 'notifications';
    }
  }

  bool get usesRootNavigator {
    switch (this) {
      case AppRoute.login:
      case AppRoute.register:
      case AppRoute.forgotPassword:
      case AppRoute.cart:
      case AppRoute.checkout:
      case AppRoute.checkoutResult:
      case AppRoute.paymentWebView:
      case AppRoute.deepLinkPayment:
        return true;
      case AppRoute.profileEdit:
      case AppRoute.profileDetail:
      case AppRoute.notifications:
        return true;
      case AppRoute.home:
      case AppRoute.buyTicket:
      case AppRoute.profile:
        return false;
    }
  }
}
