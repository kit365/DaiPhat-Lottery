import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Central typography contract shared by every Mobile feature.
abstract final class AppTypography {
  static const String mainFamily = 'Public Sans';
  static const String displayFamily = 'Barlow';
  static const String monoFamily = 'monospace';

  /// Applies the app-wide Public Sans family to body, label, form, and action
  /// text while preserving all local visual properties.
  static TextStyle main([TextStyle? style]) => _withFamily(mainFamily, style);

  /// Named-argument variant used when migrating generated font calls.
  /// Its signature mirrors the old generated API so font attributes stay
  /// intact.
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
  /// The generic family is platform-provided because no monospace font asset
  /// is currently bundled with the app.
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

  /// Applies the Barlow family to headings, brand display, and lottery values
  /// while preserving all local visual properties.
  static TextStyle display([TextStyle? style]) =>
      (style ?? const TextStyle()).copyWith(fontFamily: displayFamily);

  static TextStyle number([TextStyle? style]) => display(style);

  /// Dedicated page title token for screen headers:
  /// Uses Public Sans 700 (or Be Vietnam Pro 700 if available),
  /// fontSize 20, height 1.2, letterSpacing 0, and navy/ink heading color.
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
}
