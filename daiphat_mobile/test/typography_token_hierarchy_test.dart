import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AppTypography - Token Hierarchy & Font Families', () {
    test('Headings H1 - H6 use Barlow with exact hierarchy', () {
      final h1 = AppTypography.h1();
      expect(h1.fontFamily, equals(AppTypography.displayFamily));
      expect(h1.fontSize, equals(32));
      expect(h1.fontWeight, equals(FontWeight.w800));
      expect(h1.height, equals(1.25));
      expect(h1.letterSpacing, equals(-0.5));

      final h2 = AppTypography.h2();
      expect(h2.fontFamily, equals(AppTypography.displayFamily));
      expect(h2.fontSize, equals(26));
      expect(h2.fontWeight, equals(FontWeight.w800));
      expect(h2.height, equals(1.25));
      expect(h2.letterSpacing, equals(-0.3));

      final h3 = AppTypography.h3();
      expect(h3.fontFamily, equals(AppTypography.displayFamily));
      expect(h3.fontSize, equals(22));
      expect(h3.fontWeight, equals(FontWeight.w700));
      expect(h3.height, equals(1.30));

      final h4 = AppTypography.h4();
      expect(h4.fontFamily, equals(AppTypography.displayFamily));
      expect(h4.fontSize, equals(18));
      expect(h4.fontWeight, equals(FontWeight.w700));
      expect(h4.height, equals(1.35));

      final h5 = AppTypography.h5();
      expect(h5.fontFamily, equals(AppTypography.displayFamily));
      expect(h5.fontSize, equals(16));
      expect(h5.fontWeight, equals(FontWeight.w700));
      expect(h5.height, equals(1.40));

      final h6 = AppTypography.h6();
      expect(h6.fontFamily, equals(AppTypography.displayFamily));
      expect(h6.fontSize, equals(14));
      expect(h6.fontWeight, equals(FontWeight.w600));
      expect(h6.height, equals(1.40));

      final titleSmall = AppTypography.titleSmall();
      expect(titleSmall.fontFamily, equals(AppTypography.displayFamily));
      expect(titleSmall.fontSize, equals(13));
      expect(titleSmall.fontWeight, equals(FontWeight.w600));
    });

    test('Body & Subtitle tokens use Public Sans', () {
      final bodyLarge = AppTypography.bodyLarge();
      expect(bodyLarge.fontFamily, equals(AppTypography.mainFamily));
      expect(bodyLarge.fontSize, equals(16));
      expect(bodyLarge.fontWeight, equals(FontWeight.w400));
      expect(bodyLarge.height, equals(1.50));

      final bodyMedium = AppTypography.bodyMedium();
      expect(bodyMedium.fontFamily, equals(AppTypography.mainFamily));
      expect(bodyMedium.fontSize, equals(14));
      expect(bodyMedium.fontWeight, equals(FontWeight.w400));
      expect(bodyMedium.height, equals(1.50));

      final bodySmall = AppTypography.bodySmall();
      expect(bodySmall.fontFamily, equals(AppTypography.mainFamily));
      expect(bodySmall.fontSize, equals(12));
      expect(bodySmall.fontWeight, equals(FontWeight.w400));
      expect(bodySmall.height, equals(1.45));

      final sub1 = AppTypography.subtitle1();
      expect(sub1.fontFamily, equals(AppTypography.mainFamily));
      expect(sub1.fontSize, equals(15));
      expect(sub1.fontWeight, equals(FontWeight.w500));

      final sub2 = AppTypography.subtitle2();
      expect(sub2.fontFamily, equals(AppTypography.mainFamily));
      expect(sub2.fontSize, equals(13));
      expect(sub2.fontWeight, equals(FontWeight.w500));
    });

    test('Buttons & Labels use Public Sans with max weight w700', () {
      final bLarge = AppTypography.buttonLarge();
      expect(bLarge.fontFamily, equals(AppTypography.mainFamily));
      expect(bLarge.fontSize, equals(16));
      expect(bLarge.fontWeight, equals(FontWeight.w700));

      final bMedium = AppTypography.buttonMedium();
      expect(bMedium.fontFamily, equals(AppTypography.mainFamily));
      expect(bMedium.fontSize, equals(14));
      expect(bMedium.fontWeight, equals(FontWeight.w600));

      final bSmall = AppTypography.buttonSmall();
      expect(bSmall.fontFamily, equals(AppTypography.mainFamily));
      expect(bSmall.fontSize, equals(12));
      expect(bSmall.fontWeight, equals(FontWeight.w600));

      final lLarge = AppTypography.labelLarge();
      expect(lLarge.fontFamily, equals(AppTypography.mainFamily));
      expect(lLarge.fontSize, equals(14));
      expect(lLarge.fontWeight, equals(FontWeight.w600));

      final lMedium = AppTypography.labelMedium();
      expect(lMedium.fontFamily, equals(AppTypography.mainFamily));
      expect(lMedium.fontSize, equals(12));
      expect(lMedium.fontWeight, equals(FontWeight.w600));

      final lSmall = AppTypography.labelSmall();
      expect(lSmall.fontFamily, equals(AppTypography.mainFamily));
      expect(lSmall.fontSize, equals(11));
      expect(lSmall.fontWeight, equals(FontWeight.w500));

      final cap = AppTypography.caption();
      expect(cap.fontFamily, equals(AppTypography.mainFamily));
      expect(cap.fontSize, equals(11));
      expect(cap.fontWeight, equals(FontWeight.w400));

      final overline = AppTypography.overline();
      expect(overline.fontFamily, equals(AppTypography.mainFamily));
      expect(overline.fontSize, equals(10));
      expect(overline.fontWeight, equals(FontWeight.w700));
    });

    test('Domain tokens for Lottery, Pricing, Mono & Traditional', () {
      final lottoSpecial = AppTypography.lotterySpecial();
      expect(lottoSpecial.fontFamily, equals(AppTypography.displayFamily));
      expect(lottoSpecial.fontSize, equals(32));
      expect(lottoSpecial.fontWeight, equals(FontWeight.w900));

      final lottoPrize = AppTypography.lotteryPrize();
      expect(lottoPrize.fontFamily, equals(AppTypography.displayFamily));
      expect(lottoPrize.fontSize, equals(22));
      expect(lottoPrize.fontWeight, equals(FontWeight.w800));

      final lottoDigit = AppTypography.lotteryDigit();
      expect(lottoDigit.fontFamily, equals(AppTypography.displayFamily));
      expect(lottoDigit.fontSize, equals(18));
      expect(lottoDigit.fontWeight, equals(FontWeight.w700));

      final priceL = AppTypography.priceLarge();
      expect(priceL.fontFamily, equals(AppTypography.displayFamily));
      expect(priceL.fontSize, equals(20));
      expect(priceL.fontWeight, equals(FontWeight.w800));

      final priceM = AppTypography.priceMedium();
      expect(priceM.fontFamily, equals(AppTypography.displayFamily));
      expect(priceM.fontSize, equals(16));
      expect(priceM.fontWeight, equals(FontWeight.w700));

      final mono = AppTypography.monoCode();
      expect(mono.fontFamily, equals(AppTypography.monoFamily));
      expect(mono.fontSize, equals(13));
      expect(mono.fontWeight, equals(FontWeight.w600));

      final trad = AppTypography.traditional();
      expect(trad.fontFamily, equals(AppTypography.traditionalFamily));
      expect(trad.fontSize, equals(28));
      expect(trad.fontWeight, equals(FontWeight.w900));
      expect(trad.fontFamilyFallback, contains('Noto Serif CJK SC'));
    });

    test('Overrides via arguments and textStyle merge work cleanly', () {
      final coloredH2 = AppTypography.h2(color: Colors.red);
      expect(coloredH2.color, equals(Colors.red));
      expect(coloredH2.fontSize, equals(26));
      expect(coloredH2.fontWeight, equals(FontWeight.w800));

      final mergedBody = AppTypography.bodyMedium(
        textStyle: const TextStyle(letterSpacing: 1.5, decoration: TextDecoration.underline),
      );
      expect(mergedBody.letterSpacing, equals(1.5));
      expect(mergedBody.decoration, equals(TextDecoration.underline));
      expect(mergedBody.fontFamily, equals(AppTypography.mainFamily));
    });

    test('pageTitle preserves exact legacy contract', () {
      final pt = AppTypography.pageTitle();
      expect(pt.fontFamily, equals(AppTypography.mainFamily));
      expect(pt.fontSize, equals(20));
      expect(pt.fontWeight, equals(FontWeight.w700));
      expect(pt.height, equals(1.2));
      expect(pt.letterSpacing, equals(0));
      expect(pt.color, equals(AppColors.contentPrimary));
    });

    test('createTextTheme resolves colors correctly for light and dark schemes', () {
      const lightScheme = ColorScheme.light(
        onSurface: Color(0xFF17191F),
        onSurfaceVariant: Color(0xFF64748B),
      );
      final lightTheme = AppTypography.createTextTheme(lightScheme);
      expect(lightTheme.displayLarge?.color, equals(const Color(0xFF17191F)));
      expect(lightTheme.bodySmall?.color, equals(const Color(0xFF64748B)));

      const darkScheme = ColorScheme.dark(
        onSurface: Color(0xFFFFFFFF),
        onSurfaceVariant: Color(0xFFAAAAAA),
      );
      final darkTheme = AppTypography.createTextTheme(darkScheme);
      expect(darkTheme.displayLarge?.color, equals(const Color(0xFFFFFFFF)));
      expect(darkTheme.bodySmall?.color, equals(const Color(0xFFAAAAAA)));
    });
  });
}
