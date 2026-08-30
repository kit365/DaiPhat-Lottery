import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AppColors - Token System & Visual Specifications', () {
    test('Brand Core & Accent Tokens', () {
      expect(AppColors.brandPrimary, equals(const Color(0xFFD31010)));
      expect(AppColors.brandPrimaryStrong, equals(const Color(0xFFEE1314)));
      expect(AppColors.brandPrimaryDark, equals(const Color(0xFFA60F14)));
      expect(AppColors.brandPrimaryCrimson, equals(const Color(0xFF7F1D1D)));
      expect(AppColors.brandPrimaryDarkRed, equals(const Color(0xFFB91C1C)));
      expect(AppColors.brandSecondary, equals(const Color(0xFF2065D1)));
      expect(AppColors.brandAccent, equals(const Color(0xFFFFD700)));
      expect(AppColors.brandAccentYellow, equals(const Color(0xFFFDE047)));
      expect(AppColors.brandAccentGoldAmber, equals(const Color(0xFFF59E0B)));
      expect(AppColors.brandAccentOrange, equals(const Color(0xFFEA580C)));
      expect(AppColors.brandAccentPurple, equals(const Color(0xFF9E5FFF)));
      expect(AppColors.brandNavy, equals(const Color(0xFF102937)));
    });

    test('Surface & Background Tokens', () {
      expect(AppColors.surfacePrimary, equals(Colors.white));
      expect(AppColors.backgroundPrimary, equals(const Color(0xFFF5F6FA)));
      expect(AppColors.backgroundWarm, equals(const Color(0xFFFDF9F9)));
      expect(AppColors.surfaceBrandWarm, equals(const Color(0xFFF9ECEE)));
      expect(AppColors.surfaceDestructiveSoft, equals(const Color(0xFFFFF1F0)));
      expect(AppColors.surfaceSlate50, equals(const Color(0xFFF8FAFC)));
      expect(AppColors.surfaceSlate100, equals(const Color(0xFFF1F5F9)));
      expect(AppColors.surfaceNeutral, equals(const Color(0xFFF4F6F8)));
      expect(AppColors.surfaceWarning, equals(const Color(0xFFFFFBEB)));
      expect(AppColors.surfaceAccentPurple, equals(const Color(0xFFF8F5FF)));
    });

    test('Content & Typography Color Tokens', () {
      expect(AppColors.contentPrimary, equals(const Color(0xFF17191F)));
      expect(AppColors.contentHeading, equals(const Color(0xFF111111)));
      expect(AppColors.contentLabel, equals(const Color(0xFF333333)));
      expect(AppColors.contentSecondary, equals(const Color(0xFF505050)));
      expect(AppColors.contentMuted, equals(const Color(0xFF64748B)));
      expect(AppColors.contentPlaceholder, equals(const Color(0xFF767676)));
      expect(AppColors.contentNeutral, equals(const Color(0xFF637381)));
      expect(AppColors.contentNavy, equals(const Color(0xFF1E293B)));
    });

    test('Border & Shadow Tokens', () {
      expect(AppColors.borderDefault, equals(const Color(0xFFE5E7EB)));
      expect(AppColors.borderLight, equals(const Color(0xFFE5E8EB)));
      expect(AppColors.borderSubtle, equals(const Color(0xFFE2E8F0)));
      expect(AppColors.borderMuted, equals(const Color(0xFFCBD5E1)));
      expect(AppColors.borderDecorative, equals(const Color(0xFFEAEBED)));
      expect(AppColors.brandPrimaryBorder, equals(const Color(0xFFFECACA)));
      expect(AppColors.brandPrimaryBorderLight, equals(const Color(0xFFFFE0E0)));
      expect(AppColors.shadowLight, equals(const Color(0x08000000)));
      expect(AppColors.shadowBrandFaint, equals(const Color(0x12D31010)));
    });

    test('Status Feedback Color Pairs', () {
      expect(AppColors.statusSuccess, equals(const Color(0xFF4CAF50)));
      expect(AppColors.statusSuccessSurface, equals(const Color(0xFFE4F8ED)));
      expect(AppColors.statusInfoSurface, equals(const Color(0xFFEFF8FF)));
      expect(AppColors.statusInfoForeground, equals(const Color(0xFF175CD3)));
      expect(AppColors.statusWarningSurface, equals(const Color(0xFFFFF9F3)));
      expect(AppColors.statusWarningForeground, equals(const Color(0xFFB76E00)));
      expect(AppColors.statusAttentionSurface, equals(const Color(0xFFFFF4E5)));
      expect(AppColors.statusAttentionForeground, equals(const Color(0xFF9A4D00)));
    });

    test('Fortune Domain Tokens', () {
      expect(AppColors.fortuneBackgroundDark, equals(const Color(0xFF3D0A0C)));
      expect(AppColors.fortuneGold, equals(const Color(0xFFE8C872)));
      expect(AppColors.fortuneGoldLight, equals(const Color(0xFFFDE68A)));
      expect(AppColors.fortuneCrimson, equals(const Color(0xFF8B1A1C)));
      expect(AppColors.fortuneWoodDark, equals(const Color(0xFF5C1A0A)));
    });

    test('Backward Compatibility Aliases', () {
      expect(AppColors.primary, equals(AppColors.brandPrimary));
      expect(AppColors.primaryDark, equals(AppColors.brandPrimaryDark));
      expect(AppColors.accent, equals(AppColors.brandAccent));
      expect(AppColors.background, equals(AppColors.backgroundPrimary));
      expect(AppColors.surface, equals(AppColors.surfacePrimary));
      expect(AppColors.textMain, equals(AppColors.contentHeading));
      expect(AppColors.textMuted, equals(AppColors.contentMuted));
      expect(AppColors.cardBorder, equals(AppColors.borderDefault));
      expect(AppColors.loginPrimary, equals(AppColors.brandLoginPrimary));
      expect(AppColors.loginTitle, equals(AppColors.brandLoginTitle));
      expect(AppColors.loginGold, equals(AppColors.brandLoginGold));
    });
  });
}
