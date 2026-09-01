import 'dart:convert';
import 'dart:developer' as developer;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/app/routing/app_router.dart';
import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/config/firebase_config.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  FirebaseMessaging? get _firebaseMessaging {
    if (!isFirebaseInitialized) return null;
    try {
      return FirebaseMessaging.instance;
    } catch (_) {
      return null;
    }
  }

  final FlutterLocalNotificationsPlugin _localNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  Future<void> requestPermission() async {
    try {
      await _firebaseMessaging?.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
    } catch (_) {}

    try {
      await _localNotificationsPlugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.requestNotificationsPermission();
    } catch (_) {}
  }

  Future<void> init() async {
    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const DarwinInitializationSettings iosSettings =
        DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        );
    const InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    try {
      await _localNotificationsPlugin.initialize(
        settings: initSettings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          final payload = response.payload;
          if (payload != null) {
            _handleNotificationTap(payload);
          }
        },
      );
    } catch (_) {}

    final messaging = _firebaseMessaging;
    if (messaging == null) {
      developer.log(
        'Firebase chưa bật — chỉ khởi tạo local notifications.',
        name: 'NotificationService',
      );
      return;
    }

    try {
      final token = await messaging.getToken();
      if (token != null) {
        developer.log('FCM Token: $token', name: 'NotificationService');
      }
    } catch (e) {
      developer.log(
        'Failed to get FCM token (APNS not ready on iOS or offline): $e',
        name: 'NotificationService',
      );
    }

    try {
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        developer.log(
          'Foreground message data: ${message.data}',
          name: 'NotificationService',
        );

        if (message.notification != null) {
          _showLocalNotification(message);
        }
      });

      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        _handleNotificationTap(jsonEncode(message.data));
      });

      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        Future.delayed(const Duration(milliseconds: 500), () {
          _handleNotificationTap(jsonEncode(initialMessage.data));
        });
      }
    } catch (_) {}
  }

  void _handleNotificationTap(String payload) {
    try {
      final data = jsonDecode(payload) as Map<String, dynamic>;
      final referenceId = data['referenceId'];
      final referenceType = data['referenceType'];

      final context = rootNavigatorKey.currentContext;
      if (context != null && context.mounted) {
        if (referenceType == 'BLOG_POST' && referenceId != null) {
          // Future: navigate to blog detail
        } else {
          context.go(AppRoute.notifications.path);
        }
      }
    } catch (e) {
      developer.log(
        'Error parsing notification payload: $e',
        name: 'NotificationService',
      );
    }
  }

  Future<void> _showLocalNotification(RemoteMessage message) async {
    final AndroidNotificationDetails androidDetails =
        AndroidNotificationDetails(
          'daiphat_channel_id',
          'Đại Phát Notifications',
          channelDescription: 'Thông báo từ hệ thống Đại Phát',
          importance: Importance.max,
          priority: Priority.high,
          color: AppColors.brandPrimary,
          enableLights: true,
          ledColor: AppColors.brandPrimary,
          ledOnMs: 1000,
          ledOffMs: 500,
          styleInformation: BigTextStyleInformation(
            message.notification?.body ?? '',
            htmlFormatBigText: true,
            contentTitle: message.notification?.title,
            htmlFormatContentTitle: true,
          ),
          icon: 'ic_notification',
        );
    final NotificationDetails platformDetails = NotificationDetails(
      android: androidDetails,
      iOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    );

    await _localNotificationsPlugin.show(
      id: message.hashCode,
      title: message.notification?.title,
      body: message.notification?.body,
      notificationDetails: platformDetails,
      payload: jsonEncode(message.data),
    );
  }
}
