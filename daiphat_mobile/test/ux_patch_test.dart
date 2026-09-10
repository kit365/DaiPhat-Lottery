import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/features/cart/models/cart_item_model.dart';
import 'package:daiphat_mobile/src/features/cart/presentation/views/cart_view.dart';
import 'package:daiphat_mobile/src/features/cart/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/shared/widgets/brand_scrollbar.dart';

class _MockCartNotifier extends CartNotifier {
  _MockCartNotifier(this._items);
  final List<CartItemData> _items;

  @override
  List<CartItemData> build() => _items;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('UX Patch 1: Cart selection and total calculation', () {
    testWidgets('Cart defaults to unselected and displays "Đã chọn X/Y vé"', (
      tester,
    ) async {
      final items = <CartItemData>[
        const CartItemData(
          lotteryTicketId: 101,
          number: '123456',
          province: 'TP. Hồ Chí Minh',
          unitPrice: 10000,
          quantity: 2,
          logoText: 'TP.HCM',
          dateLabel: 'Hôm nay',
          drawTime: '16:15',
          kyHieu: '12A',
        ),
        const CartItemData(
          lotteryTicketId: 102,
          number: '654321',
          province: 'Đồng Nai',
          unitPrice: 10000,
          quantity: 1,
          logoText: 'Đồng Nai',
          dateLabel: 'Hôm nay',
          drawTime: '16:15',
          kyHieu: '12B',
        ),
      ];

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            cartProvider.overrideWith(() => _MockCartNotifier(items)),
          ],
          child: const MaterialApp(home: CartView()),
        ),
      );
      await tester.pump();

      // Total tickets is 3 (2 + 1)
      expect(find.text('Đã chọn 0/3 vé'), findsOneWidget);
      expect(find.text('Chọn ít nhất một vé để thanh toán'), findsOneWidget);
    });
  });

  group('UX Patch 5: Brand scrollbar platform behavior', () {
    testWidgets('Mobile platform uses dynamic non-fixed track', (tester) async {
      final controller = ScrollController();
      await tester.pumpWidget(
        Theme(
          data: ThemeData(platform: TargetPlatform.iOS),
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: BrandScrollbar(
              controller: controller,
              child: SingleChildScrollView(
                controller: controller,
                child: const SizedBox(height: 1000),
              ),
            ),
          ),
        ),
      );

      final rawScrollbar = tester.widget<RawScrollbar>(
        find.byType(RawScrollbar),
      );
      expect(rawScrollbar.thumbVisibility, isNull);
      expect(rawScrollbar.trackVisibility, isFalse);
    });

    testWidgets('Desktop platform uses fixed scrollbar with track', (
      tester,
    ) async {
      final controller = ScrollController();
      await tester.pumpWidget(
        Theme(
          data: ThemeData(platform: TargetPlatform.macOS),
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: BrandScrollbar(
              controller: controller,
              child: SingleChildScrollView(
                controller: controller,
                child: const SizedBox(height: 1000),
              ),
            ),
          ),
        ),
      );

      final rawScrollbar = tester.widget<RawScrollbar>(
        find.byType(RawScrollbar),
      );
      expect(rawScrollbar.thumbVisibility, isTrue);
      expect(rawScrollbar.trackVisibility, isTrue);
    });
  });
}
