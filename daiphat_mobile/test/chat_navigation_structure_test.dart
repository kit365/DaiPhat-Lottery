import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

String _readSource(String relativePath) =>
    File(relativePath).readAsStringSync();

void main() {
  test('chat is a root-level protected route', () {
    final routes = _readSource('lib/src/app/routing/app_routes.dart');
    final router = _readSource('lib/src/app/routing/app_router.dart');

    expect(routes, contains('chat,'));
    expect(routes, contains("case AppRoute.chat:\n        return '/chat';"));
    expect(
      routes,
      contains(
        'case AppRoute.notifications:\n'
        '      case AppRoute.chat:\n'
        '      case AppRoute.notificationSettings:',
      ),
    );
    expect(router, contains('path == AppRoute.chat.path'));
    expect(router, contains('case AppRoute.chat:'));
    expect(router, contains('return ChatScreen('));
  });

  test('every mobile chat entry uses the canonical chat route', () {
    final profile = _readSource(
      'lib/src/features/profile/presentation/views/profile_view.dart',
    );
    final orders = _readSource(
      'lib/src/features/profile/presentation/views/my_orders_view.dart',
    );

    expect(profile, contains('context.push(AppRoute.chat.path)'));
    expect(orders, contains('context.push(AppRoute.chat.path)'));
    expect(profile, isNot(contains('ChatScreen(')));
    expect(orders, isNot(contains('ChatScreen(')));
  });

  test('chat surface excludes unimplemented actions', () {
    final chat = _readSource(
      'lib/src/features/chat/presentation/views/chat_screen.dart',
    );

    expect(chat, isNot(contains('Icons.more_horiz_rounded')));
    expect(chat, isNot(contains("'Thông tin'")));
  });

  test('official account details are disclosed from the header avatar', () {
    final chat = _readSource(
      'lib/src/features/chat/presentation/views/chat_screen.dart',
    );

    expect(chat, contains("label: 'Xem thông tin Đại Phát Official'"));
    expect(chat, contains('onTap: onOpenOfficialProfile'));
    expect(chat, contains('const _OfficialProfileSheet()'));
    expect(chat, contains('itemCount: chatState.visibleMessages.length,'));
  });
}
