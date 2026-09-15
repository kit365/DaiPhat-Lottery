import 'package:flutter/material.dart';

import '../../../domain/entities/lottery_result.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

/// Displays the complete draw board for the station used in a ticket lookup.
///
/// This is intentionally separate from [ResultsCard]: the lookup screen has a
/// single station and needs a compact, two-column layout that remains readable
/// on narrow phones.
class TicketCheckResultsCard extends StatelessWidget {
  const TicketCheckResultsCard({
    required this.result,
    super.key,
  });

  final LotteryResult result;

  @override
  Widget build(BuildContext context) {
    final rows = <LotteryPrizeRow>[
      LotteryPrizeRow(
        label: 'Đặc biệt',
        values: result.prizes.special.trim().isEmpty
            ? const []
            : [result.prizes.special],
        highlight: true,
      ),
      ...result.prizeRows,
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(14, 16, 14, 14),
        decoration: BoxDecoration(
          color: AppColors.surfacePrimary,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.borderDecorative),
          boxShadow: const [
            BoxShadow(
              color: AppColors.shadowFaint,
              blurRadius: 12,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _ResultHeading(result: result),
            const SizedBox(height: 14),
            _FullResultsTable(rows: rows),
          ],
        ),
      ),
    );
  }
}

class _ResultHeading extends StatelessWidget {
  const _ResultHeading({required this.result});

  final LotteryResult result;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 5,
              height: 38,
              margin: const EdgeInsets.only(right: 10, top: 2),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(5),
              ),
            ),
            Expanded(
              child: Text.rich(
                TextSpan(
                  text: 'Kết quả đài ',
                  style: AppTypography.h4(
                    color: AppColors.contentHeading,
                    fontWeight: FontWeight.w800,
                  ),
                  children: [
                    TextSpan(
                      text: result.province,
                      style: AppTypography.h4(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                softWrap: true,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Padding(
          padding: const EdgeInsets.only(left: 15),
          child: Text(
            '${result.dayOfWeek}, ${result.dateLabel}',
            style: AppTypography.bodyLarge(color: AppColors.contentMuted),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _InfoChip(
              icon: Icons.account_balance_rounded,
              label: result.province,
              emphasized: true,
            ),
            _InfoChip(
              icon: Icons.calendar_month_rounded,
              label: result.dateLabel,
            ),
          ],
        ),
        const SizedBox(height: 12),
        Align(
          alignment: Alignment.centerLeft,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: AppColors.brandPrimarySubtle,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              'Kết quả đầy đủ',
              style: AppTypography.labelMedium(
                color: AppColors.primary,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.icon,
    required this.label,
    this.emphasized = false,
  });

  final IconData icon;
  final String label;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 42),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: emphasized ? AppColors.brandPrimarySubtle : AppColors.surfaceSoft,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: emphasized
              ? AppColors.brandPrimaryBorderLight
              : AppColors.borderSubtle,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 19,
            color: emphasized ? AppColors.primary : AppColors.contentSlate700,
          ),
          const SizedBox(width: 7),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 170),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.labelLarge(
                color: emphasized
                    ? AppColors.primary
                    : AppColors.contentSlate700,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FullResultsTable extends StatelessWidget {
  const _FullResultsTable({required this.rows});

  final List<LotteryPrizeRow> rows;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(15),
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.borderSubtle),
          borderRadius: BorderRadius.circular(15),
        ),
        child: Column(
          children: [
            const _TableHeader(),
            for (var index = 0; index < rows.length; index += 1)
              _PrizeRow(row: rows[index], odd: index.isOdd),
          ],
        ),
      ),
    );
  }
}

class _TableHeader extends StatelessWidget {
  const _TableHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surfaceSlate100,
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(
        children: [
          const SizedBox(
            width: 104,
            child: Text('Giải', textAlign: TextAlign.center),
          ),
          Expanded(child: Text('Kết quả', textAlign: TextAlign.center)),
        ],
      ),
    );
  }
}

class _PrizeRow extends StatelessWidget {
  const _PrizeRow({required this.row, required this.odd});

  final LotteryPrizeRow row;
  final bool odd;

  @override
  Widget build(BuildContext context) {
    final isSpecial = row.label == 'Đặc biệt';
    final labelStyle = AppTypography.bodyMedium(
      color: row.highlight || isSpecial
          ? AppColors.primary
          : AppColors.contentMuted,
      fontWeight: FontWeight.w700,
    );
    final valueStyle = isSpecial
        ? AppTypography.priceLarge(color: AppColors.primary)
        : AppTypography.lotteryPrize(
            color: row.highlight ? AppColors.primary : AppColors.contentHeading,
            fontWeight: row.highlight ? FontWeight.w800 : FontWeight.w500,
          );

    return Container(
      color: odd ? AppColors.tableRowOdd : AppColors.tableRowEven,
      constraints: const BoxConstraints(minHeight: 52),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 104,
              alignment: Alignment.topCenter,
              padding: const EdgeInsets.fromLTRB(6, 13, 6, 10),
              decoration: const BoxDecoration(
                border: Border(right: BorderSide(color: AppColors.borderSubtle)),
              ),
              child: Text(row.label, textAlign: TextAlign.center, style: labelStyle),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                child: row.values.isEmpty
                    ? Text(
                        'Đang cập nhật',
                        textAlign: TextAlign.center,
                        style: AppTypography.bodySmall(color: AppColors.contentMuted),
                      )
                    : Wrap(
                        alignment: WrapAlignment.center,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 18,
                        runSpacing: 6,
                        children: [
                          for (final value in row.values)
                            Text(value, textAlign: TextAlign.center, style: valueStyle),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
