import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

/// Canonical icon vocabulary for the Profile feature.
///
/// Views should reference these domain concepts instead of selecting ad-hoc
/// Material glyph variants. This keeps repeated actions visually consistent.
abstract final class ProfileIconography {
  static const IconData ticket = Icons.confirmation_number_rounded;
  static const IconData buyTicket = Icons.shopping_cart_checkout_rounded;
  static const IconData pendingTicket = Icons.schedule_rounded;
  static const IconData drawnTicket = Icons.fact_check_rounded;
  static const IconData order = Icons.receipt_long_rounded;
  static const IconData prize = Icons.emoji_events_rounded;
  static const IconData spending = Icons.query_stats_rounded;
  static const IconData chat = Icons.chat_bubble_outline_rounded;
  static const IconData support = Icons.headset_mic_rounded;
  static const IconData edit = Icons.edit_rounded;
  static const IconData notifications = Icons.notifications_rounded;
  static const IconData profile = Icons.account_circle_rounded;
  static const IconData identity = Icons.badge_rounded;
  static const IconData refund = Icons.currency_exchange_rounded;
  static const IconData bankAccount = Icons.account_balance_wallet_rounded;
  static const IconData chevron = Icons.chevron_right_rounded;
}

abstract final class ProfileIconTone {
  /// Brand is the default for actions and non-status account data.
  static const Color standard = AppColors.primary;
  static const Color standardSurface = AppColors.surfaceBrandWarm;

  static const Color ticket = standard;
  static const Color ticketSurface = standardSurface;
  static const Color order = standard;
  static const Color orderSurface = standardSurface;
  static const Color prize = AppColors.statusWarningForeground;
  static const Color prizeSurface = AppColors.brandAccentLight;
  static const Color drawn = AppColors.contentSlate600;
  static const Color drawnSurface = AppColors.surfaceSlate100;
  static const Color spending = standard;
  static const Color spendingSurface = standardSurface;
  static const Color support = standard;
  static const Color supportSurface = standardSurface;
}

class ProfileIconWell extends StatelessWidget {
  const ProfileIconWell({
    super.key,
    required this.icon,
    required this.color,
    required this.surface,
    this.size = 40,
    this.iconSize = 22,
  });

  final IconData icon;
  final Color color;
  final Color surface;
  final double size;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(size * .3),
      ),
      alignment: Alignment.center,
      child: Icon(icon, color: color, size: iconSize),
    );
  }
}
