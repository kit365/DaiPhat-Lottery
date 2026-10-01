import 'package:daiphat_mobile/src/features/cart/domain/entities/cart_item.dart';
import 'package:daiphat_mobile/src/features/cart/presentation/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/features/chat/domain/entities/chat_models.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/viewmodels/chat_viewmodel.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/views/chat_screen.dart';
import 'package:daiphat_mobile/src/features/chat/utils/chat_message_mapper.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeChatViewModel extends ChatViewModel {
  _FakeChatViewModel(this._state);

  final ChatState _state;

  @override
  ChatState build() => _state;

  @override
  Future<void> bootstrap({required bool isAuthenticated}) async {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('suggested ticket card renders add to cart button and so dep badge', (
    tester,
  ) async {
    const ticket = SuggestedTicketModel(
      id: 101,
      numbers: '390001',
      stationId: 12,
      stationName: 'Vũng Tàu',
      drawDate: '2026-09-29',
      price: 10000,
      quantity: 2,
      isBeautiful: true,
    );

    const message = UiChatMessage(
      id: 'msg-1',
      isUser: false,
      text: 'Dưới đây là 5 vé đang bán cho kỳ quay sắp tới dành cho quý khách:',
      timeLabel: '09:06',
      variant: ChatMessageVariant.ticketSuggest,
      suggestedTickets: [ticket],
    );

    const chatState = ChatState(
      isAuthenticated: true,
      timelineMessages: [message],
      showWelcome: false,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          chatViewModelProvider.overrideWith(() => _FakeChatViewModel(chatState)),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: ChatScreen(isAuthenticated: true, isActive: true),
          ),
        ),
      ),
    );
    await tester.pump();

    // Verify ticket number and badge
    expect(find.text('390001'), findsOneWidget);
    expect(find.text('Số đẹp'), findsOneWidget);
    expect(find.text('Vũng Tàu'), findsOneWidget);
    expect(find.text(AppFormatters.formatCurrency(10000)), findsOneWidget);

    // Verify Add-to-Cart button and Buy-Now button
    final addToCartBtn = find.byTooltip('Thêm vào giỏ hàng');
    expect(addToCartBtn, findsOneWidget);
    expect(find.text('Mua ngay'), findsOneWidget);

    // Tap Add to Cart once (quantity 2 -> 1 left)
    await tester.tap(addToCartBtn);
    await tester.pump();

    // Add to cart button is still visible because 1 ticket remains
    expect(find.byTooltip('Thêm vào giỏ hàng'), findsOneWidget);

    // Tap Add to Cart second time (quantity reaches max stock 2 -> 0 left)
    await tester.tap(find.byTooltip('Thêm vào giỏ hàng'));
    await tester.pump();

    // Add to cart button MUST now be hidden automatically!
    expect(find.byTooltip('Thêm vào giỏ hàng'), findsNothing);
    expect(find.text('Mua ngay'), findsOneWidget);
  });

  testWidgets('suggested ticket card hides add-to-cart button when initial stock is 0 or already in cart', (
    tester,
  ) async {
    const ticket = SuggestedTicketModel(
      id: 202,
      numbers: '701032',
      stationId: 5,
      stationName: 'Bến Tre',
      drawDate: '2026-09-29',
      price: 10000,
      quantity: 1,
    );

    const message = UiChatMessage(
      id: 'msg-2',
      isUser: false,
      text: 'Gợi ý vé:',
      timeLabel: '09:07',
      variant: ChatMessageVariant.ticketSuggest,
      suggestedTickets: [ticket],
    );

    const chatState = ChatState(
      isAuthenticated: true,
      timelineMessages: [message],
      showWelcome: false,
    );

    const initialCartItem = CartItemData(
      lotteryTicketId: 202,
      province: 'Bến Tre',
      dateLabel: '29/09/2026',
      drawTime: '',
      kyHieu: '',
      number: '701032',
      quantity: 1,
      unitPrice: 10000,
      logoText: 'Bến Tre',
      maxStock: 1,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          chatViewModelProvider.overrideWith(() => _FakeChatViewModel(chatState)),
          cartProvider.overrideWith(() => _PreloadedCartNotifier([initialCartItem])),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: ChatScreen(isAuthenticated: true, isActive: true),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('701032'), findsOneWidget);
    expect(find.text('Mua ngay'), findsOneWidget);
    // Because 1/1 is already in cart, Add to Cart button is hidden automatically
    expect(find.byTooltip('Thêm vào giỏ hàng'), findsNothing);
  });
}

class _PreloadedCartNotifier extends CartNotifier {
  _PreloadedCartNotifier(this._initial);

  final List<CartItemData> _initial;

  @override
  List<CartItemData> build() => _initial;
}
