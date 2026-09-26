import '../../../app/routing/app_routes.dart';

final _uuidPattern = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  caseSensitive: false,
);

/// Resolves the in-app destination for a notification, mirroring the web
/// client. Returns `null` when the notification is not actionable.
String? resolveNotificationRoute({
  String? notificationType,
  String? referenceType,
  String? referenceId,
}) {
  final refType = referenceType?.toUpperCase();
  final nType = notificationType?.toUpperCase();
  final id = referenceId?.trim();

  if (refType == 'LOTTERY_STATION') {
    if (nType == 'DRAW_RESULT' || nType == 'RESULT') {
      return AppRoute.checkTicket.path;
    }
    return AppRoute.buyTicket.path;
  }
  if (refType == null || id == null || id.isEmpty) return null;

  switch (refType) {
    case 'ORDER':
      // Legacy payloads sent a numeric refund id under the ORDER type.
      return _uuidPattern.hasMatch(id)
          ? '/profile/orders/$id'
          : '/profile/refunds/$id';
    case 'REFUND':
    case 'REFUND_REQUEST':
      return '/profile/refunds/$id';
    case 'PRIZE_PAYOUT_REQUEST':
      return '/profile/prize-payouts/$id';
    case 'SUPPORT_TICKET':
      return '/profile/complaints/$id';
    default:
      return null;
  }
}

/// Checks whether a target route path corresponds to a StatefulShellRoute tab branch.
/// Shell tab branches cannot be pushed via `context.push()` (which would duplicate
/// the shell and rootNavigatorKey); they must be navigated to via `context.go()`.
bool isShellTabRoute(String route) {
  final cleanPath = Uri.tryParse(route)?.path ?? route;
  return cleanPath == AppRoute.home.path ||
      cleanPath == AppRoute.buyTicket.path ||
      cleanPath == AppRoute.utilitiesTwo.path ||
      cleanPath == AppRoute.notifications.path ||
      cleanPath == AppRoute.profile.path ||
      cleanPath == AppRoute.utilities.path;
}

bool notificationNeedsReferenceCheck(String? referenceType) {
  const checked = {
    'ORDER',
    'REFUND',
    'REFUND_REQUEST',
    'PRIZE_PAYOUT_REQUEST',
    'SUPPORT_TICKET',
    'BLOG_POST',
  };
  return checked.contains(referenceType?.toUpperCase());
}
