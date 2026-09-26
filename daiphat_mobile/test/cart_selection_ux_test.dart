import 'package:flutter/material.dart';
import 'package:toastification/toastification.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/features/cart/domain/entities/cart_item.dart';
import 'package:daiphat_mobile/src/features/cart/presentation/views/cart_view.dart';
import 'package:daiphat_mobile/src/features/cart/presentation/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/shared/utils/app_dialog.dart';

class _MockCartNotifier extends CartNotifier {
  _MockCartNotifier(this._items);
  final List<CartItemData> _items;

  @override
  List<CartItemData> build() => _items;

  @override
  void removeAtIndex(int index) {
    if (index >= 0 && index < state.length) {
      final next = List<CartItemData>.from(state)..removeAt(index);
      state = next;
    }
  }

  @override
  void removeAtIndexes(Iterable<int> indexes) {
    final sorted = indexes.toList()..sort((a, b) => b.compareTo(a));
    final next = List<CartItemData>.from(state);
    for (final i in sorted) {
      if (i >= 0 && i < next.length) {
        next.removeAt(i);
      }
    }
    state = next;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AppDialog util tests', () {
    testWidgets('AppDialog.confirm displays title, message, and returns true on confirm', (
      tester,
    ) async {
      bool? dialogResult;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () async {
                  dialogResult = await AppDialog.confirm(
                    context,
                    title: 'Xác nhận xóa vé',
                    message: 'Bạn có chắc muốn xóa vé số 123456 khỏi giỏ hàng?',
                    confirmLabel: 'Xóa',
                    isDestructive: true,
                  );
                },
                child: const Text('Open Dialog'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Dialog'));
      await tester.pumpAndSettle();

      expect(find.text('Xác nhận xóa vé'), findsOneWidget);
      expect(
        find.text('Bạn có chắc muốn xóa vé số 123456 khỏi giỏ hàng?'),
        findsOneWidget,
      );
      expect(find.text('Hủy'), findsOneWidget);
      expect(find.text('Xóa'), findsOneWidget);

      await tester.tap(find.text('Xóa'));
      await tester.pumpAndSettle();

      expect(dialogResult, isTrue);
      expect(find.text('Xác nhận xóa vé'), findsNothing);
    });

    testWidgets('AppDialog.confirm returns false on cancel', (tester) async {
      bool? dialogResult;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () async {
                  dialogResult = await AppDialog.confirm(
                    context,
                    title: 'Xác nhận xóa',
                    message: 'Bạn có chắc?',
                    confirmLabel: 'Xóa',
                  );
                },
                child: const Text('Open Dialog'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Dialog'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Hủy'));
      await tester.pumpAndSettle();

      expect(dialogResult, isFalse);
    });
  });

  group('Cart Selection UX tests', () {
    final testItems = <CartItemData>[
      const CartItemData(
        lotteryTicketId: 101,
        number: '123456',
        province: 'TP. Hồ Chí Minh',
        unitPrice: 10000,
        quantity: 1,
        logoText: 'TP.HCM',
        dateLabel: 'Hôm nay',
        drawTime: '16:15',
        kyHieu: '12A',
        drawDateIso: '2099-12-31T16:15:00',
      ),
      const CartItemData(
        lotteryTicketId: 102,
        number: '654321',
        province: 'Đồng Nai',
        unitPrice: 10000,
        quantity: 2,
        logoText: 'Đồng Nai',
        dateLabel: 'Hôm nay',
        drawTime: '16:15',
        kyHieu: '12B',
        drawDateIso: '2099-12-31T16:15:00',
      ),
    ];

    testWidgets('When exactly 1 ticket is selected, clicking trash icon directly shows confirm modal', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            cartProvider.overrideWith(() => _MockCartNotifier(List.from(testItems))),
          ],
          child: const ToastificationWrapper(
            child: MaterialApp(home: CartView()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Select first item
      final firstCheckbox = find.bySemanticsLabel(
        'Chọn vé 123456 để thanh toán',
      );
      expect(firstCheckbox, findsOneWidget);
      await tester.tap(firstCheckbox);
      await tester.pumpAndSettle();

      // Tap top-right trash icon
      final trashBtn = find.byTooltip('Xóa nhiều');
      expect(trashBtn, findsOneWidget);
      await tester.tap(trashBtn);
      await tester.pumpAndSettle();

      // Directly shows modal confirmation without switching to selection mode
      expect(find.text('Xác nhận xóa vé'), findsOneWidget);
      expect(
        find.text('Bạn có chắc muốn xóa vé số 123456 (TP. Hồ Chí Minh) khỏi giỏ hàng?'),
        findsOneWidget,
      );

      // Confirm deletion
      await tester.tap(find.text('Xóa'));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 5));

      // 1 item removed, remaining 1
      expect(find.text('123456'), findsNothing);
      expect(find.text('654321'), findsOneWidget);
    });

    testWidgets('When multiple tickets are selected, clicking trash icon directly shows confirm modal for all', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            cartProvider.overrideWith(() => _MockCartNotifier(List.from(testItems))),
          ],
          child: const ToastificationWrapper(
            child: MaterialApp(home: CartView()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Select both items
      await tester.tap(find.bySemanticsLabel('Chọn vé 123456 để thanh toán'));
      await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsLabel('Chọn vé 654321 để thanh toán'));
      await tester.pumpAndSettle();

      // Tap trash icon
      await tester.tap(find.byTooltip('Xóa nhiều'));
      await tester.pumpAndSettle();

      // Shows modal confirmation for multiple items
      expect(find.text('Xóa sản phẩm'), findsOneWidget);
      expect(
        find.text('Bạn có muốn bỏ 2 sản phẩm đã chọn khỏi giỏ hàng không?'),
        findsOneWidget,
      );

      // Confirm deletion
      await tester.tap(find.text('Xóa'));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 5));

      // Both items removed -> Cart is empty
      expect(find.text('123456'), findsNothing);
      expect(find.text('654321'), findsNothing);
      expect(find.text('Giỏ hàng đang trống'), findsOneWidget);
    });

    testWidgets('When 0 tickets are selected, clicking trash icon switches to selection mode', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            cartProvider.overrideWith(() => _MockCartNotifier(List.from(testItems))),
          ],
          child: const ToastificationWrapper(
            child: MaterialApp(home: CartView()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Tap trash icon without selecting anything
      await tester.tap(find.byTooltip('Xóa nhiều'));
      await tester.pumpAndSettle();

      // Switches to selection mode
      expect(find.byTooltip('Đóng chọn'), findsOneWidget);
      expect(find.text('Chọn tất cả'), findsOneWidget);
    });

    testWidgets('When ticket quantity is 1, minus button is disabled', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            cartProvider.overrideWith(() => _MockCartNotifier(List.from(testItems))),
          ],
          child: const ToastificationWrapper(
            child: MaterialApp(home: CartView()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // First item quantity is 1
      expect(find.text('1'), findsWidgets);

      // Find minus button with semantics
      final minusButtons = find.bySemanticsLabel('Giảm số lượng');
      expect(minusButtons, findsWidgets);

      // Tap the first minus button
      await tester.tap(minusButtons.first);
      await tester.pumpAndSettle();

      // Quantity should still be 1 (not decreased or changed to delete mode)
      expect(find.text('1'), findsWidgets);
    });
  });
}
