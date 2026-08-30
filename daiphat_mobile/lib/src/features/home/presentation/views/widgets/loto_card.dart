import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/features/home/data/models/lottery_result.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

class LotoCard extends StatefulWidget {
  final List<String> provinces;
  final List<LotteryResult> results;

  const LotoCard({
    super.key,
    required this.provinces,
    required this.results,
  });

  @override
  State<LotoCard> createState() => _LotoCardState();
}

class _LotoCardState extends State<LotoCard> {
  String? _province;

  @override
  void didUpdateWidget(LotoCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_province != null && !widget.provinces.contains(_province)) {
      setState(() => _province = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredResults = _province == null
        ? widget.results
        : widget.results
            .where((item) => item.province == _province)
            .toList();
    final rows = calculateLotoRows(
      filteredResults.expand((item) => item.allPrizeNumbers),
    );

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .03),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.grid_view_rounded, color: AppColors.primary, size: 18),
                    const SizedBox(width: 7),
                    Text(
                      'BẢNG LÔ TÔ',
                      style: AppTypography.h5(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textMain,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Container(
                  height: 38,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: AppColors.pageBg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String?>(
                      value: _province,
                      isExpanded: true,
                      isDense: true,
                      icon: const Icon(
                        Icons.keyboard_arrow_down_rounded,
                        size: 18,
                        color: AppColors.textMuted,
                      ),
                      style: AppTypography.subtitle2(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textMain,
                      ),
                      onChanged: (value) => setState(() => _province = value),
                      items: [
                        const DropdownMenuItem<String?>(
                          value: null,
                          child: Text('Tất cả đài'),
                        ),
                        ...widget.provinces.map(
                          (province) => DropdownMenuItem<String?>(
                            value: province,
                            child: Text('Đài $province'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          _buildLotoTable(rows),
        ],
      ),
    );
  }

  Widget _buildLotoTable(List<LotoRowData> rows) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppColors.cardBorder)),
      ),
      child: Column(
        children: [
          Container(
            color: AppColors.rowOdd,
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Row(
              children: [
                Expanded(
                  flex: 4,
                  child: Text(
                    'CHỤC',
                    textAlign: TextAlign.center,
                    style: AppTypography.labelSmall(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textMain,
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    'SỐ',
                    textAlign: TextAlign.center,
                    style: AppTypography.labelSmall(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                Expanded(
                  flex: 4,
                  child: Text(
                    'ĐƠN VỊ',
                    textAlign: TextAlign.center,
                    style: AppTypography.labelSmall(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textMain,
                    ),
                  ),
                ),
              ],
            ),
          ),
          ...rows.asMap().entries.map((entry) {
            final index = entry.key;
            final row = entry.value;
            return Container(
              padding: const EdgeInsets.symmetric(vertical: 9),
              decoration: BoxDecoration(
                color: index.isEven ? AppColors.rowEven : AppColors.rowOdd,
                border: const Border(
                  top: BorderSide(color: AppColors.cardBorder, width: .5),
                ),
              ),
              child: Row(
                children: [
                  Expanded(flex: 4, child: _superscript(row.heads)),
                  Expanded(
                    flex: 2,
                    child: Text(
                      row.focus,
                      textAlign: TextAlign.center,
                      style: AppTypography.lotteryDigit(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  Expanded(flex: 4, child: _superscript(row.tails)),
                ],
              ),
            );
          }),
          const SizedBox(height: 6),
        ],
      ),
    );
  }

  Widget _superscript(String text) {
    if (text.isEmpty) {
      return const SizedBox();
    }

    final parts = text.split(', ');
    final spans = <InlineSpan>[];

    for (var index = 0; index < parts.length; index += 1) {
      final value = parts[index];
      if (value.contains('^')) {
        final split = value.split('^');
        spans.add(
          TextSpan(
            text: split[0],
            style: AppTypography.lotteryDigit(
              color: AppColors.textMain,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        );
        spans.add(
          WidgetSpan(
            child: Transform.translate(
              offset: const Offset(0, -5),
              child: Text(
                split[1],
                style: AppTypography.overline(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w800,
                  fontSize: 9,
                ),
              ),
            ),
          ),
        );
      } else {
        spans.add(
          TextSpan(
            text: value,
            style: AppTypography.lotteryDigit(
              color: AppColors.textMain,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        );
      }

      if (index < parts.length - 1) {
        spans.add(
          TextSpan(
            text: ', ',
            style: AppTypography.lotteryDigit(
              color: AppColors.textMain,
              fontSize: 13,
            ),
          ),
        );
      }
    }

    return RichText(
      textAlign: TextAlign.center,
      text: TextSpan(children: spans),
    );
  }
}
