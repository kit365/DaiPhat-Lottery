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
import 'package:daiphat_mobile/src/features/auth/presentation/providers/auth_providers.dart';
import 'package:daiphat_mobile/src/features/blog/data/repositories/blog_repository_impl.dart';
import 'package:daiphat_mobile/src/features/blog/data/services/blog_api_service.dart';
import 'package:daiphat_mobile/src/features/blog/presentation/viewmodels/blog_viewmodel.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/features/checkout/data/transaction_service.dart';
import 'package:daiphat_mobile/src/features/checkout/data/repositories/transaction_repository_impl.dart';
import 'package:daiphat_mobile/src/features/home/data/repositories/home_lottery_repository_impl.dart';
import 'package:daiphat_mobile/src/features/home/data/repositories/ticket_check_repository_impl.dart';
import 'package:daiphat_mobile/src/features/home/data/services/home_lottery_api_service.dart';
import 'package:daiphat_mobile/src/features/home/data/services/ticket_check_api_service.dart';
import 'package:daiphat_mobile/src/features/home/presentation/viewmodels/home_viewmodel.dart';
import 'package:daiphat_mobile/src/features/home/presentation/viewmodels/ticket_check_viewmodel.dart';
import 'package:daiphat_mobile/src/features/orders/data/datasources/order_remote_data_source.dart';
import 'package:daiphat_mobile/src/features/orders/data/repositories/orders_repository_impl.dart';
import 'package:daiphat_mobile/src/features/orders/presentation/providers/orders_providers.dart';
import 'package:daiphat_mobile/src/features/tickets/data/datasources/purchased_tickets_remote_data_source.dart';
import 'package:daiphat_mobile/src/features/tickets/data/repositories/purchased_tickets_repository_impl.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/providers/purchased_tickets_providers.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/data/datasources/bank_account_remote_data_source.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/data/repositories/bank_accounts_repository_impl.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/presentation/providers/bank_accounts_providers.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/data/datasources/prize_payout_remote_data_source.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/data/repositories/prize_payouts_repository_impl.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/presentation/providers/prize_payouts_providers.dart';
import 'package:daiphat_mobile/src/features/refunds/data/datasources/refund_remote_data_source.dart';
import 'package:daiphat_mobile/src/features/refunds/data/repositories/refunds_repository_impl.dart';
import 'package:daiphat_mobile/src/features/refunds/presentation/providers/refunds_providers.dart';
import 'package:daiphat_mobile/src/features/schedule/data/repositories/schedule_repository_impl.dart';
import 'package:daiphat_mobile/src/features/schedule/data/services/schedule_api_service.dart';
import 'package:daiphat_mobile/src/features/schedule/presentation/providers/schedule_providers.dart';
import 'package:daiphat_mobile/src/features/profile/data/repositories/support_ticket_repository_impl.dart';
import 'package:daiphat_mobile/src/features/profile/data/support_ticket_service.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/providers/profile_providers.dart';
import 'package:daiphat_mobile/src/features/notifications/data/repositories/notification_repository_impl.dart';
import 'package:daiphat_mobile/src/features/notifications/data/repositories/notification_settings_repository_impl.dart';
import 'package:daiphat_mobile/src/features/notifications/data/services/notification_api_service.dart';
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
  final prizePayoutsRepository = PrizePayoutsRepositoryImpl(
    PrizePayoutRemoteDataSource(dependencies.apiClient),
  );
  final bankAccountsRepository = BankAccountsRepositoryImpl(
    BankAccountRemoteDataSource(dependencies.apiClient),
  );
  final refundsRepository = RefundsRepositoryImpl(
    RefundRemoteDataSource(dependencies.apiClient),
  );
  final scheduleRepository = ScheduleRepositoryImpl(
    ScheduleApiService(dependencies.apiClient),
  );
  final homeLotteryRepository = HomeLotteryRepositoryImpl(
    HomeLotteryApiService(dependencies.apiClient),
  );
  final ticketCheckRepository = TicketCheckRepositoryImpl(
    TicketCheckApiService(dependencies.apiClient),
  );
  final blogRepository = BlogRepositoryImpl(
    BlogApiService(dependencies.apiClient),
  );
  final supportTicketService = SupportTicketService(dependencies.apiClient);
  final supportTicketRepository = SupportTicketRepositoryImpl(
    supportTicketService,
  );
  final notificationSettingService = NotificationSettingService(
    dependencies.apiClient,
  );
  final notificationsRepository = NotificationRepositoryImpl(
    NotificationApiService(dependencies.apiClient),
  );
  final notificationSettingsRepository = NotificationSettingsRepositoryImpl(
    notificationSettingService,
  );

  runApp(
    ProviderScope(
      overrides: [
        apiClientProvider.overrideWithValue(dependencies.apiClient),
        authRepositoryProvider.overrideWithValue(dependencies.authRepository),
        orderServiceProvider.overrideWithValue(orderService),
        transactionServiceProvider.overrideWithValue(transactionService),
        ordersRepositoryProvider.overrideWithValue(ordersRepository),
        purchasedTicketsRepositoryProvider.overrideWithValue(
          purchasedTicketsRepository,
        ),
        transactionRepositoryProvider.overrideWithValue(transactionRepository),
        prizePayoutsRepositoryProvider.overrideWithValue(prizePayoutsRepository),
        bankAccountsRepositoryProvider.overrideWithValue(bankAccountsRepository),
        refundsRepositoryProvider.overrideWithValue(refundsRepository),
        scheduleRepositoryProvider.overrideWithValue(scheduleRepository),
        homeLotteryRepositoryProvider.overrideWithValue(homeLotteryRepository),
        ticketCheckRepositoryProvider.overrideWithValue(ticketCheckRepository),
        blogRepositoryProvider.overrideWithValue(blogRepository),
        supportTicketRepositoryProvider.overrideWithValue(
          supportTicketRepository,
        ),
        notificationSettingsRepositoryProvider.overrideWithValue(
          notificationSettingsRepository,
        ),
        notificationsRepositoryProvider.overrideWithValue(
          notificationsRepository,
        ),
        notificationViewModelProvider.overrideWithValue(
          dependencies.notificationViewModel,
        ),
      ],
      child: DaiPhatMobileApp(router: dependencies.router),
    ),
  );
}
