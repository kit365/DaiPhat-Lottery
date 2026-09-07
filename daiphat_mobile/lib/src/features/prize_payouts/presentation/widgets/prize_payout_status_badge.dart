import 'package:flutter/material.dart';

import '../../domain/entities/prize_payout_request.dart';
import '../../../../shared/theme/app_colors.dart';
import '../../../../shared/theme/app_typography.dart';

class PrizePayoutStatusBadge extends StatelessWidget {
  final PrizePayoutRequestStatus status;
  const PrizePayoutStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (status) {
      PrizePayoutRequestStatus.pending => (
        AppColors.statusWarningSurface,
        AppColors.statusWarningForeground,
      ),
      PrizePayoutRequestStatus.approved => (
        AppColors.statusInfoSurface,
        AppColors.statusInfoForeground,
      ),
      PrizePayoutRequestStatus.completed => (
        AppColors.statusSuccessSurface,
        AppColors.statusSuccessForeground,
      ),
      PrizePayoutRequestStatus.rejected => (
        AppColors.statusErrorSurface,
        AppColors.statusErrorForeground,
      ),
      PrizePayoutRequestStatus.manualResolution => (
        AppColors.statusDangerSurface,
        AppColors.statusDangerForeground,
      ),
      PrizePayoutRequestStatus.cancelled => (
        AppColors.statusNeutralSurface,
        AppColors.statusNeutralForeground,
      ),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.label,
        style: AppTypography.mainWith(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: foreground,
        ),
      ),
    );
  }
}
