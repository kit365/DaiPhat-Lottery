import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'package:daiphat_mobile/firebase_options.dart';
import 'package:daiphat_mobile/src/app/app.dart';
import 'package:daiphat_mobile/src/shared/config/firebase_config.dart';
import 'package:daiphat_mobile/src/app/dependencies/app_dependencies.dart';
import 'package:daiphat_mobile/src/shared/network/api_config.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import 'package:daiphat_mobile/src/shared/services/notification_service.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/features/checkout/data/transaction_service.dart';
import 'package:daiphat_mobile/src/features/checkout/data/repositories/transaction_repository_impl.dart';
import 'package:daiphat_mobile/src/features/orders/data/datasources/order_remote_data_source.dart';
import 'package:daiphat_mobile/src/features/orders/data/repositories/orders_repository_impl.dart';
import 'package:daiphat_mobile/src/features/orders/presentation/providers/orders_providers.dart';
import 'package:daiphat_mobile/src/features/tickets/data/datasources/purchased_tickets_remote_data_source.dart';
import 'package:daiphat_mobile/src/features/tickets/data/repositories/purchased_tickets_repository_impl.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/providers/purchased_tickets_providers.dart';
import 'package:daiphat_mobile/src/features/profile/data/bank_account_service.dart';
import 'package:daiphat_mobile/src/features/profile/data/prize_payout_service.dart';
import 'package:daiphat_mobile/src/features/profile/data/refund_service.dart';
import 'package:daiphat_mobile/src/features/profile/data/support_ticket_service.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/providers/profile_providers.dart';
import 'package:daiphat_mobile/src/features/notifications/data/services/notification_setting_service.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/providers/notification_providers.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  debugPrint('Handling a background message: ${message.messageId}');
}

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  debugPrint('API base URL: ${ApiConfig.baseUrl}');

  if (isFirebaseConfigured()) {
    try {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    } catch (e) {
      debugPrint('Firebase init warning/error (running without push notifications): $e');
    }
  }

  try {
    await NotificationService().init();
  } catch (e) {
    debugPrint('NotificationService init warning/error: $e');
  }

  try {
    await Hive.initFlutter();
    await Hive.openBox('cartBox');
  } catch (e) {
    debugPrint('Hive init warning/error: $e');
  }

  final dependencies = await AppDependencies.create();

  final orderService = OrderService(dependencies.apiClient);
  final transactionService = TransactionService(dependencies.apiClient);
  final ordersRepository = OrdersRepositoryImpl(orderService);
  final purchasedTicketsDataSource = PurchasedTicketsRemoteDataSource(
    dependencies.apiClient,
  );
  final purchasedTicketsRepository = PurchasedTicketsRepositoryImpl(
    purchasedTicketsDataSource,
  );
  final transactionRepository = TransactionRepositoryImpl(transactionService);
  final prizePayoutService = PrizePayoutService(dependencies.apiClient);
  final bankAccountService = BankAccountService(dependencies.apiClient);
  final refundService = RefundService(dependencies.apiClient);
  final supportTicketService = SupportTicketService(dependencies.apiClient);
  final notificationSettingService = NotificationSettingService(
    dependencies.apiClient,
  );

  runApp(
    ProviderScope(
      overrides: [
        apiClientProvider.overrideWithValue(dependencies.apiClient),
        orderServiceProvider.overrideWithValue(orderService),
        transactionServiceProvider.overrideWithValue(transactionService),
        ordersRepositoryProvider.overrideWithValue(ordersRepository),
        purchasedTicketsRepositoryProvider.overrideWithValue(
          purchasedTicketsRepository,
        ),
        transactionRepositoryProvider.overrideWithValue(transactionRepository),
        prizePayoutServiceProvider.overrideWithValue(prizePayoutService),
        bankAccountServiceProvider.overrideWithValue(bankAccountService),
        refundServiceProvider.overrideWithValue(refundService),
        supportTicketServiceProvider.overrideWithValue(supportTicketService),
        notificationSettingServiceProvider.overrideWithValue(
          notificationSettingService,
        ),
        notificationViewModelProvider.overrideWithValue(
          dependencies.notificationViewModel,
        ),
      ],
      child: DaiPhatMobileApp(router: dependencies.router),
    ),
  );
}
