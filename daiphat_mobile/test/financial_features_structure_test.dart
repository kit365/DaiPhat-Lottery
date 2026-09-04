import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';

String _read(String path) => File(path).readAsStringSync().replaceAll('\r\n', '\n');

void main() {
  test('financial feature routes keep their existing public paths', () {
    expect(AppRoute.refunds.path, '/profile/refunds');
    expect(AppRoute.refundDetail.path, '/profile/refunds/:id');
    expect(AppRoute.bankAccounts.path, '/profile/bank-accounts');
    expect(AppRoute.prizePayouts.path, '/profile/prize-payouts');
    expect(AppRoute.prizePayoutDetail.path, '/profile/prize-payouts/:id');
  });

  test('router resolves financial screens from feature-first locations', () {
    final router = _read('lib/src/app/routing/app_router.dart');

    expect(router, contains('features/refunds/presentation/views/refunds_view.dart'));
    expect(router, contains('features/bank_accounts/presentation/views/bank_accounts_view.dart'));
    expect(router, contains('features/prize_payouts/presentation/views/prize_payouts_view.dart'));
    expect(router, isNot(contains('features/profile/presentation/views/refunds_view.dart')));
  });

  test('financial presentation layers do not import their data layers', () {
    for (final feature in ['refunds', 'bank_accounts', 'prize_payouts']) {
      final presentation = Directory('lib/src/features/$feature/presentation');
      final sources = presentation
          .listSync(recursive: true)
          .whereType<File>()
          .where((file) => file.path.endsWith('.dart'));

      for (final source in sources) {
        expect(
          _read(source.path),
          isNot(contains('features/$feature/data/')),
          reason: source.path,
        );
      }
    }
  });
}
