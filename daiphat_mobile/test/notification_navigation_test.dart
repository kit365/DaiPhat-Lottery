import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/features/notifications/utils/notification_navigation.dart';

String _readSource(String relativePath) =>
    File(relativePath).readAsStringSync().replaceAll('\r\n', '\n');

void main() {
  group('resolveNotificationRoute', () {
    test('routes LOTTERY_STATION draw reminder to /buy-ticket', () {
      final route = resolveNotificationRoute(
        notificationType: 'SYSTEM',
        referenceType: 'LOTTERY_STATION',
      );
      expect(route, '/buy-ticket');
    });

    test(
      'routes LOTTERY_STATION with no notificationType to /buy-ticket for backward compatibility',
      () {
        final route = resolveNotificationRoute(
          referenceType: 'LOTTERY_STATION',
          referenceId: '123',
        );
        expect(route, '/buy-ticket');
      },
    );

    test('routes LOTTERY_STATION DRAW_RESULT to /check-ticket', () {
      final route = resolveNotificationRoute(
        notificationType: 'DRAW_RESULT',
        referenceType: 'LOTTERY_STATION',
        referenceId: '123',
      );
      expect(route, '/check-ticket');
    });

    test('routes ORDER with UUID to order detail', () {
      const orderUuid = '12345678-1234-1234-1234-123456789abc';
      final route = resolveNotificationRoute(
        referenceType: 'ORDER',
        referenceId: orderUuid,
      );
      expect(route, '/profile/orders/$orderUuid');
    });

    test('routes ORDER with numeric ID (legacy refund) to refund detail', () {
      final route = resolveNotificationRoute(
        referenceType: 'ORDER',
        referenceId: '456',
      );
      expect(route, '/profile/refunds/456');
    });

    test('routes REFUND_REQUEST to refund detail', () {
      final route = resolveNotificationRoute(
        referenceType: 'REFUND_REQUEST',
        referenceId: '789',
      );
      expect(route, '/profile/refunds/789');
    });

    test('routes PRIZE_PAYOUT_REQUEST to prize payout detail', () {
      final route = resolveNotificationRoute(
        referenceType: 'PRIZE_PAYOUT_REQUEST',
        referenceId: '101',
      );
      expect(route, '/profile/prize-payouts/101');
    });

    test('routes SUPPORT_TICKET to complaint detail', () {
      final route = resolveNotificationRoute(
        referenceType: 'SUPPORT_TICKET',
        referenceId: '202',
      );
      expect(route, '/profile/complaints/202');
    });

    test('returns null when referenceId is empty or type is unknown', () {
      expect(
        resolveNotificationRoute(referenceType: 'ORDER', referenceId: ''),
        isNull,
      );
      expect(
        resolveNotificationRoute(referenceType: 'UNKNOWN', referenceId: '123'),
        isNull,
      );
      expect(
        resolveNotificationRoute(referenceType: null, referenceId: null),
        isNull,
      );
    });
  });

  group('isShellTabRoute', () {
    test('identifies all StatefulShellRoute tab branches as shell routes', () {
      expect(isShellTabRoute('/'), isTrue);
      expect(isShellTabRoute('/buy-ticket'), isTrue);
      expect(isShellTabRoute('/utilities-2'), isTrue);
      expect(isShellTabRoute('/notifications'), isTrue);
      expect(isShellTabRoute('/profile'), isTrue);
      expect(isShellTabRoute('/utilities'), isTrue);
    });

    test('handles routes with query parameters', () {
      expect(
        isShellTabRoute('/buy-ticket?station=HCM&drawDate=2026-09-19'),
        isTrue,
      );
    });

    test('check ticket is a pushed utility page, not a tab', () {
      expect(isShellTabRoute('/check-ticket'), isFalse);
      expect(isShellTabRoute('/check-ticket?date=2026-09-19'), isFalse);
    });

    test('returns false for pushed sub-pages and root navigator routes', () {
      expect(
        isShellTabRoute('/profile/orders/12345678-1234-1234-1234-123456789abc'),
        isFalse,
      );
      expect(isShellTabRoute('/profile/refunds/456'), isFalse);
      expect(isShellTabRoute('/profile/prize-payouts/789'), isFalse);
      expect(isShellTabRoute('/profile/complaints/101'), isFalse);
      expect(isShellTabRoute('/chat'), isFalse);
    });
  });

  group('Navigation safety checks', () {
    test(
      'notification_view uses context.go for shell tab routes and context.push for detail routes',
      () {
        final viewSource = _readSource(
          'lib/src/features/notifications/presentation/views/notification_view.dart',
        );

        expect(viewSource, contains('if (isShellTabRoute(route)) {'));
        expect(viewSource, contains('context.go(route);'));
        expect(viewSource, contains('context.push(route);'));
      },
    );

    test(
      'chat_screen navigates to buyTicket using context.go to prevent duplicate GlobalKey crash',
      () {
        final chatSource = _readSource(
          'lib/src/features/chat/presentation/views/chat_screen.dart',
        );

        expect(
          chatSource,
          contains("context.go('\${AppRoute.buyTicket.path}?\$query');"),
        );
        expect(
          chatSource,
          isNot(
            contains("context.push('\${AppRoute.buyTicket.path}?\$query');"),
          ),
        );
      },
    );
  });
}
