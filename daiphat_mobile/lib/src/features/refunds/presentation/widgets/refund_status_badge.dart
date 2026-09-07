import 'package:flutter/material.dart';

import '../../domain/entities/refund_request.dart';
import '../../../../shared/theme/app_colors.dart';
import '../../../../shared/theme/app_typography.dart';

class RefundStatusBadge extends StatelessWidget {
  final RefundRequestStatus status;
  const RefundStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (status) {
      RefundRequestStatus.waitingForInfo => (
        AppColors.statusWarningSurface,
        AppColors.statusWarningForeground,
      ),
      RefundRequestStatus.approved || RefundRequestStatus.readyToPay => (
        AppColors.statusInfoSurface,
        AppColors.statusInfoForeground,
      ),
      RefundRequestStatus.paid || RefundRequestStatus.transferred => (
        AppColors.statusSuccessSurface,
        AppColors.statusSuccessForeground,
      ),
      RefundRequestStatus.manualResolution => (
        AppColors.statusDangerSurface,
        AppColors.statusDangerForeground,
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
