import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Whether Firebase client SDK should be initialized for this build.
bool isFirebaseConfigured() {
  final enabled = dotenv.env['FIREBASE_ENABLED']?.trim().toLowerCase();
  if (enabled == 'false') return false;

  final projectId = dotenv.env['FIREBASE_PROJECT_ID']?.trim() ?? '';
  final iosAppId = dotenv.env['FIREBASE_IOS_APP_ID']?.trim() ?? '';
  final iosApiKey = dotenv.env['FIREBASE_IOS_API_KEY']?.trim() ?? '';
  return projectId.isNotEmpty && iosAppId.isNotEmpty && iosApiKey.isNotEmpty;
}

bool get isFirebaseInitialized => Firebase.apps.isNotEmpty;
