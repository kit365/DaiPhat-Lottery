import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Central typography contract shared by every Mobile feature.
abstract final class AppTypography {
  static const String mainFamily = 'Public Sans';
  static const String displayFamily = 'Barlow';

  /// Applies the app-wide Public Sans family to body, label, form, and action
  /// text while preserving all local visual properties.
  static TextStyle main([TextStyle? style]) =>
      (style ?? const TextStyle()).copyWith(fontFamily: mainFamily);

  /// Applies the Barlow family to headings, brand display, and lottery values
  /// while preserving all local visual properties.
  static TextStyle display([TextStyle? style]) =>
      (style ?? const TextStyle()).copyWith(fontFamily: displayFamily);

  static TextStyle number([TextStyle? style]) => display(style);

  static TextTheme lightTextTheme() {
    final base = ThemeData.light().textTheme;

    return base.copyWith(
      displayLarge: display(base.displayLarge).copyWith(
        color: AppColors.contentPrimary,
        fontWeight: FontWeight.bold,
      ),
      displayMedium: display(base.displayMedium).copyWith(
        color: AppColors.contentPrimary,
        fontWeight: FontWeight.bold,
      ),
      displaySmall: display(base.displaySmall).copyWith(
        color: AppColors.contentPrimary,
        fontWeight: FontWeight.bold,
      ),
      headlineLarge: display(base.headlineLarge).copyWith(
        color: AppColors.contentPrimary,
        fontWeight: FontWeight.bold,
      ),
      headlineMedium: display(base.headlineMedium).copyWith(
        color: AppColors.contentPrimary,
        fontWeight: FontWeight.bold,
      ),
      headlineSmall: display(base.headlineSmall).copyWith(
        color: AppColors.contentPrimary,
        fontWeight: FontWeight.bold,
      ),
      titleLarge: display(base.titleLarge).copyWith(
        color: AppColors.contentPrimary,
        fontWeight: FontWeight.bold,
      ),
      titleMedium: display(base.titleMedium).copyWith(
        color: AppColors.contentPrimary,
        fontWeight: FontWeight.w600,
      ),
      titleSmall: display(base.titleSmall).copyWith(
        color: AppColors.contentPrimary,
        fontWeight: FontWeight.w600,
      ),
      bodyLarge: main(base.bodyLarge).copyWith(color: AppColors.contentPrimary),
      bodyMedium: main(base.bodyMedium).copyWith(
        color: AppColors.contentPrimary,
      ),
      bodySmall: main(base.bodySmall).copyWith(
        color: AppColors.contentSecondary,
      ),
      labelLarge: main(base.labelLarge),
      labelMedium: main(base.labelMedium),
      labelSmall: main(base.labelSmall),
    );
  }
}
