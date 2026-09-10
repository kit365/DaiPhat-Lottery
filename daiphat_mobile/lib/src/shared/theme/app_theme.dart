import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';

class AppTheme {
  static final ColorScheme _lightColorScheme =
      ColorScheme.fromSeed(
        seedColor: AppColors.brandPrimary,
        brightness: Brightness.light,
      ).copyWith(
        primary: AppColors.brandPrimary,
        secondary: AppColors.brandAccent,
        surface: AppColors.surfacePrimary,
        error: AppColors.statusError,
        onPrimary: AppColors.surfacePrimary,
        onSecondary: AppColors.contentPrimary,
        onSurface: AppColors.contentPrimary,
      );

  static final ColorScheme _darkColorScheme =
      ColorScheme.fromSeed(
        seedColor: AppColors.brandPrimary,
        brightness: Brightness.dark,
      ).copyWith(
        primary: const Color(0xFFFFB4AC),
        onPrimary: const Color(0xFF690005),
        primaryContainer: const Color(0xFF93000A),
        onPrimaryContainer: const Color(0xFFFFDAD6),
        secondary: const Color(0xFFFFD700),
        onSecondary: const Color(0xFF3B3000),
        surface: const Color(0xFF17191F),
        surfaceContainerHighest: const Color(0xFF2A2D35),
        onSurface: const Color(0xFFE4E2E6),
        outline: const Color(0xFF90909A),
        error: const Color(0xFFFFB4AB),
      );

  static ThemeData get lightTheme {
    final textTheme = AppTypography.lightTextTheme();

    return ThemeData(
      useMaterial3: true,
      fontFamily: AppTypography.mainFamily,
      colorScheme: _lightColorScheme,
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
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: AppTypography.buttonMedium(
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surfacePrimary,
        elevation: 2,
        shadowColor: AppColors.cardShadow,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  static ThemeData get darkTheme {
    final textTheme = AppTypography.createTextTheme(_darkColorScheme);

    return ThemeData(
      useMaterial3: true,
      fontFamily: AppTypography.mainFamily,
      colorScheme: _darkColorScheme,
      scaffoldBackgroundColor: const Color(0xFF101114),
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: _darkColorScheme.surface,
        foregroundColor: _darkColorScheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: AppColors.surfaceTintTransparent,
        centerTitle: true,
        titleTextStyle: AppTypography.h3(color: _darkColorScheme.onSurface),
      ),
      inputDecorationTheme: InputDecorationTheme(
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: const Color(0xFFC6C5CD),
        ),
        labelStyle: textTheme.labelLarge?.copyWith(
          color: _darkColorScheme.onSurface,
        ),
        filled: true,
        fillColor: _darkColorScheme.surfaceContainerHighest,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _darkColorScheme.primary,
          foregroundColor: _darkColorScheme.onPrimary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: AppTypography.buttonMedium(),
        ),
      ),
      cardTheme: CardThemeData(
        color: _darkColorScheme.surface,
        elevation: 2,
        shadowColor: Colors.black54,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      dividerTheme: DividerThemeData(color: _darkColorScheme.outlineVariant),
      dialogTheme: DialogThemeData(
        backgroundColor: _darkColorScheme.surface,
        surfaceTintColor: AppColors.surfaceTintTransparent,
        titleTextStyle: AppTypography.h4(color: _darkColorScheme.onSurface),
        contentTextStyle: AppTypography.bodyMedium(color: _darkColorScheme.onSurface),
      ),
    );
  }
}
