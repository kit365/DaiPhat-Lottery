import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:daiphat_mobile/src/features/auth/data/models/auth_token.dart';
import 'package:daiphat_mobile/src/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:daiphat_mobile/src/features/auth/data/services/auth_api_service.dart';
import 'package:daiphat_mobile/src/features/auth/domain/entities/user.dart';
import 'package:daiphat_mobile/src/features/cart/data/mappers/cart_item_mapper.dart';
import 'package:daiphat_mobile/src/features/cart/domain/entities/cart_item.dart';
import 'package:daiphat_mobile/src/features/cart/presentation/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/features/chat/data/models/chat_models.dart';
import 'package:daiphat_mobile/src/features/chat/data/repositories/chat_repository.dart';
import 'package:daiphat_mobile/src/features/chat/data/services/chat_api_service.dart';
import 'package:daiphat_mobile/src/features/chat/data/services/chat_websocket_service.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/viewmodels/chat_viewmodel.dart';
import 'package:daiphat_mobile/src/features/checkout/domain/repositories/transaction_repository.dart';
import 'package:daiphat_mobile/src/features/checkout/models/transaction_type.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/views/checkout_result_view.dart';
import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';
import 'package:daiphat_mobile/src/features/orders/domain/repositories/orders_repository.dart';
import 'package:daiphat_mobile/src/features/orders/presentation/providers/orders_providers.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/viewmodels/buy_ticket_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import 'package:daiphat_mobile/src/shared/storage/auth_token_storage.dart';

class _ReviewHttpAdapter implements HttpClientAdapter {
  final List<RequestOptions> requests = [];
  bool timeoutRefresh = false;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    if (options.path == '/auth/refresh-token' && timeoutRefresh) {
      throw DioException(
        requestOptions: options,
        type: DioExceptionType.connectionTimeout,
      );
    }
    if (options.path.endsWith('/lottery-stations/schedule')) {
      return _jsonResponse({
        'success': true,
        'data': [
          {'stationId': 7, 'name': 'Hồ Chí Minh'},
        ],
      });
    }
    if (options.path.endsWith('/lottery-tickets/public')) {
      return _jsonResponse({
        'success': true,
        'data': {
          'items': <Object>[],
          'pageNumber': 1,
          'pageSize': 15,
          'totalElements': 0,
          'totalPages': 1,
          'isLast': true,
        },
      });
    }
    return _jsonResponse({'message': 'expired'}, statusCode: 401);
  }

  ResponseBody _jsonResponse(Object body, {int statusCode = 200}) {
    return ResponseBody.fromString(
      jsonEncode(body),
      statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _PreviousCheckoutNotifier extends CheckoutNotifier {
  @override
  CheckoutState build() => const CheckoutState(
    name: 'Review User',
    phone: '0901234567',
    expectedPickupAt: '2026-09-06T08:00:00',
    selectedReceiveType: 'COUNTER_PICKUP',
    selectedTransactionType: 'ONLINE',
    checkoutUrl: 'https://pay.payos.vn/web/previous-order',
    orderId: 'previous-order',
  );
}

class _PendingCheckoutNotifier extends CheckoutNotifier {
  @override
  CheckoutState build() => const CheckoutState(
    name: 'Review User',
    phone: '0901234567',
    expectedPickupAt: '2026-09-06T08:00:00',
    selectedReceiveType: 'COUNTER_PICKUP',
    selectedTransactionType: 'ONLINE',
    pendingPaymentOrderId: 'pending-order',
    pendingPaymentOrderCode: 'DP-PENDING',
    pendingPaymentTransactionId: 41,
  );
}

class _ValidCheckoutNotifier extends CheckoutNotifier {
  @override
  CheckoutState build() => const CheckoutState(
    name: 'Review User',
    phone: '0901234567',
    expectedPickupAt: '2026-09-06T08:00:00',
    selectedReceiveType: 'COUNTER_PICKUP',
    selectedTransactionType: 'ONLINE',
  );
}

class _UncertainOrdersRepository implements OrdersRepository {
  int createCalls = 0;

  @override
  Future<OrderResponse> createOnlineOrder(
    CreateOnlineOrderRequest request,
  ) async {
    createCalls++;
    throw const ApiException('Không thể kết nối đến máy chủ.');
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeTransactionRepository implements TransactionRepository {
  int processCalls = 0;
  String syncStatus = 'PAID';

  @override
  Future<PaymentResult> processPayment({
    required String orderId,
    required ProcessPaymentRequest request,
  }) async {
    processCalls++;
    expect(orderId, 'pending-order');
    expect(request.transactionId, 41);
    return const PaymentResult(
      transactionId: 41,
      gateway: 'PAYOS',
      checkoutUrl: 'https://pay.payos.vn/web/retry',
      status: 'PENDING',
    );
  }

  @override
  Future<List<EnumOption>> getTransactionTypes() async => const [];

  @override
  Future<PendingPaymentCountdownResult> getPendingPaymentCountdown(
    String orderId,
  ) async => throw UnimplementedError();

  @override
  Future<OrderResponse> syncOnlinePayment(String orderId) async =>
      OrderResponse(
        id: orderId,
        orderCode: 'DP-PENDING',
        totalAmount: 10000,
        status: syncStatus,
      );
}

class _FakeAuthApiService extends AuthApiService {
  _FakeAuthApiService() : super(ApiClient(dio: Dio()));

  User nextUser = const User(
    id: 'user-a',
    username: 'user-a',
    accessToken: '',
    fullName: 'User A',
    phone: '0901234567',
  );

  @override
  Future<AuthToken> login(String username, String password) async =>
      const AuthToken(accessToken: 'token');

  @override
  Future<User> getCurrentUser() async => nextUser;

  @override
  Future<void> logout() async {}
}

class _FakeChatRepository implements ChatRepository {
  String token = 'token-a';
  int bootstrapCalls = 0;
  int clearConversationCalls = 0;

  @override
  Future<String?> readAccessToken() async => token;

  @override
  Future<bool> getAiStatus() async {
    bootstrapCalls++;
    return true;
  }

  @override
  Future<ConversationDetailModel?> getOpenConversation() async => null;

  @override
  Future<int?> readLastConversationId() async => null;

  @override
  Future<ChatTimelinePageModel> getTimeline({
    int limit = 30,
    String? beforeCreatedAt,
    int? beforeId,
  }) async => const ChatTimelinePageModel(items: [], hasMore: false);

  @override
  Future<void> connectWebSocket() async {}

  @override
  void subscribeInbox({
    required ChatSocketMessageHandler onMessage,
    required ChatConversationEventHandler onConversationEvent,
  }) {}

  @override
  Future<void> disconnectWebSocket() async {}

  @override
  Future<void> clearLastConversationId() async {
    clearConversationCalls++;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

const _normalCartItem = CartItemData(
  lotteryTicketId: 99,
  province: 'Bến Tre',
  dateLabel: '06/09/2026',
  drawTime: '16:15',
  kyHieu: 'BT',
  number: '123456',
  quantity: 2,
  unitPrice: 10000,
  logoText: 'BT',
  drawDateIso: '2026-09-06',
  maxStock: 2,
);

void main() {
  late Directory hiveDirectory;

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    hiveDirectory = await Directory.systemTemp.createTemp(
      'daiphat-risk-tests-',
    );
    Hive.init(hiveDirectory.path);
    await Hive.openBox('cartBox');
  });

  tearDown(() async {
    await Hive.box('cartBox').clear();
  });

  tearDownAll(() async {
    await Hive.close();
    await hiveDirectory.delete(recursive: true);
  });

  test('refresh timeout keeps the authenticated session', () async {
    final adapter = _ReviewHttpAdapter()..timeoutRefresh = true;
    final dio = Dio(BaseOptions(baseUrl: 'https://review.invalid'));
    dio.httpClientAdapter = adapter;
    final client = ApiClient(dio: dio)..setAccessToken('old-access-token');
    var expiredCalls = 0;
    client.onSessionExpired = () async => expiredCalls++;

    await expectLater(client.get('/protected'), throwsA(isA<ApiException>()));

    expect(expiredCalls, 0);
    expect(client.accessToken, 'old-access-token');
  });

  test('an early checkout rejection clears a previous payment URL', () async {
    final container = ProviderContainer(
      overrides: [
        apiClientProvider.overrideWithValue(ApiClient(dio: Dio())),
        checkoutProvider.overrideWith(_PreviousCheckoutNotifier.new),
      ],
    );
    addTearDown(container.dispose);

    expect(
      await container.read(checkoutProvider.notifier).submitOrder(),
      isFalse,
    );
    expect(container.read(checkoutProvider).checkoutUrl, isNull);
  });

  test('retrying payment reuses the pending order', () async {
    final client = ApiClient(dio: Dio())..setAccessToken('token');
    final transactions = _FakeTransactionRepository();
    final container = ProviderContainer(
      overrides: [
        apiClientProvider.overrideWithValue(client),
        transactionRepositoryProvider.overrideWithValue(transactions),
        checkoutProvider.overrideWith(_PendingCheckoutNotifier.new),
      ],
    );
    addTearDown(container.dispose);

    expect(
      await container.read(checkoutProvider.notifier).submitOrder(),
      isTrue,
    );
    expect(transactions.processCalls, 1);
    expect(
      container.read(checkoutProvider).checkoutUrl,
      'https://pay.payos.vn/web/retry',
    );
  });

  test(
    'an uncertain create response cannot create a duplicate order',
    () async {
      final client = ApiClient(dio: Dio())..setAccessToken('token');
      final orders = _UncertainOrdersRepository();
      final container = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWithValue(client),
          ordersRepositoryProvider.overrideWithValue(orders),
          checkoutItemsProvider.overrideWithValue([_normalCartItem]),
          checkoutProvider.overrideWith(_ValidCheckoutNotifier.new),
        ],
      );
      addTearDown(container.dispose);
      final notifier = container.read(checkoutProvider.notifier);

      expect(await notifier.submitOrder(), isFalse);
      expect(container.read(checkoutProvider).creationOutcomeUnknown, isTrue);
      expect(await notifier.submitOrder(), isFalse);
      expect(orders.createCalls, 1);
    },
  );

  test('cart removes only a confirmed pending purchase', () async {
    final box = Hive.box('cartBox');
    await box.put('items', [CartItemMapper.toMap(_normalCartItem)]);
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final notifier = container.read(cartProvider.notifier);

    notifier.recordPendingPurchase('order-1', [
      _normalCartItem.copyWith(quantity: 1),
    ]);

    expect(notifier.finalizePendingPurchase('other-order'), isFalse);
    expect(container.read(cartProvider).single.quantity, 2);
    expect(notifier.finalizePendingPurchase('order-1'), isTrue);
    expect(container.read(cartProvider).single.quantity, 1);
  });

  test('only confirmed paid order statuses finalize a payment', () {
    expect(isConfirmedPaidOrderStatus('PAID'), isTrue);
    expect(isConfirmedPaidOrderStatus('PREPARING'), isTrue);
    expect(isConfirmedPaidOrderStatus('PENDING_PICKUP'), isTrue);
    expect(isConfirmedPaidOrderStatus('COMPLETED'), isTrue);
    expect(isConfirmedPaidOrderStatus('PENDING_PAYMENT'), isFalse);
    expect(isConfirmedPaidOrderStatus('CANCELLED'), isFalse);
  });

  test(
    'legacy sample ticket is removed without deleting a real cart item',
    () async {
      final box = Hive.box('cartBox');
      await box.put('items', [
        CartItemMapper.toMap(
          const CartItemData(
            lotteryTicketId: 202608200001,
            province: 'Hồ Chí Minh',
            dateLabel: '20/08/2026',
            drawTime: '16:15',
            kyHieu: 'HCM',
            number: '208620',
            quantity: 1,
            unitPrice: 10000,
            logoText: 'HCM',
            drawDateIso: '2026-08-20',
          ),
        ),
        CartItemMapper.toMap(_normalCartItem),
      ]);
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final items = container.read(cartProvider);
      expect(items, hasLength(1));
      expect(items.single.lotteryTicketId, _normalCartItem.lotteryTicketId);
    },
  );

  test('changing chat access token starts a clean session', () async {
    final repository = _FakeChatRepository();
    final container = ProviderContainer(
      overrides: [chatRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
    final notifier = container.read(chatViewModelProvider.notifier);

    await notifier.bootstrap(isAuthenticated: true);
    await notifier.bootstrap(isAuthenticated: true);
    expect(repository.bootstrapCalls, 1);

    repository.token = 'token-b';
    await notifier.bootstrap(isAuthenticated: true);
    expect(repository.bootstrapCalls, 2);
    expect(repository.clearConversationCalls, 1);
  });

  test(
    'stored chat conversation ids are scoped to the signed-in user',
    () async {
      SharedPreferences.setMockInitialValues({
        'checkout.user_id': 'user-a',
        'chat:lastConversationId': 999,
      });
      final preferences = await SharedPreferences.getInstance();
      final client = ApiClient(dio: Dio());
      final repository = ChatRepository(
        apiService: ChatApiService(client),
        webSocketService: ChatWebSocketService(),
        readAccessToken: () async => null,
      );

      await repository.saveLastConversationId(11);
      await preferences.setString('checkout.user_id', 'user-b');
      expect(await repository.readLastConversationId(), isNull);
      await repository.saveLastConversationId(22);
      await preferences.setString('checkout.user_id', 'user-a');

      expect(await repository.readLastConversationId(), 11);
      expect(preferences.getInt('chat:lastConversationId'), isNull);
    },
  );

  test('a new account cannot inherit checkout contact data', () async {
    SharedPreferences.setMockInitialValues({});
    final preferences = await SharedPreferences.getInstance();
    final api = _FakeAuthApiService();
    final client = ApiClient(dio: Dio());
    final repository = AuthRepositoryImpl(
      api,
      client,
      AuthTokenStorage(preferences),
    );

    await repository.login('user-a', 'password');
    expect(preferences.getString('user_phone'), '0901234567');

    api.nextUser = const User(
      id: 'user-b',
      username: 'user-b',
      accessToken: '',
      fullName: 'User B',
    );
    await repository.login('user-b', 'password');

    expect(preferences.getString('checkout.user_id'), 'user-b');
    expect(preferences.getString('user_name'), 'User B');
    expect(preferences.getString('user_phone'), isNull);

    await repository.logout();
    expect(preferences.getString('checkout.user_id'), isNull);
    expect(preferences.getString('user_name'), isNull);
  });

  test('station selection is sent to the paginated ticket API', () async {
    final adapter = _ReviewHttpAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://review.invalid'));
    dio.httpClientAdapter = adapter;
    final container = ProviderContainer(
      overrides: [apiClientProvider.overrideWithValue(ApiClient(dio: dio))],
    );
    addTearDown(container.dispose);

    await container.read(buyTicketViewModelProvider.future);
    await container
        .read(buyTicketViewModelProvider.notifier)
        .selectProvince('Hồ Chí Minh');

    final ticketRequests = adapter.requests
        .where((request) => request.path.endsWith('/lottery-tickets/public'))
        .toList();
    expect(ticketRequests.last.queryParameters['stationId'], 7);
    expect(ticketRequests.last.queryParameters['page'], 1);
  });
}
