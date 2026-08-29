import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/features/profile/data/models/prize_payout_request.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/refund_request.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/support_ticket.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

class _BadgeColors {
  final Color bg;
  final Color fg;
  const _BadgeColors(this.bg, this.fg);
}

_BadgeColors _refundColors(RefundRequestStatus status) {
  switch (status) {
    case RefundRequestStatus.waitingForInfo:
      return const _BadgeColors(
        AppColors.statusWarningSurface,
        AppColors.statusWarningForeground,
      );
    case RefundRequestStatus.approved:
    case RefundRequestStatus.readyToPay:
      return const _BadgeColors(
        AppColors.statusInfoSurface,
        AppColors.statusInfoForeground,
      );
    case RefundRequestStatus.paid:
    case RefundRequestStatus.transferred:
      return const _BadgeColors(
        AppColors.statusSuccessSurface,
        AppColors.statusSuccessForeground,
      );
    case RefundRequestStatus.manualResolution:
      return const _BadgeColors(
        AppColors.statusDangerSurface,
        AppColors.statusDangerForeground,
      );
  }
}

_BadgeColors _ticketColors(TicketStatus status) {
  switch (status) {
    case TicketStatus.open:
      return const _BadgeColors(
        AppColors.statusInfoSurface,
        AppColors.statusInfoForeground,
      );
    case TicketStatus.inProgress:
      return const _BadgeColors(
        AppColors.statusWarningSurface,
        AppColors.statusWarningForeground,
      );
    case TicketStatus.waitingForCustomer:
      return const _BadgeColors(
        AppColors.statusAttentionSurface,
        AppColors.statusAttentionForeground,
      );
    case TicketStatus.resolved:
      return const _BadgeColors(
        AppColors.statusSuccessSurface,
        AppColors.statusSuccessForeground,
      );
    case TicketStatus.rejected:
      return const _BadgeColors(
        AppColors.statusErrorSurface,
        AppColors.statusErrorForeground,
      );
    case TicketStatus.closed:
      return const _BadgeColors(
        AppColors.statusNeutralSurface,
        AppColors.statusNeutralForeground,
      );
  }
}

_BadgeColors _payoutColors(PrizePayoutRequestStatus status) {
  switch (status) {
    case PrizePayoutRequestStatus.pending:
      return const _BadgeColors(
        AppColors.statusWarningSurface,
        AppColors.statusWarningForeground,
      );
    case PrizePayoutRequestStatus.approved:
      return const _BadgeColors(
        AppColors.statusInfoSurface,
        AppColors.statusInfoForeground,
      );
    case PrizePayoutRequestStatus.completed:
      return const _BadgeColors(
        AppColors.statusSuccessSurface,
        AppColors.statusSuccessForeground,
      );
    case PrizePayoutRequestStatus.rejected:
      return const _BadgeColors(
        AppColors.statusErrorSurface,
        AppColors.statusErrorForeground,
      );
    case PrizePayoutRequestStatus.manualResolution:
      return const _BadgeColors(
        AppColors.statusDangerSurface,
        AppColors.statusDangerForeground,
      );
    case PrizePayoutRequestStatus.cancelled:
      return const _BadgeColors(
        AppColors.statusNeutralSurface,
        AppColors.statusNeutralForeground,
      );
  }
}

Widget _pill(String label, Color bg, Color fg) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(
      label,
      style: AppTypography.mainWith(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: fg,
      ),
    ),
  );
}

class RefundStatusBadge extends StatelessWidget {
  final RefundRequestStatus status;
  const RefundStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final c = _refundColors(status);
    return _pill(status.label, c.bg, c.fg);
  }
}

class PrizePayoutStatusBadge extends StatelessWidget {
  final PrizePayoutRequestStatus status;
  const PrizePayoutStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final c = _payoutColors(status);
    return _pill(status.label, c.bg, c.fg);
  }
}

class ComplaintStatusBadge extends StatelessWidget {
  final TicketStatus status;
  const ComplaintStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final c = _ticketColors(status);
    return _pill(status.label, c.bg, c.fg);
  }
}
