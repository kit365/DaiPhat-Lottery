final _uuidPattern = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  caseSensitive: false,
);

/// Resolves the in-app destination for a notification, mirroring the web
/// client. Returns `null` when the notification is not actionable.
String? resolveNotificationRoute({String? referenceType, String? referenceId}) {
  final type = referenceType?.toUpperCase();
  final id = referenceId?.trim();

  if (type == 'LOTTERY_STATION') return '/buy-ticket';
  if (type == null || id == null || id.isEmpty) return null;

  switch (type) {
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
