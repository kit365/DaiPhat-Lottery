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
  profileOverview,
  refunds,
  refundDetail,
  prizePayouts,
  prizePayoutDetail,
  complaints,
  complaintDetail,
  bankAccounts,
  notifications,
  notificationSettings,
  myTickets,
  myTicketDetail,
  myOrders,
  orderDetail,
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
      case AppRoute.profileOverview:
        return '/profile/overview';
      case AppRoute.refunds:
        return '/profile/refunds';
      case AppRoute.refundDetail:
        return '/profile/refunds/:id';
      case AppRoute.prizePayouts:
        return '/profile/prize-payouts';
      case AppRoute.prizePayoutDetail:
        return '/profile/prize-payouts/:id';
      case AppRoute.complaints:
        return '/profile/complaints';
      case AppRoute.complaintDetail:
        return '/profile/complaints/:id';
      case AppRoute.bankAccounts:
        return '/profile/bank-accounts';
      case AppRoute.notifications:
        return '/notifications';
      case AppRoute.notificationSettings:
        return '/profile/notification-settings';
      case AppRoute.myTickets:
        return '/profile/tickets';
      case AppRoute.myTicketDetail:
        return '/profile/tickets/:id';
      case AppRoute.myOrders:
        return '/profile/orders';
      case AppRoute.orderDetail:
        return '/profile/orders/:id';
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
      case AppRoute.profileOverview:
        return 'profile_overview';
      case AppRoute.refunds:
        return 'refunds';
      case AppRoute.refundDetail:
        return 'refund_detail';
      case AppRoute.prizePayouts:
        return 'prize_payouts';
      case AppRoute.prizePayoutDetail:
        return 'prize_payout_detail';
      case AppRoute.complaints:
        return 'complaints';
      case AppRoute.complaintDetail:
        return 'complaint_detail';
      case AppRoute.bankAccounts:
        return 'bank_accounts';
      case AppRoute.notifications:
        return 'notifications';
      case AppRoute.notificationSettings:
        return 'notification_settings';
      case AppRoute.myTickets:
        return 'my_tickets';
      case AppRoute.myTicketDetail:
        return 'my_ticket_detail';
      case AppRoute.myOrders:
        return 'my_orders';
      case AppRoute.orderDetail:
        return 'order_detail';
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
      case AppRoute.profileOverview:
      case AppRoute.refunds:
      case AppRoute.refundDetail:
      case AppRoute.prizePayouts:
      case AppRoute.prizePayoutDetail:
      case AppRoute.complaints:
      case AppRoute.complaintDetail:
      case AppRoute.bankAccounts:
      case AppRoute.notifications:
      case AppRoute.notificationSettings:
      case AppRoute.myTickets:
      case AppRoute.myTicketDetail:
      case AppRoute.myOrders:
      case AppRoute.orderDetail:
        return true;
      case AppRoute.home:
      case AppRoute.buyTicket:
      case AppRoute.profile:
        return false;
    }
  }
}
