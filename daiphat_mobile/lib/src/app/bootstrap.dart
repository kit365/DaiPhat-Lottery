import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'package:daiphat_mobile/firebase_options.dart';
import 'package:daiphat_mobile/src/app/app.dart';
import 'package:daiphat_mobile/src/app/dependencies/app_dependencies.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import 'package:daiphat_mobile/src/shared/services/notification_service.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/features/checkout/data/order_service.dart';
import 'package:daiphat_mobile/src/features/checkout/data/transaction_service.dart';
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

bool _hasFirebaseConfig() {
  final projectId = dotenv.env['FIREBASE_PROJECT_ID']?.trim() ?? '';
  final androidAppId = dotenv.env['FIREBASE_ANDROID_APP_ID']?.trim() ?? '';
  final androidApiKey = dotenv.env['FIREBASE_ANDROID_API_KEY']?.trim() ?? '';
  return projectId.isNotEmpty &&
      androidAppId.isNotEmpty &&
      androidApiKey.isNotEmpty;
}

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');

  try {
    if (_hasFirebaseConfig()) {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    } else {
      await Firebase.initializeApp();
    }
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  } catch (e) {
    debugPrint('Firebase init warning/error (running without push notifications): $e');
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
        prizePayoutServiceProvider.overrideWithValue(prizePayoutService),
        bankAccountServiceProvider.overrideWithValue(bankAccountService),
        refundServiceProvider.overrideWithValue(refundService),
        supportTicketServiceProvider.overrideWithValue(supportTicketService),
        notificationSettingServiceProvider.overrideWithValue(
          notificationSettingService,
        ),
      ],
      child: DaiPhatMobileApp(router: dependencies.router),
    ),
  );
}
