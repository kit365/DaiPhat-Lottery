import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTheme {
  static ThemeData get lightTheme {
    final baseTextTheme = GoogleFonts.publicSansTextTheme();
    final titleTextTheme = GoogleFonts.barlowTextTheme();

    return ThemeData(
      useMaterial3: true,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surface,
        error: AppColors.error,
        onPrimary: AppColors.surface,
        onSecondary: AppColors.ink,
        onSurface: AppColors.ink,
      ),
      scaffoldBackgroundColor: AppColors.background,
      textTheme: baseTextTheme.copyWith(
        displayLarge: titleTextTheme.displayLarge?.copyWith(color: AppColors.ink, fontWeight: FontWeight.bold),
        displayMedium: titleTextTheme.displayMedium?.copyWith(color: AppColors.ink, fontWeight: FontWeight.bold),
        displaySmall: titleTextTheme.displaySmall?.copyWith(color: AppColors.ink, fontWeight: FontWeight.bold),
        headlineLarge: titleTextTheme.headlineLarge?.copyWith(color: AppColors.ink, fontWeight: FontWeight.bold),
        headlineMedium: titleTextTheme.headlineMedium?.copyWith(color: AppColors.ink, fontWeight: FontWeight.bold),
        headlineSmall: titleTextTheme.headlineSmall?.copyWith(color: AppColors.ink, fontWeight: FontWeight.bold),
        titleLarge: titleTextTheme.titleLarge?.copyWith(color: AppColors.ink, fontWeight: FontWeight.bold),
        titleMedium: titleTextTheme.titleMedium?.copyWith(color: AppColors.ink, fontWeight: FontWeight.w600),
        titleSmall: titleTextTheme.titleSmall?.copyWith(color: AppColors.ink, fontWeight: FontWeight.w600),
        bodyLarge: baseTextTheme.bodyLarge?.copyWith(color: AppColors.ink),
        bodyMedium: baseTextTheme.bodyMedium?.copyWith(color: AppColors.ink),
        bodySmall: baseTextTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.ink,
        elevation: 0,
        centerTitle: true,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 2,
        shadowColor: Colors.black12,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }
}
