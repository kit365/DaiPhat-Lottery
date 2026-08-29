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
  static const Color neutralBorderLight = Color(0xFFE5E8EB);
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
  static const Color brandPrimaryStrong = redAlert;
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
  static const Color borderLight = neutralBorderLight;
  static const Color borderSubtle = Color(0xFFE2E8F0);
  static const Color borderInput = neutral300;
  static const Color statusError = redAlert;
  static const Color statusSuccess = greenSuccess;

  // Shared status surfaces/foregrounds. Keep these semantic pairs together so
  // badges, banners, dialogs, and toasts do not grow one-off palettes.
  static const Color statusInfoSurface = Color(0xFFEFF8FF);
  static const Color statusInfoForeground = Color(0xFF175CD3);
  static const Color statusWarningSurface = Color(0xFFFFF9F3);
  static const Color statusWarningForeground = Color(0xFFB76E00);
  static const Color statusAttentionSurface = Color(0xFFFFF4E5);
  static const Color statusAttentionForeground = Color(0xFF9A4D00);
  static const Color statusSuccessSurface = Color(0xFFE4F8ED);
  static const Color statusSuccessForeground = Color(0xFF1CA75A);
  static const Color statusWarningAccent = Color(0xFFF59E0B);
  static const Color statusErrorSurface = Color(0xFFFFF4F4);
  static const Color statusErrorForeground = statusError;
  static const Color statusDangerSurface = Color(0xFFFFF5F5);
  static const Color statusDangerForeground = Color(0xFFC62828);
  static const Color statusNeutralSurface = Color(0xFFF4F6F8);
  static const Color statusNeutralForeground = Color(0xFF637381);

  // Common supporting surfaces/content used by list, form, and overlay UI.
  static const Color surfaceNeutral = statusNeutralSurface;
  static const Color surfaceCanvas = Color(0xFFF8F9FA);
  static const Color surfaceSoft = neutral100;
  static const Color surfaceInfo = Color(0xFFEFF6FF);
  static const Color surfaceSuccess = Color(0xFFECFDF5);
  static const Color surfaceWarning = Color(0xFFFFFBEB);
  static const Color surfaceError = Color(0xFFFEF2F2);
  static const Color contentNavy = Color(0xFF1E293B);
  static const Color contentNeutral = statusNeutralForeground;
  static const Color contentSubtle = Color(0xFF94A3B8);
  static const Color contentPlaceholderStrong = Color(0xFF919EAB);

  // Toast palette. These are intentionally distinct from the broader status
  // palette because toast contrast and border treatment are more specific.
  static const Color toastSuccessAccent = Color(0xFF10B981);
  static const Color toastSuccessSurface = Color(0xFFECFDF5);
  static const Color toastSuccessBorder = Color(0xFFA7F3D0);
  static const Color toastErrorSurface = Color(0xFFFEF2F2);
  static const Color toastErrorBorder = Color(0xFFFECACA);
  static const Color toastWarningAccent = Color(0xFFF59E0B);
  static const Color toastWarningSurface = Color(0xFFFFFBEB);
  static const Color toastWarningBorder = Color(0xFFFDE68A);
  static const Color toastInfoAccent = Color(0xFF3B82F6);
  static const Color toastInfoSurface = Color(0xFFEFF6FF);
  static const Color toastInfoBorder = Color(0xFFBFDBFE);
  static const Color shadowSubtle = Color(0x14000000);
  static const Color shadowBrand = Color(0x28D31010);

  // Ticket/profile display states. They remain exact to the existing UI
  // palette while living in the same source of truth as app-wide colors.
  static const Color ticketPendingForeground = Color(0xFFD97706);
  static const Color ticketPendingSurface = Color(0xFFFFFBEB);
  static const Color ticketLostForeground = Color(0xFFEF4444);
  static const Color ticketLostSurface = Color(0xFFFEF2F2);
  static const Color ticketHoldingForeground = Color(0xFFB45309);
  static const Color ticketHoldingSurface = Color(0xFFFFFBEB);
  static const Color ticketPickedUpForeground = Color(0xFF0369A1);
  static const Color ticketPickedUpSurface = Color(0xFFF0F9FF);
  static const Color ticketReservedForeground = Color(0xFF475569);
  static const Color ticketReservedSurface = Color(0xFFF8FAFC);
  static const Color payoutCompleteForeground = Color(0xFF047857);
  static const Color payoutCompleteSurface = Color(0xFFECFDF5);
  static const Color payoutPendingForeground = Color(0xFFB45309);
  static const Color payoutPendingSurface = Color(0xFFFFFBEB);
  static const Color payoutManualForeground = Color(0xFFBE123C);
  static const Color payoutManualSurface = Color(0xFFFFF1F2);
  static const Color payoutNeutralForeground = Color(0xFF475569);
  static const Color payoutNeutralSurface = Color(0xFFF1F5F9);
  static const Color payoutInPersonForeground = Color(0xFF6D28D9);
  static const Color payoutInPersonSurface = Color(0xFFF5F3FF);

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
