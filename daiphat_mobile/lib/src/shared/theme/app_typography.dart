import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Central typography contract shared by every Mobile feature.
abstract final class AppTypography {
  // ---------------------------------------------------------------------------
  // Font Families
  // ---------------------------------------------------------------------------
  static const String mainFamily = 'Public Sans';
  static const String displayFamily = 'Barlow';
  static const String monoFamily = 'monospace';
  static const String traditionalFamily = 'serif';

  static const List<String> traditionalFallback = [
    'Noto Serif CJK SC',
    'Noto Serif CJK TC',
    'Apple SD Gothic Neo',
    'serif',
  ];

  // ---------------------------------------------------------------------------
  // Headings (Material 3 Slots: displayLarge, displayMedium, headlineLarge, ...)
  // ---------------------------------------------------------------------------

  /// H1 / displayLarge: 32px, Barlow, Bold (w800), height 1.25, letterSpacing -0.5
  /// Used for Hero banners, Splash titles, major milestones.
  static TextStyle h1({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    displayFamily,
    fontSize: fontSize ?? 32,
    fontWeight: fontWeight ?? FontWeight.w800,
    height: height ?? 1.25,
    letterSpacing: letterSpacing ?? -0.5,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// H2 / displayMedium: 26px, Barlow, Bold (w800), height 1.25, letterSpacing -0.3
  /// Used for Auth welcome headers, Hero Card main title.
  static TextStyle h2({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    displayFamily,
    fontSize: fontSize ?? 26,
    fontWeight: fontWeight ?? FontWeight.w800,
    height: height ?? 1.25,
    letterSpacing: letterSpacing ?? -0.3,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// H3 / headlineLarge: 22px, Barlow, Bold (w700), height 1.30
  /// Used for Section headings, major dialog titles.
  static TextStyle h3({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    displayFamily,
    fontSize: fontSize ?? 22,
    fontWeight: fontWeight ?? FontWeight.w700,
    height: height ?? 1.30,
    letterSpacing: letterSpacing ?? 0.0,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// H4 / headlineMedium: 18px, Barlow, Bold (w700), height 1.35
  /// Used for Card main title, Section sub-title, Confirmation Dialogs.
  static TextStyle h4({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    displayFamily,
    fontSize: fontSize ?? 18,
    fontWeight: fontWeight ?? FontWeight.w700,
    height: height ?? 1.35,
    letterSpacing: letterSpacing ?? 0.0,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// H5 / titleLarge: 16px, Barlow, Bold (w700), height 1.40
  /// Used for Modal BottomSheet Title, List group headers.
  static TextStyle h5({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    displayFamily,
    fontSize: fontSize ?? 16,
    fontWeight: fontWeight ?? FontWeight.w700,
    height: height ?? 1.40,
    letterSpacing: letterSpacing ?? 0.0,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// H6 / titleMedium: 14px, Barlow, SemiBold (w600), height 1.40
  /// Used for Item titles in list, Card subtitle, bold table captions.
  static TextStyle h6({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    displayFamily,
    fontSize: fontSize ?? 14,
    fontWeight: fontWeight ?? FontWeight.w600,
    height: height ?? 1.40,
    letterSpacing: letterSpacing ?? 0.0,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// titleSmall: 13px, Barlow, SemiBold (w600), height 1.40
  static TextStyle titleSmall({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    displayFamily,
    fontSize: fontSize ?? 13,
    fontWeight: fontWeight ?? FontWeight.w600,
    height: height ?? 1.40,
    letterSpacing: letterSpacing ?? 0.0,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  // ---------------------------------------------------------------------------
  // Subtitles & Body (Material 3 Slots: bodyLarge, bodyMedium, bodySmall)
  // ---------------------------------------------------------------------------

  /// Subtitle 1: 15px, Public Sans, Medium (w500), height 1.40
  static TextStyle subtitle1({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    mainFamily,
    fontSize: fontSize ?? 15,
    fontWeight: fontWeight ?? FontWeight.w500,
    height: height ?? 1.40,
    letterSpacing: letterSpacing ?? 0.15,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// Subtitle 2: 13px, Public Sans, Medium (w500), height 1.40
  static TextStyle subtitle2({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    mainFamily,
    fontSize: fontSize ?? 13,
    fontWeight: fontWeight ?? FontWeight.w500,
    height: height ?? 1.40,
    letterSpacing: letterSpacing ?? 0.10,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// Body Large / body1: 16px, Public Sans, Regular (w400), height 1.50
  /// Used for Blog article bodies, long policy & agreement text.
  static TextStyle bodyLarge({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    mainFamily,
    fontSize: fontSize ?? 16,
    fontWeight: fontWeight ?? FontWeight.w400,
    height: height ?? 1.50,
    letterSpacing: letterSpacing ?? 0.15,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// Body Medium / body2: 14px, Public Sans, Regular (w400), height 1.50
  /// App-wide standard reading text, form fields, descriptions.
  static TextStyle bodyMedium({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    mainFamily,
    fontSize: fontSize ?? 14,
    fontWeight: fontWeight ?? FontWeight.w400,
    height: height ?? 1.50,
    letterSpacing: letterSpacing ?? 0.25,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// Body Small / body3: 12px, Public Sans, Regular (w400), height 1.45
  /// Secondary descriptions, helper text, footnote details.
  static TextStyle bodySmall({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    mainFamily,
    fontSize: fontSize ?? 12,
    fontWeight: fontWeight ?? FontWeight.w400,
    height: height ?? 1.45,
    letterSpacing: letterSpacing ?? 0.40,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  // ---------------------------------------------------------------------------
  // Buttons & Labels (Material 3 Slots: labelLarge, labelMedium, labelSmall)
  // ---------------------------------------------------------------------------

  /// Button Large: 16px, Public Sans, Bold (w700), height 1.20
  static TextStyle buttonLarge({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    mainFamily,
    fontSize: fontSize ?? 16,
    fontWeight: fontWeight ?? FontWeight.w700,
    height: height ?? 1.20,
    letterSpacing: letterSpacing ?? 0.10,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// Button Medium: 14px, Public Sans, SemiBold (w600), height 1.20
  static TextStyle buttonMedium({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    mainFamily,
    fontSize: fontSize ?? 14,
    fontWeight: fontWeight ?? FontWeight.w600,
    height: height ?? 1.20,
    letterSpacing: letterSpacing ?? 0.10,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// Button Small: 12px, Public Sans, SemiBold (w600), height 1.20
  static TextStyle buttonSmall({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    mainFamily,
    fontSize: fontSize ?? 12,
    fontWeight: fontWeight ?? FontWeight.w600,
    height: height ?? 1.20,
    letterSpacing: letterSpacing ?? 0.10,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// Label Large: 14px, Public Sans, SemiBold (w600), height 1.30
  static TextStyle labelLarge({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    mainFamily,
    fontSize: fontSize ?? 14,
    fontWeight: fontWeight ?? FontWeight.w600,
    height: height ?? 1.30,
    letterSpacing: letterSpacing ?? 0.10,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// Label Medium: 12px, Public Sans, SemiBold (w600), height 1.30
  static TextStyle labelMedium({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    mainFamily,
    fontSize: fontSize ?? 12,
    fontWeight: fontWeight ?? FontWeight.w600,
    height: height ?? 1.30,
    letterSpacing: letterSpacing ?? 0.50,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// Label Small: 11px, Public Sans, Medium (w500), height 1.30
  static TextStyle labelSmall({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    mainFamily,
    fontSize: fontSize ?? 11,
    fontWeight: fontWeight ?? FontWeight.w500,
    height: height ?? 1.30,
    letterSpacing: letterSpacing ?? 0.50,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// Caption: 11px, Public Sans, Regular (w400), height 1.30
  static TextStyle caption({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    mainFamily,
    fontSize: fontSize ?? 11,
    fontWeight: fontWeight ?? FontWeight.w400,
    height: height ?? 1.30,
    letterSpacing: letterSpacing ?? 0.40,
    color: color ?? AppColors.contentSecondary,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  /// Overline / Badge: 10px, Public Sans, Bold (w700), height 1.20, letterSpacing 1.0
  static TextStyle overline({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    TextStyle? textStyle,
  }) => _makeStyle(
    mainFamily,
    fontSize: fontSize ?? 10,
    fontWeight: fontWeight ?? FontWeight.w700,
    height: height ?? 1.20,
    letterSpacing: letterSpacing ?? 1.0,
    color: color,
    decoration: decoration,
    decorationColor: decorationColor,
    fontStyle: fontStyle,
    overrideStyle: textStyle,
  );

  // ---------------------------------------------------------------------------
  // Domain Tokens (Lottery, Pricing, Monospace Code, Traditional)
  // ---------------------------------------------------------------------------

  /// Lottery Special Jackpot: 32px, Barlow, Black (w900), height 1.10
  static TextStyle lotterySpecial({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextStyle? textStyle,
  }) => _makeStyle(
    displayFamily,
    fontSize: fontSize ?? 32,
    fontWeight: fontWeight ?? FontWeight.w900,
    height: height ?? 1.10,
    letterSpacing: letterSpacing ?? 0.0,
    color: color,
    overrideStyle: textStyle,
  );

  /// Lottery Prize Digits: 22px, Barlow, ExtraBold (w800), height 1.20
  static TextStyle lotteryPrize({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextStyle? textStyle,
  }) => _makeStyle(
    displayFamily,
    fontSize: fontSize ?? 22,
    fontWeight: fontWeight ?? FontWeight.w800,
    height: height ?? 1.20,
    letterSpacing: letterSpacing ?? 0.0,
    color: color,
    overrideStyle: textStyle,
  );

  /// Lottery Card Single Digit: 18px, Barlow, Bold (w700), height 1.20
  static TextStyle lotteryDigit({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextStyle? textStyle,
  }) => _makeStyle(
    displayFamily,
    fontSize: fontSize ?? 18,
    fontWeight: fontWeight ?? FontWeight.w700,
    height: height ?? 1.20,
    letterSpacing: letterSpacing ?? 0.0,
    color: color,
    overrideStyle: textStyle,
  );

  /// Price Highlight (Large total sum): 20px, Barlow, ExtraBold (w800), height 1.20
  static TextStyle priceLarge({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextStyle? textStyle,
  }) => _makeStyle(
    displayFamily,
    fontSize: fontSize ?? 20,
    fontWeight: fontWeight ?? FontWeight.w800,
    height: height ?? 1.20,
    letterSpacing: letterSpacing ?? 0.0,
    color: color,
    overrideStyle: textStyle,
  );

  /// Price Ticket (Single ticket price): 16px, Barlow, Bold (w700), height 1.20
  static TextStyle priceMedium({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextStyle? textStyle,
  }) => _makeStyle(
    displayFamily,
    fontSize: fontSize ?? 16,
    fontWeight: fontWeight ?? FontWeight.w700,
    height: height ?? 1.20,
    letterSpacing: letterSpacing ?? 0.0,
    color: color,
    overrideStyle: textStyle,
  );

  /// Monospace Technical Code (Serials, Order ID, OTP, QR Batch): 13px, monospace, w600
  static TextStyle monoCode({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextStyle? textStyle,
  }) => _makeStyle(
    monoFamily,
    fontSize: fontSize ?? 13,
    fontWeight: fontWeight ?? FontWeight.w600,
    height: height ?? 1.20,
    letterSpacing: letterSpacing ?? 0.5,
    color: color,
    overrideStyle: textStyle,
  );

  /// Traditional Chinese / Fortune Stick Glyphs: 28px, serif, w900
  static TextStyle traditional({
    Color? color,
    FontWeight? fontWeight,
    double? fontSize,
    double? height,
    double? letterSpacing,
    TextStyle? textStyle,
  }) => _makeStyle(
    traditionalFamily,
    fontSize: fontSize ?? 28,
    fontWeight: fontWeight ?? FontWeight.w900,
    height: height ?? 1.20,
    letterSpacing: letterSpacing ?? 0.0,
    color: color,
    fontFamilyFallback: traditionalFallback,
    overrideStyle: textStyle,
  );

  // ---------------------------------------------------------------------------
  // Legacy Helpers & Backward Compatibility
  // ---------------------------------------------------------------------------

  /// Applies the app-wide Public Sans family to body, label, form, and action text.
  static TextStyle main([TextStyle? style]) => _withFamily(mainFamily, style);

  /// Named-argument variant used when migrating generated font calls.
  static TextStyle mainWith({
    TextStyle? textStyle,
    Color? color,
    Color? backgroundColor,
    double? fontSize,
    FontWeight? fontWeight,
    FontStyle? fontStyle,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    TextDecorationStyle? decorationStyle,
    double? decorationThickness,
    double? height,
    Locale? locale,
    Paint? foreground,
    Paint? background,
    List<Shadow>? shadows,
    List<FontFeature>? fontFeatures,
    List<FontVariation>? fontVariations,
  }) {
    return _withFamily(
      mainFamily,
      textStyle,
      color: color,
      backgroundColor: backgroundColor,
      fontSize: fontSize,
      fontWeight: fontWeight,
      fontStyle: fontStyle,
      letterSpacing: letterSpacing,
      decoration: decoration,
      decorationColor: decorationColor,
      decorationStyle: decorationStyle,
      decorationThickness: decorationThickness,
      height: height,
      locale: locale,
      foreground: foreground,
      background: background,
      shadows: shadows,
      fontFeatures: fontFeatures,
      fontVariations: fontVariations,
    );
  }

  /// Applies the bundled monospace family for serials and technical values.
  static TextStyle mono([TextStyle? style]) => _withFamily(monoFamily, style);

  /// Named-argument variant for serials and technical values.
  static TextStyle monoWith({
    TextStyle? textStyle,
    Color? color,
    Color? backgroundColor,
    double? fontSize,
    FontWeight? fontWeight,
    FontStyle? fontStyle,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    TextDecorationStyle? decorationStyle,
    double? decorationThickness,
    double? height,
    Locale? locale,
    Paint? foreground,
    Paint? background,
    List<Shadow>? shadows,
    List<FontFeature>? fontFeatures,
    List<FontVariation>? fontVariations,
  }) {
    return _withFamily(
      monoFamily,
      textStyle,
      color: color,
      backgroundColor: backgroundColor,
      fontSize: fontSize,
      fontWeight: fontWeight,
      fontStyle: fontStyle,
      letterSpacing: letterSpacing,
      decoration: decoration,
      decorationColor: decorationColor,
      decorationStyle: decorationStyle,
      decorationThickness: decorationThickness,
      height: height,
      locale: locale,
      foreground: foreground,
      background: background,
      shadows: shadows,
      fontFeatures: fontFeatures,
      fontVariations: fontVariations,
    );
  }

  /// Applies the Barlow family to headings, brand display, and lottery values.
  static TextStyle display([TextStyle? style]) =>
      (style ?? const TextStyle()).copyWith(fontFamily: displayFamily);

  static TextStyle number([TextStyle? style]) => display(style);

  /// Dedicated page title token for screen headers:
  /// Uses Public Sans 700, fontSize 20, height 1.2, letterSpacing 0, contentPrimary.
  static TextStyle pageTitle([TextStyle? style]) {
    final base = main(
      const TextStyle(
        fontSize: 20,
        height: 1.2,
        letterSpacing: 0,
        fontWeight: FontWeight.w700,
        color: AppColors.contentPrimary,
      ),
    );
    return style != null ? base.merge(style) : base;
  }

  // ---------------------------------------------------------------------------
  // TextTheme Builders for Material 3 & Dark Mode
  // ---------------------------------------------------------------------------

  /// Creates a normalized Material 3 TextTheme resolved against a ColorScheme.
  static TextTheme createTextTheme(ColorScheme colorScheme) {
    return TextTheme(
      displayLarge: h1(color: colorScheme.onSurface),
      displayMedium: h2(color: colorScheme.onSurface),
      displaySmall: h3(color: colorScheme.onSurface),
      headlineLarge: h3(color: colorScheme.onSurface),
      headlineMedium: h4(color: colorScheme.onSurface),
      headlineSmall: h5(color: colorScheme.onSurface),
      titleLarge: h5(color: colorScheme.onSurface),
      titleMedium: h6(color: colorScheme.onSurface),
      titleSmall: titleSmall(color: colorScheme.onSurface),
      bodyLarge: bodyLarge(color: colorScheme.onSurface),
      bodyMedium: bodyMedium(color: colorScheme.onSurface),
      bodySmall: bodySmall(color: colorScheme.onSurfaceVariant),
      labelLarge: labelLarge(color: colorScheme.onSurface),
      labelMedium: labelMedium(color: colorScheme.onSurface),
      labelSmall: labelSmall(color: colorScheme.onSurfaceVariant),
    );
  }

  /// Legacy light TextTheme builder maintained for backwards compatibility.
  static TextTheme lightTextTheme() {
    final base = ThemeData.light().textTheme;

    return base.copyWith(
      displayLarge: display(
        base.displayLarge,
      ).copyWith(color: AppColors.contentPrimary, fontWeight: FontWeight.bold),
      displayMedium: display(
        base.displayMedium,
      ).copyWith(color: AppColors.contentPrimary, fontWeight: FontWeight.bold),
      displaySmall: display(
        base.displaySmall,
      ).copyWith(color: AppColors.contentPrimary, fontWeight: FontWeight.bold),
      headlineLarge: display(
        base.headlineLarge,
      ).copyWith(color: AppColors.contentPrimary, fontWeight: FontWeight.bold),
      headlineMedium: display(
        base.headlineMedium,
      ).copyWith(color: AppColors.contentPrimary, fontWeight: FontWeight.bold),
      headlineSmall: display(
        base.headlineSmall,
      ).copyWith(color: AppColors.contentPrimary, fontWeight: FontWeight.bold),
      titleLarge: display(
        base.titleLarge,
      ).copyWith(color: AppColors.contentPrimary, fontWeight: FontWeight.bold),
      titleMedium: display(
        base.titleMedium,
      ).copyWith(color: AppColors.contentPrimary, fontWeight: FontWeight.w600),
      titleSmall: display(
        base.titleSmall,
      ).copyWith(color: AppColors.contentPrimary, fontWeight: FontWeight.w600),
      bodyLarge: main(base.bodyLarge).copyWith(color: AppColors.contentPrimary),
      bodyMedium: main(
        base.bodyMedium,
      ).copyWith(color: AppColors.contentPrimary),
      bodySmall: main(
        base.bodySmall,
      ).copyWith(color: AppColors.contentSecondary),
      labelLarge: main(base.labelLarge),
      labelMedium: main(base.labelMedium),
      labelSmall: main(base.labelSmall),
    );
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  static TextStyle _makeStyle(
    String family, {
    required double fontSize,
    required FontWeight fontWeight,
    required double height,
    required double letterSpacing,
    Color? color,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
    List<String>? fontFamilyFallback,
    TextStyle? overrideStyle,
  }) {
    var style = TextStyle(
      fontFamily: family,
      fontSize: fontSize,
      fontWeight: fontWeight,
      height: height,
      letterSpacing: letterSpacing,
      color: color,
      decoration: decoration,
      decorationColor: decorationColor,
      fontStyle: fontStyle,
      fontFamilyFallback: fontFamilyFallback,
    );
    if (overrideStyle != null) {
      style = style.merge(overrideStyle);
    }
    return style;
  }

  static TextStyle _withFamily(
    String family,
    TextStyle? style, {
    Color? color,
    Color? backgroundColor,
    double? fontSize,
    FontWeight? fontWeight,
    FontStyle? fontStyle,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    TextDecorationStyle? decorationStyle,
    double? decorationThickness,
    double? height,
    Locale? locale,
    Paint? foreground,
    Paint? background,
    List<Shadow>? shadows,
    List<FontFeature>? fontFeatures,
    List<FontVariation>? fontVariations,
  }) {
    return (style ?? const TextStyle()).copyWith(
      color: color,
      backgroundColor: backgroundColor,
      fontSize: fontSize,
      fontWeight: fontWeight,
      fontStyle: fontStyle,
      letterSpacing: letterSpacing,
      decoration: decoration,
      decorationColor: decorationColor,
      decorationStyle: decorationStyle,
      decorationThickness: decorationThickness,
      height: height,
      locale: locale,
      foreground: foreground,
      background: background,
      shadows: shadows,
      fontFeatures: fontFeatures,
      fontVariations: fontVariations,
      fontFamily: family,
    );
  }
}
