import 'dart:ui' show Tristate;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:daiphat_mobile/src/features/bank_accounts/presentation/widgets/bank_account_name_input_formatter.dart';
import 'package:daiphat_mobile/src/features/cart/domain/entities/cart_item.dart';
import 'package:daiphat_mobile/src/features/cart/presentation/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/features/cart/presentation/views/cart_view.dart';
import 'package:daiphat_mobile/src/features/chat/domain/entities/chat_models.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/viewmodels/chat_viewmodel.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/views/chat_screen.dart';
import 'package:daiphat_mobile/src/features/chat/utils/chat_message_mapper.dart';
import 'package:daiphat_mobile/src/features/home/domain/entities/lottery_result.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/widgets/results_card.dart';

class _StaticCartNotifier extends CartNotifier {
  _StaticCartNotifier(this.initialItems);

  final List<CartItemData> initialItems;

  @override
  List<CartItemData> build() => initialItems;
}

class _StaticChatViewModel extends ChatViewModel {
  _StaticChatViewModel(this.initialState);

  final ChatState initialState;

  @override
  ChatState build() => initialState;

  @override
  Future<void> bootstrap({required bool isAuthenticated}) async {}
}

LotteryResult _lotteryResult(int index, String province, String special) {
  return LotteryResult(
    id: index,
    stationId: index,
    province: province,
    dateLabel: 'Hôm qua',
    dayOfWeek: 'Thứ Hai',
    drawDate: DateTime(2026, 9, 14),
    status: 'COMPLETED',
    prizes: LotteryPrizes(
      special: special,
      first: '500771',
      second: '510354',
      third: const ['216806'],
      fourth: const ['035075'],
      fifth: const ['5835'],
      sixth: const ['5554'],
      seventh: const ['213'],
      eighth: const ['66'],
    ),
  );
}

void main() {
  test('bank account name is uppercased and accented input is rejected', () {
    const formatter = BankAccountNameInputFormatter();
    const empty = TextEditingValue();

    final uppercase = formatter.formatEditUpdate(
      empty,
      const TextEditingValue(
        text: 'nguyen van a',
        selection: TextSelection.collapsed(offset: 12),
      ),
    );
    expect(uppercase.text, 'NGUYEN VAN A');

    final rejected = formatter.formatEditUpdate(
      uppercase,
      const TextEditingValue(
        text: 'NGUYỄN VAN A',
        selection: TextSelection.collapsed(offset: 12),
      ),
    );
    expect(rejected, uppercase);
  });

  testWidgets('cart minus control is disabled when quantity is one', (
    tester,
  ) async {
    const item = CartItemData(
      lotteryTicketId: 101,
      province: 'Cà Mau',
      dateLabel: '14/09/2099',
      drawTime: '16:15',
      kyHieu: 'CM',
      number: '123456',
      quantity: 1,
      unitPrice: 10000,
      logoText: 'CM',
      drawDateIso: '2099-09-14',
      maxStock: 5,
    );

    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cartProvider.overrideWith(() => _StaticCartNotifier(const [item])),
        ],
        child: const MaterialApp(home: CartView()),
      ),
    );
    await tester.pump();

    final minus = find.bySemanticsLabel('Giảm số lượng');
    expect(minus, findsOneWidget);
    expect(
      tester.getSemantics(minus).flagsCollection.isEnabled,
      Tristate.isFalse,
    );

    await tester.tap(minus);
    await tester.pump();
    expect(find.text('1'), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('six-digit home results remain on one aligned line', (
    tester,
  ) async {
    const provinces = [
      'Cà Mau 1',
      'Cà Mau 2',
      'Đồng Tháp 1',
      'TP. Hồ Chí Minh',
      'Đồng Tháp 2',
    ];
    final specials = ['918735', '999035', '570916', '250027', '065442'];
    final results = <LotteryResult>[
      for (var index = 0; index < provinces.length; index += 1)
        _lotteryResult(index + 1, provinces[index], specials[index]),
    ];

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 375,
            child: SingleChildScrollView(
              child: ResultsCard(
                results: results,
                displayProvinces: provinces,
                isSingleSel: false,
                selLabel: null,
                isWaitingForResults: false,
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    for (final special in specials) {
      final text = tester.widget<Text>(find.text(special));
      expect(text.maxLines, 1);
      expect(text.softWrap, isFalse);
    }
    expect(tester.takeException(), isNull);
  });

  testWidgets('chat ticket suggestions do not overflow on a narrow screen', (
    tester,
  ) async {
    const message = UiChatMessage(
      id: 'suggestion',
      isUser: false,
      text: 'Mình gợi ý vé phù hợp cho bạn:',
      timeLabel: '15:30',
      variant: ChatMessageVariant.ticketSuggest,
      suggestedTickets: [
        SuggestedTicketModel(
          id: 1,
          numbers: '12345678901234567890',
          stationId: 1,
          stationName: 'Tên đài xổ số rất dài để kiểm tra giao diện',
          drawDate: '2026-09-16',
          price: 999999999,
        ),
      ],
    );
    const state = ChatState(
      isAuthenticated: true,
      timelineMessages: [message],
      showWelcome: false,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          chatViewModelProvider.overrideWith(() => _StaticChatViewModel(state)),
        ],
        child: MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(
              size: Size(320, 640),
              textScaler: TextScaler.linear(1.3),
            ),
            child: const SizedBox(
              width: 320,
              height: 640,
              child: ChatScreen(isAuthenticated: true, isActive: true),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Mua ngay'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
