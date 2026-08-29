import 'package:flutter/material.dart';

class AppColors {
  // ---------------------------------------------------------
  // A) Primitive Tokens (Palette Constants)
  // ---------------------------------------------------------
  static const Color redPrimary = Color(0xFFD31010);
  static const Color redDark = Color(0xFFA60F14);
  static const Color redLogin = Color(0xFFD32F2F);
  static const Color redTitle = Color(0xFFA31010);
  static const Color redAlert = Color(0xFFEE1314);
  static const Color goldBase = Color(0xFFFFD700);
  static const Color goldLight = Color(0xFFFFF9E6);
  static const Color goldDarkBase = Color(0xFFF9A826);
  static const Color goldLogin = Color(0xFFFFB300);
  static const Color greenSuccess = Color(0xFF4CAF50);
  static const Color navyBase = Color(0xFF102937);
  static const Color neutralInk = Color(0xFF17191F);
  static const Color neutral900 = Color(0xFF111111);
  static const Color neutral700 = Color(0xFF333333);
  static const Color neutral600 = Color(0xFF505050);
  static const Color neutral500 = Color(0xFF64748B);
  static const Color neutral400 = Color(0xFF999999);
  static const Color neutral300 = Color(0xFFE0E0E0);
  static const Color neutral200 = Color(0xFFE5E7EB);
  static const Color neutral100 = Color(0xFFF8FAFC);
  static const Color neutral50 = Color(0xFFF5F6FA);
  static const Color neutralWarm50 = Color(0xFFFDF9F9);
  static const Color white = Color(0xFFFFFFFF);
  static const Color transparent = Color(0x00000000);
  static const Color black12 = Color(0x1F000000);

  // ---------------------------------------------------------
  // B) Semantic Tokens
  // ---------------------------------------------------------
  static const Color brandPrimary = redPrimary;
  static const Color brandPrimaryDark = redDark;
  static const Color brandAccent = goldBase;
  static const Color brandAccentLight = goldLight;
  static const Color brandGoldDark = goldDarkBase;

  static const Color brandLoginPrimary = redLogin;
  static const Color brandLoginTitle = redTitle;
  static const Color brandLoginGold = goldLogin;

  static const Color backgroundPrimary = neutral50;
  static const Color backgroundWarm = neutralWarm50;
  static const Color surfacePrimary = white;
  static const Color tableRowOdd = neutral100;
  static const Color tableRowEven = white;

  static const Color contentPrimary = neutralInk;
  static const Color contentHeading = neutral900;
  static const Color contentLabel = neutral700;
  static const Color contentSecondary = neutral600;
  static const Color contentMuted = neutral500;
  static const Color contentPlaceholder = neutral400;
  static const Color brandNavy = navyBase;

  static const Color borderDefault = neutral200;
  static const Color borderInput = neutral300;
  static const Color statusError = redAlert;
  static const Color statusSuccess = greenSuccess;
  static const Color surfaceTintTransparent = transparent;
  static const Color cardShadow = black12;

  // ---------------------------------------------------------
  // C) Backward Compatibility Aliases (Preserving existing public API)
  // ---------------------------------------------------------
  static const Color primary = brandPrimary;
  static const Color primaryDark = brandPrimaryDark;
  static const Color goldDark = brandGoldDark;
  static const Color pageBg = backgroundWarm;
  static const Color surface = surfacePrimary;
  static const Color rowOdd = tableRowOdd;
  static const Color rowEven = tableRowEven;
  static const Color cardBorder = borderDefault;
  static const Color textMain = contentHeading;
  static const Color textMuted = contentMuted;

  static const Color loginPrimary = brandLoginPrimary;
  static const Color loginTitle = brandLoginTitle;
  static const Color loginGold = brandLoginGold;
  static const Color loginLabel = contentLabel;
  static const Color loginPlaceholder = contentPlaceholder;
  static const Color loginBorder = borderInput;

  static const Color accent = brandAccent;
  static const Color accentLight = brandAccentLight;
  static const Color background = backgroundPrimary;
  static const Color ink = contentPrimary;
  static const Color textSecondary = contentSecondary;
  static const Color navy = brandNavy;
  static const Color error = statusError;
  static const Color success = statusSuccess;
}
