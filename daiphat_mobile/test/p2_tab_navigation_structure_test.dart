import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

String _readSource(String relativePath) =>
    File(relativePath).readAsStringSync();

class _CounterBranch extends StatefulWidget {
  const _CounterBranch(this.name);

  final String name;

  @override
  State<_CounterBranch> createState() => _CounterBranchState();
}

class _CounterBranchState extends State<_CounterBranch> {
  var _count = 0;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text('${widget.name}: $_count'),
      TextButton(
        onPressed: () => setState(() => _count++),
        child: Text('Increment ${widget.name}'),
      ),
    ],
  );
}

void main() {
  testWidgets('indexed shell retains inactive branch state', (tester) async {
    final router = GoRouter(
      initialLocation: '/first',
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) => Scaffold(
            body: navigationShell,
            bottomNavigationBar: Row(
              children: [
                TextButton(
                  onPressed: () => navigationShell.goBranch(0),
                  child: const Text('First'),
                ),
                TextButton(
                  onPressed: () => navigationShell.goBranch(1),
                  child: const Text('Second'),
                ),
              ],
            ),
          ),
          branches: [
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: '/first',
                  builder: (context, state) => const _CounterBranch('first'),
                ),
              ],
            ),
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: '/second',
                  builder: (context, state) => const _CounterBranch('second'),
                ),
              ],
            ),
          ],
        ),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.tap(find.text('Increment first'));
    await tester.pump();
    await tester.tap(find.text('Second'));
    await tester.pump();
    await tester.tap(find.text('First'));
    await tester.pump();

    expect(find.text('first: 1'), findsOneWidget);
  });

  test('router uses five persistent branches in the bottom-nav order', () {
    final router = _readSource('lib/src/app/routing/app_router.dart');

    expect(router, contains('StatefulShellRoute.indexedStack('));
    final branches = router.substring(router.indexOf('branches: ['));
    expect(RegExp(r'StatefulShellBranch\(').allMatches(branches).length, 5);
    expect(
      branches.indexOf('AppRoute.buyTicket') <
              branches.indexOf('AppRoute.checkTicket') &&
          branches.indexOf('AppRoute.checkTicket') <
              branches.indexOf('AppRoute.home') &&
          branches.indexOf('AppRoute.home') <
              branches.indexOf('AppRoute.notifications') &&
          branches.indexOf('AppRoute.notifications') <
              branches.indexOf('AppRoute.profile'),
      isTrue,
    );
    expect(router, contains('showBackButton: false'));
    expect(router, contains('path == AppRoute.profile.path'));
  });

  test('main layout selects branches without a PageView side channel', () {
    final layout = _readSource(
      'lib/src/features/shell/presentation/views/main_layout.dart',
    );

    expect(layout, contains('final StatefulNavigationShell navigationShell;'));
    expect(layout, contains('body: navigationShell'));
    expect(layout, contains('navigationShell.goBranch(index);'));
    expect(layout, contains('canPop: navigationShell.currentIndex == 2'));
    expect(layout, contains('navigationShell.goBranch(2);'));
    expect(layout, isNot(contains('PageView(')));
    expect(layout, isNot(contains('PageController')));
  });

  test('all notification entry points select the canonical tab', () {
    final service = _readSource(
      'lib/src/shared/services/notification_service.dart',
    );
    final profile = _readSource(
      'lib/src/features/profile/presentation/views/profile_view.dart',
    );
    final view = _readSource(
      'lib/src/features/notifications/presentation/views/notification_view.dart',
    );

    expect(service, contains('context.go(AppRoute.notifications.path);'));
    expect(profile, contains('context.go(AppRoute.notifications.path),'));
    expect(view, contains('final bool showBackButton;'));
    expect(view, contains('automaticallyImplyLeading: false'));
  });
}
