import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/utils/ticket_number_utils.dart';

enum TicketNumberDisplayVariant { compact, detail, inline }

/// One visual treatment for a full lottery number across tickets and orders.
class TicketNumberDisplay extends StatelessWidget {
  final String? value;
  final TicketNumberDisplayVariant variant;

  const TicketNumberDisplay.compact({super.key, required this.value})
    : variant = TicketNumberDisplayVariant.compact;

  const TicketNumberDisplay.detail({super.key, required this.value})
    : variant = TicketNumberDisplayVariant.detail;

  const TicketNumberDisplay.inline({super.key, required this.value})
    : variant = TicketNumberDisplayVariant.inline;

  @override
  Widget build(BuildContext context) {
    final number = normalizeTicketNumber(value);
    final isDetail = variant == TicketNumberDisplayVariant.detail;
    final isInline = variant == TicketNumberDisplayVariant.inline;

    return Semantics(
      label: number.isEmpty ? 'Chưa có dãy số vé' : 'Dãy số vé $number',
      child: Container(
        width: double.infinity,
        padding: isInline
            ? EdgeInsets.zero
            : isDetail
            ? const EdgeInsets.symmetric(horizontal: 14, vertical: 14)
            : const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: isInline
            ? null
            : BoxDecoration(
                color: AppColors.ticketNumberSurface,
                borderRadius: BorderRadius.circular(isDetail ? 14 : 12),
                border: Border.all(color: AppColors.ticketNumberBorder),
              ),
        child: FittedBox(
          alignment: isDetail ? Alignment.center : Alignment.centerLeft,
          fit: BoxFit.scaleDown,
          child: Text(
            number.isEmpty ? '—' : number,
            textAlign: isDetail ? TextAlign.center : TextAlign.left,
            style: AppTypography.lotteryPrize(
              fontSize: isDetail
                  ? 30
                  : isInline
                  ? 24
                  : 20,
              fontWeight: FontWeight.w900,
              letterSpacing: isDetail ? 1.5 : 0.8,
              color: AppColors.ticketNumberForeground,
            ),
          ),
        ),
      ),
    );
  }
}

