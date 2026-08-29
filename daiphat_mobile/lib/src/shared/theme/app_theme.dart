import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';

class AppTheme {
  static ThemeData get lightTheme {
    final textTheme = AppTypography.lightTextTheme();

    return ThemeData(
      useMaterial3: true,
      fontFamily: AppTypography.mainFamily,
      colorScheme: const ColorScheme.light(
        primary: AppColors.brandPrimary,
        secondary: AppColors.brandAccent,
        surface: AppColors.surfacePrimary,
        error: AppColors.statusError,
        onPrimary: AppColors.surfacePrimary,
        onSecondary: AppColors.contentPrimary,
        onSurface: AppColors.contentPrimary,
      ),
      scaffoldBackgroundColor: AppColors.backgroundPrimary,
      textTheme: textTheme,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surfacePrimary,
        foregroundColor: AppColors.contentPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: AppColors.surfaceTintTransparent,
        centerTitle: true,
      ),
      inputDecorationTheme: InputDecorationTheme(
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: AppColors.contentPlaceholder,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.brandPrimary,
          foregroundColor: AppColors.surfacePrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: AppTypography.main(
            const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surfacePrimary,
        elevation: 2,
        shadowColor: AppColors.cardShadow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }
}
