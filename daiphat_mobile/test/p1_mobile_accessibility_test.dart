import 'dart:ui' show CheckedState, Tristate;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:daiphat_mobile/src/features/auth/data/repositories/auth_repository.dart';
import 'package:daiphat_mobile/src/features/auth/data/services/auth_api_service.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/views/login_view.dart';
import 'package:daiphat_mobile/src/features/cart/models/cart_item_model.dart';
import 'package:daiphat_mobile/src/features/cart/presentation/views/cart_view.dart';
import 'package:daiphat_mobile/src/features/cart/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/features/checkout/data/system_config_service.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/views/checkout_view.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/widgets/checkout_datetime_picker.dart';
import 'package:daiphat_mobile/src/features/home/data/models/lottery_result.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/widgets/home_title_date.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/widgets/results_card.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/storage/auth_token_storage.dart';

class _FakeCheckoutNotifier extends CheckoutNotifier {
  @override
  CheckoutState build() => const CheckoutState(
    name: 'Người dùng thử',
    phone: '0900000000',
    expectedPickupAt: '2026-08-28T10:00:00',
    selectedReceiveType: 'COUNTER_PICKUP',
    selectedTransactionType: 'ONLINE',
  );

  @override
  Future<void> loadUserProfile() async {}

  @override
  void clearExpectedPickupAt() {}

  @override
  void setSelectedReceiveType(String value) {}

  @override
  void setSelectedTransactionType(String value) {}
}

class _FakeCartNotifier extends CartNotifier {
  _FakeCartNotifier(this.items);

  final List<CartItemData> items;

  @override
  List<CartItemData> build() => items;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  testWidgets('Google login is visibly unavailable and back has a label', (
    tester,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final apiClient = ApiClient(
      dio: Dio(BaseOptions(baseUrl: 'https://example.invalid')),
    );
    final viewModel = LoginViewModel(
      AuthRepository(
        AuthApiService(apiClient),
        apiClient,
        AuthTokenStorage(prefs),
      ),
    );

    await tester.pumpWidget(MaterialApp(home: LoginView(viewModel: viewModel)));
    await tester.pumpAndSettle();

    final googleButton = find.widgetWithText(
      OutlinedButton,
      'Đăng nhập với Google · Sắp ra mắt',
    );
    expect(googleButton, findsOneWidget);
    expect(tester.widget<OutlinedButton>(googleButton).onPressed, isNull);
    expect(find.bySemanticsLabel('Quay lại trang trước'), findsOneWidget);
  });

  testWidgets('date controls expose labelled interaction targets', (
    tester,
  ) async {
    var previousCalls = 0;
    var nextCalls = 0;
    final yesterday = DateTime.now().subtract(const Duration(days: 1));

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: HomeTitleDate(
            date: yesterday,
            onPickDate: () {},
            onPreviousDay: () => previousCalls++,
            onNextDay: () => nextCalls++,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final previous = find.bySemanticsLabel('Xem kết quả ngày trước');
    final next = find.bySemanticsLabel('Xem kết quả ngày tiếp theo');
    expect(previous, findsOneWidget);
    expect(next, findsOneWidget);
    expect(tester.getSize(previous).width, greaterThanOrEqualTo(44));
    expect(tester.getSize(previous).height, greaterThanOrEqualTo(44));

    await tester.tap(previous);
    await tester.tap(next);
    expect(previousCalls, 1);
    expect(nextCalls, 1);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: HomeTitleDate(
            date: DateTime.now(),
            onPickDate: () {},
            onPreviousDay: () {},
            onNextDay: () => nextCalls++,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(next);
    expect(nextCalls, 1);
  });

  testWidgets('number filters expose selected semantics and 44dp targets', (
    tester,
  ) async {
    final result = LotteryResult(
      id: 1,
      stationId: 2,
      province: 'Hà Nội',
      dateLabel: 'Hôm nay',
      dayOfWeek: 'Thứ Sáu',
      drawDate: DateTime.now(),
      status: 'COMPLETED',
      prizes: const LotteryPrizes(
        special: '123456',
        first: '12345',
        second: '1234',
        third: ['1234', '5678'],
        fourth: ['1234'],
        fifth: ['1234'],
        sixth: ['123'],
        seventh: ['12'],
        eighth: ['1'],
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: SingleChildScrollView(
          child: ResultsCard(
            results: [result],
            displayProvinces: const ['Hà Nội'],
            isSingleSel: true,
            selLabel: 'Hà Nội',
            isWaitingForResults: false,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.drag(
      find.byType(SingleChildScrollView).first,
      const Offset(0, -1000),
    );
    await tester.pump();

    final zero = find.byWidgetPredicate(
      (widget) =>
          widget is Semantics &&
          widget.properties.label == 'Lọc kết quả theo số 0',
    );
    expect(zero, findsOneWidget);
    expect(tester.getSize(zero).width, greaterThanOrEqualTo(44));
    expect(tester.getSize(zero).height, greaterThanOrEqualTo(44));
    expect(
      tester.getSemantics(zero).flagsCollection.isSelected == Tristate.isTrue,
      isFalse,
    );

    await tester.tap(zero);
    await tester.pump();
    expect(
      tester.getSemantics(zero).flagsCollection.isSelected == Tristate.isTrue,
      isTrue,
    );
  });

  testWidgets('checkout picker exposes info tooltip and labelled field', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          operatingHoursProvider.overrideWith(
            (ref) async => const SiteOperatingHours(),
          ),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: CheckoutDateTimePicker(
              value: null,
              onChanged: (_) {},
              onInfoTap: () {},
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.bySemanticsLabel('Chọn ngày và giờ nhận vé'), findsOneWidget);
    final info = find.bySemanticsLabel('Xem thông tin thời gian nhận vé');
    expect(info, findsOneWidget);
    expect(find.byTooltip('Thông tin thời gian nhận vé'), findsOneWidget);
    expect(tester.getSize(info).width, greaterThanOrEqualTo(44));
    expect(tester.getSize(info).height, greaterThanOrEqualTo(44));
  });

  testWidgets('checkout selectors expose checked radio semantics', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(800, 1800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final item = CartItemData(
      lotteryTicketId: 1,
      province: 'Hà Nội',
      dateLabel: 'Hôm nay',
      drawTime: '18:00',
      kyHieu: 'HN',
      number: '123456',
      quantity: 1,
      unitPrice: 10000,
      logoText: 'HN',
      maxStock: 5,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cartProvider.overrideWith(() => _FakeCartNotifier([item])),
          checkoutProvider.overrideWith(_FakeCheckoutNotifier.new),
          receiveTypesProvider.overrideWith((ref) async => defaultReceiveTypes),
          transactionTypesProvider.overrideWith(
            (ref) async => defaultTransactionTypes,
          ),
          operatingHoursProvider.overrideWith(
            (ref) async => const SiteOperatingHours(),
          ),
        ],
        child: const MaterialApp(home: CheckoutView()),
      ),
    );
    await tester.pumpAndSettle();
    final receive = find.bySemanticsLabel('Nhận tại quầy');
    expect(receive, findsOneWidget);

    final payment = find.bySemanticsLabel('Chuyển khoản');
    expect(payment, findsOneWidget);
    expect(
      tester.getSemantics(receive).flagsCollection.isChecked ==
          CheckedState.isTrue,
      isTrue,
    );
    expect(
      tester.getSemantics(payment).flagsCollection.isChecked ==
          CheckedState.isTrue,
      isTrue,
    );
  });

  testWidgets('cart keeps station name and exposes labelled controls at 44dp', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(332, 700));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final item = CartItemData(
      lotteryTicketId: 2,
      province: 'Đà Nẵng',
      dateLabel: 'Thứ 7, 29/08/2026 (Hôm nay)',
      drawTime: '17:00',
      kyHieu: 'DN',
      number: '654321',
      quantity: 2,
      unitPrice: 10000,
      logoText: 'DN',
      maxStock: 5,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cartProvider.overrideWith(() => _FakeCartNotifier([item])),
        ],
        child: const MaterialApp(home: CartView()),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    final station = find.text('Đà Nẵng');
    expect(station, findsOneWidget);
    expect(tester.getSize(station).width, greaterThan(0));
    expect(tester.takeException(), isNull);

    final minus = find.bySemanticsLabel('Giảm số lượng');
    final plus = find.bySemanticsLabel('Tăng số lượng');
    expect(minus, findsOneWidget);
    expect(plus, findsOneWidget);
    expect(tester.getSize(minus).width, greaterThanOrEqualTo(44));
    expect(tester.getSize(plus).height, greaterThanOrEqualTo(44));
  });
}
