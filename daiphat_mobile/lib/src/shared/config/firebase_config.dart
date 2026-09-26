import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Whether Firebase client SDK should be initialized for this build.
bool isFirebaseConfigured() {
  final enabled = dotenv.env['FIREBASE_ENABLED']?.trim().toLowerCase();
  if (enabled == 'false') return false;

  final projectId = dotenv.env['FIREBASE_PROJECT_ID']?.trim() ?? '';
  final String appId;
  final String apiKey;
  if (kIsWeb) {
    appId = dotenv.env['FIREBASE_WEB_APP_ID']?.trim() ?? '';
    apiKey = dotenv.env['FIREBASE_WEB_API_KEY']?.trim() ?? '';
  } else {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        appId = dotenv.env['FIREBASE_ANDROID_APP_ID']?.trim() ?? '';
        apiKey = dotenv.env['FIREBASE_ANDROID_API_KEY']?.trim() ?? '';
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
        appId = dotenv.env['FIREBASE_IOS_APP_ID']?.trim() ?? '';
        apiKey = dotenv.env['FIREBASE_IOS_API_KEY']?.trim() ?? '';
      default:
        appId = dotenv.env['FIREBASE_WEB_APP_ID']?.trim() ?? '';
        apiKey = dotenv.env['FIREBASE_WEB_API_KEY']?.trim() ?? '';
    }
  }
  return projectId.isNotEmpty && appId.isNotEmpty && apiKey.isNotEmpty;
}

bool get isFirebaseInitialized => Firebase.apps.isNotEmpty;
