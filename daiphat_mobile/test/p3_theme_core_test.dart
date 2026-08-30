import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_theme.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late ThemeData sharedTheme;
  setUpAll(() {
    sharedTheme = AppTheme.lightTheme;
  });

  group('P3.1 - AppColors Primitive Tokens', () {
    test('exact ARGB values for primitive palette', () {
      expect(AppColors.redPrimary.toARGB32(), equals(0xFFD31010));
      expect(AppColors.redDark.toARGB32(), equals(0xFFA60F14));
      expect(AppColors.redLogin.toARGB32(), equals(0xFFD32F2F));
      expect(AppColors.redTitle.toARGB32(), equals(0xFFA31010));
      expect(AppColors.redAlert.toARGB32(), equals(0xFFEE1314));

      expect(AppColors.goldBase.toARGB32(), equals(0xFFFFD700));
      expect(AppColors.goldLight.toARGB32(), equals(0xFFFFF9E6));
      expect(AppColors.goldDarkBase.toARGB32(), equals(0xFFF9A826));
      expect(AppColors.goldLogin.toARGB32(), equals(0xFFFFB300));

      expect(AppColors.greenSuccess.toARGB32(), equals(0xFF4CAF50));
      expect(AppColors.navyBase.toARGB32(), equals(0xFF102937));

      expect(AppColors.neutralInk.toARGB32(), equals(0xFF17191F));
      expect(AppColors.neutral900.toARGB32(), equals(0xFF111111));
      expect(AppColors.neutral700.toARGB32(), equals(0xFF333333));
      expect(AppColors.neutral600.toARGB32(), equals(0xFF505050));
      expect(AppColors.neutral500.toARGB32(), equals(0xFF64748B));
      expect(AppColors.neutral400.toARGB32(), equals(0xFF767676));
      expect(AppColors.neutral300.toARGB32(), equals(0xFFE0E0E0));
      expect(AppColors.neutral200.toARGB32(), equals(0xFFE5E7EB));
      expect(AppColors.neutral100.toARGB32(), equals(0xFFF8FAFC));
      expect(AppColors.neutral50.toARGB32(), equals(0xFFF5F6FA));
      expect(AppColors.neutralWarm50.toARGB32(), equals(0xFFFDF9F9));

      expect(AppColors.white.toARGB32(), equals(0xFFFFFFFF));
      expect(AppColors.transparent.toARGB32(), equals(0x00000000));
      expect(AppColors.black12.toARGB32(), equals(0x1F000000));
    });
  });

  group('P3.1 - AppColors Semantic Tokens', () {
    test('semantic tokens map correctly to primitives', () {
      expect(AppColors.brandPrimary, equals(AppColors.redPrimary));
      expect(AppColors.brandPrimaryStrong, equals(AppColors.redAlert));
      expect(AppColors.brandPrimaryDark, equals(AppColors.redDark));
      expect(AppColors.brandAccent, equals(AppColors.goldBase));
      expect(AppColors.brandAccentLight, equals(AppColors.goldLight));
      expect(AppColors.brandGoldDark, equals(AppColors.goldDarkBase));

      expect(AppColors.brandLoginPrimary, equals(AppColors.redLogin));
      expect(AppColors.brandLoginTitle, equals(AppColors.redTitle));
      expect(AppColors.brandLoginGold, equals(AppColors.goldLogin));

      expect(AppColors.backgroundPrimary, equals(AppColors.neutral50));
      expect(AppColors.backgroundWarm, equals(AppColors.neutralWarm50));
      expect(AppColors.surfacePrimary, equals(AppColors.white));
      expect(AppColors.tableRowOdd, equals(AppColors.neutral100));
      expect(AppColors.tableRowEven, equals(AppColors.white));

      expect(AppColors.contentPrimary, equals(AppColors.neutralInk));
      expect(AppColors.contentHeading, equals(AppColors.neutral900));
      expect(AppColors.contentLabel, equals(AppColors.neutral700));
      expect(AppColors.contentSecondary, equals(AppColors.neutral600));
      expect(AppColors.contentMuted, equals(AppColors.neutral500));
      expect(AppColors.contentPlaceholder, equals(AppColors.neutral400));
      expect(AppColors.brandNavy, equals(AppColors.navyBase));

      expect(AppColors.borderDefault, equals(AppColors.neutral200));
      expect(AppColors.borderLight.toARGB32(), equals(0xFFE5E8EB));
      expect(AppColors.borderInput, equals(AppColors.neutral300));
      expect(AppColors.statusError, equals(AppColors.redAlert));
      expect(AppColors.statusSuccess, equals(AppColors.greenSuccess));
      expect(AppColors.statusInfoSurface.toARGB32(), equals(0xFFEFF8FF));
      expect(AppColors.statusInfoForeground.toARGB32(), equals(0xFF175CD3));
      expect(AppColors.statusWarningSurface.toARGB32(), equals(0xFFFFF9F3));
      expect(AppColors.statusWarningForeground.toARGB32(), equals(0xFFB76E00));
      expect(AppColors.toastSuccessAccent.toARGB32(), equals(0xFF10B981));
      expect(AppColors.toastInfoBorder.toARGB32(), equals(0xFFBFDBFE));
      expect(AppColors.surfaceTintTransparent, equals(AppColors.transparent));
      expect(AppColors.cardShadow, equals(AppColors.black12));
    });
  });

  group('P3.1 - AppColors Backward Compatibility Aliases', () {
    test(
      'all 24 aliases retain expected ARGB values and match semantic tokens',
      () {
        // 1. primary
        expect(AppColors.primary.toARGB32(), equals(0xFFD31010));
        expect(AppColors.primary, equals(AppColors.brandPrimary));

        // 2. primaryDark
        expect(AppColors.primaryDark.toARGB32(), equals(0xFFA60F14));
        expect(AppColors.primaryDark, equals(AppColors.brandPrimaryDark));

        // 3. goldDark
        expect(AppColors.goldDark.toARGB32(), equals(0xFFF9A826));
        expect(AppColors.goldDark, equals(AppColors.brandGoldDark));

        // 4. pageBg
        expect(AppColors.pageBg.toARGB32(), equals(0xFFFDF9F9));
        expect(AppColors.pageBg, equals(AppColors.backgroundWarm));

        // 5. surface
        expect(AppColors.surface.toARGB32(), equals(0xFFFFFFFF));
        expect(AppColors.surface, equals(AppColors.surfacePrimary));

        // 6. rowOdd
        expect(AppColors.rowOdd.toARGB32(), equals(0xFFF8FAFC));
        expect(AppColors.rowOdd, equals(AppColors.tableRowOdd));

        // 7. rowEven
        expect(AppColors.rowEven.toARGB32(), equals(0xFFFFFFFF));
        expect(AppColors.rowEven, equals(AppColors.tableRowEven));

        // 8. cardBorder
        expect(AppColors.cardBorder.toARGB32(), equals(0xFFE5E7EB));
        expect(AppColors.cardBorder, equals(AppColors.borderDefault));

        // 9. textMain
        expect(AppColors.textMain.toARGB32(), equals(0xFF111111));
        expect(AppColors.textMain, equals(AppColors.contentHeading));

        // 10. textMuted
        expect(AppColors.textMuted.toARGB32(), equals(0xFF64748B));
        expect(AppColors.textMuted, equals(AppColors.contentMuted));

        // 11. loginPrimary
        expect(AppColors.loginPrimary.toARGB32(), equals(0xFFD32F2F));
        expect(AppColors.loginPrimary, equals(AppColors.brandLoginPrimary));

        // 12. loginTitle
        expect(AppColors.loginTitle.toARGB32(), equals(0xFFA31010));
        expect(AppColors.loginTitle, equals(AppColors.brandLoginTitle));

        // 13. loginGold
        expect(AppColors.loginGold.toARGB32(), equals(0xFFFFB300));
        expect(AppColors.loginGold, equals(AppColors.brandLoginGold));

        // 14. loginLabel
        expect(AppColors.loginLabel.toARGB32(), equals(0xFF333333));
        expect(AppColors.loginLabel, equals(AppColors.contentLabel));

        // 15. loginPlaceholder
        expect(AppColors.loginPlaceholder.toARGB32(), equals(0xFF767676));
        expect(
          AppColors.loginPlaceholder,
          equals(AppColors.contentPlaceholder),
        );

        // 16. loginBorder
        expect(AppColors.loginBorder.toARGB32(), equals(0xFFE0E0E0));
        expect(AppColors.loginBorder, equals(AppColors.borderInput));

        // 17. accent
        expect(AppColors.accent.toARGB32(), equals(0xFFFFD700));
        expect(AppColors.accent, equals(AppColors.brandAccent));

        // 18. accentLight
        expect(AppColors.accentLight.toARGB32(), equals(0xFFFFF9E6));
        expect(AppColors.accentLight, equals(AppColors.brandAccentLight));

        // 19. background
        expect(AppColors.background.toARGB32(), equals(0xFFF5F6FA));
        expect(AppColors.background, equals(AppColors.backgroundPrimary));

        // 20. ink
        expect(AppColors.ink.toARGB32(), equals(0xFF17191F));
        expect(AppColors.ink, equals(AppColors.contentPrimary));

        // 21. textSecondary
        expect(AppColors.textSecondary.toARGB32(), equals(0xFF505050));
        expect(AppColors.textSecondary, equals(AppColors.contentSecondary));

        // 22. navy
        expect(AppColors.navy.toARGB32(), equals(0xFF102937));
        expect(AppColors.navy, equals(AppColors.brandNavy));

        // 23. error
        expect(AppColors.error.toARGB32(), equals(0xFFEE1314));
        expect(AppColors.error, equals(AppColors.statusError));

        // 24. success
        expect(AppColors.success.toARGB32(), equals(0xFF4CAF50));
        expect(AppColors.success, equals(AppColors.statusSuccess));
      },
    );
  });

  group('P3.1 - AppTheme Configuration & Component Wiring', () {
    test('bundled typography maps semantic roles to their families', () {
      expect(AppTypography.main().fontFamily, equals(AppTypography.mainFamily));
      final namedMain = AppTypography.mainWith(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: AppColors.contentPrimary,
      );
      expect(namedMain.fontFamily, equals(AppTypography.mainFamily));
      expect(namedMain.fontSize, equals(13));
      expect(namedMain.fontWeight, equals(FontWeight.w600));
      expect(namedMain.color, equals(AppColors.contentPrimary));
      expect(AppTypography.mono().fontFamily, equals(AppTypography.monoFamily));
      expect(
        AppTypography.display().fontFamily,
        equals(AppTypography.displayFamily),
      );
      expect(
        AppTypography.number().fontFamily,
        equals(AppTypography.displayFamily),
      );
      expect(
        AppTypography.pageTitle().fontFamily,
        equals(AppTypography.mainFamily),
      );
      expect(AppTypography.pageTitle().fontSize, equals(20));
      expect(AppTypography.pageTitle().height, equals(1.2));
      expect(AppTypography.pageTitle().letterSpacing, equals(0));
      expect(AppTypography.pageTitle().fontWeight, equals(FontWeight.w700));
      expect(AppTypography.pageTitle().color, equals(AppColors.contentPrimary));
      expect(
        sharedTheme.textTheme.bodyMedium?.fontFamily,
        equals(AppTypography.mainFamily),
      );
      expect(
        sharedTheme.textTheme.labelLarge?.fontFamily,
        equals(AppTypography.mainFamily),
      );
    });

    test('general ThemeData properties and ColorScheme', () {
      expect(sharedTheme.useMaterial3, isTrue);
      expect(sharedTheme.brightness, equals(Brightness.light));
      expect(
        sharedTheme.scaffoldBackgroundColor,
        equals(AppColors.backgroundPrimary),
      );

      expect(sharedTheme.colorScheme.primary, equals(AppColors.brandPrimary));
      expect(sharedTheme.colorScheme.secondary, equals(AppColors.brandAccent));
      expect(sharedTheme.colorScheme.surface, equals(AppColors.surfacePrimary));
      expect(sharedTheme.colorScheme.error, equals(AppColors.statusError));
      expect(
        sharedTheme.colorScheme.onPrimary,
        equals(AppColors.surfacePrimary),
      );
      expect(
        sharedTheme.colorScheme.onSecondary,
        equals(AppColors.contentPrimary),
      );
      expect(
        sharedTheme.colorScheme.onSurface,
        equals(AppColors.contentPrimary),
      );
    });

    test('TextTheme colors and font weights', () {
      final textTheme = sharedTheme.textTheme;

      expect(textTheme.displayLarge?.color, equals(AppColors.contentPrimary));
      expect(textTheme.displayLarge?.fontWeight, equals(FontWeight.bold));

      expect(textTheme.displayMedium?.color, equals(AppColors.contentPrimary));
      expect(textTheme.displayMedium?.fontWeight, equals(FontWeight.bold));

      expect(textTheme.displaySmall?.color, equals(AppColors.contentPrimary));
      expect(textTheme.displaySmall?.fontWeight, equals(FontWeight.bold));

      expect(textTheme.headlineLarge?.color, equals(AppColors.contentPrimary));
      expect(textTheme.headlineLarge?.fontWeight, equals(FontWeight.bold));

      expect(textTheme.headlineMedium?.color, equals(AppColors.contentPrimary));
      expect(textTheme.headlineMedium?.fontWeight, equals(FontWeight.bold));

      expect(textTheme.headlineSmall?.color, equals(AppColors.contentPrimary));
      expect(textTheme.headlineSmall?.fontWeight, equals(FontWeight.bold));

      expect(textTheme.titleLarge?.color, equals(AppColors.contentPrimary));
      expect(textTheme.titleLarge?.fontWeight, equals(FontWeight.bold));

      expect(textTheme.titleMedium?.color, equals(AppColors.contentPrimary));
      expect(textTheme.titleMedium?.fontWeight, equals(FontWeight.w600));

      expect(textTheme.titleSmall?.color, equals(AppColors.contentPrimary));
      expect(textTheme.titleSmall?.fontWeight, equals(FontWeight.w600));

      for (final style in [
        textTheme.displayLarge,
        textTheme.displayMedium,
        textTheme.displaySmall,
        textTheme.headlineLarge,
        textTheme.headlineMedium,
        textTheme.headlineSmall,
        textTheme.titleLarge,
        textTheme.titleMedium,
        textTheme.titleSmall,
      ]) {
        expect(style?.fontFamily, equals(AppTypography.displayFamily));
      }

      expect(textTheme.bodyLarge?.color, equals(AppColors.contentPrimary));
      expect(textTheme.bodyMedium?.color, equals(AppColors.contentPrimary));
      expect(textTheme.bodySmall?.color, equals(AppColors.contentSecondary));

      for (final style in [
        textTheme.bodyLarge,
        textTheme.bodyMedium,
        textTheme.bodySmall,
        textTheme.labelLarge,
        textTheme.labelMedium,
        textTheme.labelSmall,
      ]) {
        expect(style?.fontFamily, equals(AppTypography.mainFamily));
      }
    });

    test('AppBarTheme properties', () {
      final appBarTheme = sharedTheme.appBarTheme;
      expect(appBarTheme.backgroundColor, equals(AppColors.surfacePrimary));
      expect(appBarTheme.foregroundColor, equals(AppColors.contentPrimary));
      expect(appBarTheme.elevation, equals(0));
      expect(appBarTheme.scrolledUnderElevation, equals(0));
      expect(
        appBarTheme.surfaceTintColor,
        equals(AppColors.surfaceTintTransparent),
      );
      expect(appBarTheme.centerTitle, isTrue);
    });

    test('InputDecorationTheme properties', () {
      final inputTheme = sharedTheme.inputDecorationTheme;
      expect(inputTheme.hintStyle?.color, equals(AppColors.contentPlaceholder));
      expect(
        inputTheme.hintStyle?.fontFamily,
        equals(AppTypography.mainFamily),
      );
    });

    test('ElevatedButtonThemeData resolved properties', () {
      final buttonStyle = sharedTheme.elevatedButtonTheme.style;
      expect(buttonStyle, isNotNull);

      final bg = buttonStyle?.backgroundColor?.resolve({});
      expect(bg, equals(AppColors.brandPrimary));

      final fg = buttonStyle?.foregroundColor?.resolve({});
      expect(fg, equals(AppColors.surfacePrimary));

      final shape = buttonStyle?.shape?.resolve({}) as RoundedRectangleBorder?;
      expect(shape, isNotNull);
      expect(shape?.borderRadius, equals(BorderRadius.circular(8)));

      final textStyle = buttonStyle?.textStyle?.resolve({});
      expect(textStyle?.fontWeight, equals(FontWeight.bold));
      expect(textStyle?.fontFamily, equals(AppTypography.mainFamily));
    });

    test('CardThemeData properties', () {
      final cardTheme = sharedTheme.cardTheme;
      expect(cardTheme.color, equals(AppColors.surfacePrimary));
      expect(cardTheme.elevation, equals(2));
      expect(cardTheme.shadowColor, equals(AppColors.cardShadow));

      final shape = cardTheme.shape as RoundedRectangleBorder?;
      expect(shape, isNotNull);
      expect(shape?.borderRadius, equals(BorderRadius.circular(8)));
    });

    testWidgets(
      'pumps light MaterialApp and verifies resolved theme preservation',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: sharedTheme,
            home: Scaffold(
              appBar: AppBar(title: const Text('Theme Test Title')),
              body: Builder(
                builder: (context) => Center(
                  child: Column(
                    children: [
                      Text(
                        'Theme Test Title',
                        key: const ValueKey('theme-title'),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(
                        'Theme Test Body',
                        key: const ValueKey('theme-body'),
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      Text(
                        '800036',
                        key: const ValueKey('theme-lottery-number'),
                        style: AppTypography.number(
                          Theme.of(context).textTheme.displayMedium,
                        ),
                      ),
                      ElevatedButton(
                        onPressed: () {},
                        child: const Text('Theme Test Button'),
                      ),
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(8.0),
                          child: Text('Theme Test Card'),
                        ),
                      ),
                      const TextField(
                        decoration: InputDecoration(
                          hintText: 'Theme Test Input',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );

        // 1. Assert all required widgets build successfully
        expect(find.byType(MaterialApp), findsOneWidget);
        expect(find.byType(Scaffold), findsOneWidget);
        expect(find.byType(AppBar), findsOneWidget);
        expect(find.byType(ElevatedButton), findsOneWidget);
        expect(find.byType(Card), findsOneWidget);
        expect(find.byType(TextField), findsOneWidget);

        // 2. Assert resolved theme values in context
        final context = tester.element(find.byType(Scaffold));
        final resolvedTheme = Theme.of(context);

        // Palette & ColorScheme preservation
        expect(resolvedTheme.useMaterial3, isTrue);
        expect(resolvedTheme.brightness, equals(Brightness.light));
        expect(
          resolvedTheme.scaffoldBackgroundColor,
          equals(AppColors.backgroundPrimary),
        );
        expect(
          resolvedTheme.colorScheme.primary,
          equals(AppColors.brandPrimary),
        );
        expect(
          resolvedTheme.colorScheme.secondary,
          equals(AppColors.brandAccent),
        );
        expect(
          resolvedTheme.colorScheme.surface,
          equals(AppColors.surfacePrimary),
        );
        expect(resolvedTheme.colorScheme.error, equals(AppColors.statusError));
        expect(
          resolvedTheme.colorScheme.onPrimary,
          equals(AppColors.surfacePrimary),
        );
        expect(
          resolvedTheme.colorScheme.onSecondary,
          equals(AppColors.contentPrimary),
        );
        expect(
          resolvedTheme.colorScheme.onSurface,
          equals(AppColors.contentPrimary),
        );

        // Typography families preservation
        expect(
          resolvedTheme.textTheme.displayLarge?.fontFamily,
          equals(AppTypography.displayFamily),
        );
        expect(
          resolvedTheme.textTheme.displayMedium?.fontFamily,
          equals(AppTypography.displayFamily),
        );
        expect(
          resolvedTheme.textTheme.displaySmall?.fontFamily,
          equals(AppTypography.displayFamily),
        );
        expect(
          resolvedTheme.textTheme.headlineLarge?.fontFamily,
          equals(AppTypography.displayFamily),
        );
        expect(
          resolvedTheme.textTheme.headlineMedium?.fontFamily,
          equals(AppTypography.displayFamily),
        );
        expect(
          resolvedTheme.textTheme.headlineSmall?.fontFamily,
          equals(AppTypography.displayFamily),
        );
        expect(
          resolvedTheme.textTheme.titleLarge?.fontFamily,
          equals(AppTypography.displayFamily),
        );
        expect(
          resolvedTheme.textTheme.titleMedium?.fontFamily,
          equals(AppTypography.displayFamily),
        );
        expect(
          resolvedTheme.textTheme.titleSmall?.fontFamily,
          equals(AppTypography.displayFamily),
        );
        expect(
          resolvedTheme.textTheme.bodyLarge?.fontFamily,
          equals(AppTypography.mainFamily),
        );
        expect(
          resolvedTheme.textTheme.bodyMedium?.fontFamily,
          equals(AppTypography.mainFamily),
        );
        expect(
          resolvedTheme.textTheme.bodySmall?.fontFamily,
          equals(AppTypography.mainFamily),
        );

        final title = tester.widget<Text>(
          find.byKey(const ValueKey('theme-title')),
        );
        final body = tester.widget<Text>(
          find.byKey(const ValueKey('theme-body')),
        );
        final lotteryNumber = tester.widget<Text>(
          find.byKey(const ValueKey('theme-lottery-number')),
        );
        expect(title.style?.fontFamily, equals(AppTypography.displayFamily));
        expect(body.style?.fontFamily, equals(AppTypography.mainFamily));
        expect(
          lotteryNumber.style?.fontFamily,
          equals(AppTypography.displayFamily),
        );

        // AppBar resolved properties
        expect(
          resolvedTheme.appBarTheme.backgroundColor,
          equals(AppColors.surfacePrimary),
        );
        expect(
          resolvedTheme.appBarTheme.foregroundColor,
          equals(AppColors.contentPrimary),
        );
        expect(resolvedTheme.appBarTheme.elevation, equals(0));
        expect(resolvedTheme.appBarTheme.scrolledUnderElevation, equals(0));
        expect(
          resolvedTheme.appBarTheme.surfaceTintColor,
          equals(AppColors.surfaceTintTransparent),
        );
        expect(resolvedTheme.appBarTheme.centerTitle, isTrue);

        // ElevatedButton resolved colors, radius, and shape
        final resolvedButtonStyle = resolvedTheme.elevatedButtonTheme.style;
        expect(resolvedButtonStyle, isNotNull);
        expect(
          resolvedButtonStyle?.backgroundColor?.resolve({}),
          equals(AppColors.brandPrimary),
        );
        expect(
          resolvedButtonStyle?.foregroundColor?.resolve({}),
          equals(AppColors.surfacePrimary),
        );
        final resolvedButtonShape =
            resolvedButtonStyle?.shape?.resolve({}) as RoundedRectangleBorder?;
        expect(resolvedButtonShape, isNotNull);
        expect(
          resolvedButtonShape?.borderRadius,
          equals(BorderRadius.circular(8)),
        );

        // Card resolved colors, elevation, shadow, and radius
        final resolvedCardTheme = resolvedTheme.cardTheme;
        expect(resolvedCardTheme.color, equals(AppColors.surfacePrimary));
        expect(resolvedCardTheme.elevation, equals(2));
        expect(resolvedCardTheme.shadowColor, equals(AppColors.cardShadow));
        final resolvedCardShape =
            resolvedCardTheme.shape as RoundedRectangleBorder?;
        expect(resolvedCardShape, isNotNull);
        expect(
          resolvedCardShape?.borderRadius,
          equals(BorderRadius.circular(8)),
        );

        // TextField resolved hint color from InputDecorationTheme
        final resolvedInputTheme = resolvedTheme.inputDecorationTheme;
        expect(
          resolvedInputTheme.hintStyle?.color,
          equals(AppColors.contentPlaceholder),
        );
        expect(
          resolvedInputTheme.hintStyle?.fontFamily,
          equals(AppTypography.mainFamily),
        );
      },
    );
  });
}
