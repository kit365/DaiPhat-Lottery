import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/features/home/domain/entities/lottery_result.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

class ResultsCard extends StatefulWidget {
  final List<LotteryResult> results;
  final List<String> displayProvinces;
  final bool isSingleSel;
  final String? selLabel;
  final bool isWaitingForResults;

  const ResultsCard({
    super.key,
    required this.results,
    required this.displayProvinces,
    required this.isSingleSel,
    required this.selLabel,
    required this.isWaitingForResults,
  });

  @override
  State<ResultsCard> createState() => _ResultsCardState();
}

class _ResultsCardState extends State<ResultsCard> {
  String _displayType = 'ĐẦY ĐỦ';
  final Set<String> _digits = <String>{};

  @override
  Widget build(BuildContext context) {
    final provinces = widget.displayProvinces;
    final isSingle = provinces.length == 1;
    final resultsByProvince = <String, LotteryResult>{
      for (final result in widget.results) result.province: result,
    };

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfacePrimary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(15),
          child: Column(
            children: [
              if (!isSingle) _buildProvinceHeader(provinces),
              _buildSpecialRow(provinces, isSingle, resultsByProvince),
              _buildPrizeTable(provinces, isSingle, resultsByProvince),
              _buildFilterBar(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProvinceHeader(List<String> provinces) {
    return Container(
      color: const Color(0xFFF8FAFC),
      child: Row(
        children: [
          Container(
            width: 72,
            padding: const EdgeInsets.symmetric(vertical: 10),
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              border: Border(right: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: const Text(
              'Giải',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Color(0xFF333333),
              ),
            ),
          ),
          ...provinces.map(
            (province) {
              final shortName =
                  (province == 'TP. Hồ Chí Minh' || province == 'Hồ Chí Minh')
                      ? 'TP. HCM'
                      : province;
              return Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    vertical: 8,
                    horizontal: 2,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFCE5DF).withValues(alpha: 0.35),
                    border: province != provinces.last
                        ? const Border(
                            right: BorderSide(color: Color(0xFFF1F5F9)),
                          )
                        : null,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    shortName,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: provinces.length > 3 ? 10.5 : 12,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFFEE1314),
                      height: 1.15,
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSpecialRow(
    List<String> provinces,
    bool isSingle,
    Map<String, LotteryResult> resultsByProvince,
  ) {
    final singleResult = provinces.isNotEmpty
        ? resultsByProvince[provinces.first]
        : null;

    return IntrinsicHeight(
      child: Container(
        decoration: BoxDecoration(
          color: isSingle
              ? AppColors.surfaceBrandLight.withValues(alpha: .3)
              : AppColors.surfacePrimary,
          border: const Border(
            bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (isSingle)
              Container(
                width: 90,
                padding: const EdgeInsets.symmetric(
                  vertical: 20,
                  horizontal: 8,
                ),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.brandPrimaryDeep,
                      AppColors.brandPrimaryStrong,
                    ],
                  ),
                  border: Border(
                    right: BorderSide(
                      color: AppColors.white.withValues(alpha: 0.1),
                    ),
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.star_rounded,
                      color: AppColors.brandAccentGoldMuted,
                      size: 22,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Giải\nĐẶC BIỆT',
                      textAlign: TextAlign.center,
                      style: AppTypography.h6(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: AppColors.surfacePrimary,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              )
            else
              Container(
                width: 72,
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: const BoxDecoration(
                  border: Border(
                    right: BorderSide(color: Color(0xFFF1F5F9)),
                  ),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'Đặc biệt',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFEE1314),
                  ),
                ),
              ),
            Expanded(
              child: isSingle
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 22),
                      child: _renderNumber(
                        _specialValue(singleResult, isSingle: true),
                        AppTypography.lotterySpecial(
                          fontSize: 36,
                          fontWeight: FontWeight.w900,
                          color: AppColors.primary,
                          letterSpacing: -1,
                        ),
                      ),
                    )
                  : Row(
                      children: provinces.map((province) {
                        final result = resultsByProvince[province];
                        return Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              vertical: 12,
                              horizontal: 2,
                            ),
                            decoration: province != provinces.last
                                ? const BoxDecoration(
                                    border: Border(
                                      right: BorderSide(
                                        color: Color(0xFFF1F5F9),
                                      ),
                                    ),
                                  )
                                : null,
                            alignment: Alignment.center,
                            child: _renderNumber(
                              _specialValue(result, isSingle: false),
                              AppTypography.lotteryPrize(
                                fontSize: provinces.length > 3 ? 18 : 22,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFFEE1314),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPrizeTable(
    List<String> provinces,
    bool isSingle,
    Map<String, LotteryResult> resultsByProvince,
  ) {
    final labelWidth = isSingle ? 90.0 : 72.0;
    final rows = isSingle
        ? (provinces.isNotEmpty
              ? (resultsByProvince[provinces.first]?.prizeRows ??
                    const <LotteryPrizeRow>[])
              : const <LotteryPrizeRow>[])
        : (resultsByProvince.values.isNotEmpty
              ? resultsByProvince.values.first.prizeRows
              : const <LotteryPrizeRow>[]);

    return Container(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
      ),
      child: Column(
        children: rows.asMap().entries.map((entry) {
          final index = entry.key;
          final row = entry.value;

          return Container(
            decoration: BoxDecoration(
              color: index.isOdd ? const Color(0xFFFAFAFA) : Colors.white,
              border: const Border(
                bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: labelWidth,
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  decoration: const BoxDecoration(
                    border: Border(
                      right: BorderSide(color: Color(0xFFF1F5F9)),
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    row.label,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: isSingle ? 11.5 : 11,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFFEE1314),
                    ),
                  ),
                ),
                ...provinces.map((province) {
                  final result = resultsByProvince[province];
                  final provinceRow =
                      result?.prizeRows.firstWhere(
                        (item) => item.label == row.label,
                        orElse: () =>
                            LotteryPrizeRow(label: row.label, values: const []),
                      ) ??
                      LotteryPrizeRow(label: row.label, values: const []);
                  final values = provinceRow.values.isEmpty
                      ? ['--']
                      : provinceRow.values;

                  final baseStyle = AppTypography.lotteryDigit(
                    fontSize: row.highlight
                        ? (isSingle ? 18 : 14)
                        : (isSingle ? 15 : 12),
                    fontWeight: row.highlight
                        ? FontWeight.w800
                        : FontWeight.w700,
                    color: row.highlight
                        ? const Color(0xFFEE1314)
                        : const Color(0xFF111111),
                    height: 1.6,
                  );

                  return Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: province != provinces.last
                          ? const BoxDecoration(
                              border: Border(
                                right: BorderSide(
                                  color: Color(0xFFF1F5F9),
                                  width: 1,
                                ),
                              ),
                            )
                          : null,
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: values
                            .map((value) => _renderNumber(value, baseStyle))
                            .toList(),
                      ),
                    ),
                  );
                }),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppColors.cardBorder)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        // Keep the filter bar's original 48dp height while each control gets
        // a 44dp interaction envelope around its existing visual.
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
        child: Row(
          children: [
            _typeButton('ĐẦY ĐỦ'),
            _divider(),
            _typeButton('2 SỐ'),
            _divider(),
            _typeButton('3 SỐ'),
            _divider(),
            ...List.generate(10, (index) {
              final value = '$index';
              final enabled = _digits.contains(value);
              return Semantics(
                button: true,
                selected: enabled,
                label: 'Lọc kết quả theo số $value',
                onTap: () => setState(() {
                  enabled ? _digits.remove(value) : _digits.add(value);
                }),
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => setState(() {
                    enabled ? _digits.remove(value) : _digits.add(value);
                  }),
                  child: SizedBox(
                    width: 44,
                    height: 44,
                    child: Center(
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: enabled
                              ? AppColors.brandAccentYellow
                              : AppColors.surfacePrimary,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: enabled
                                ? AppColors.brandAccentYellow
                                : AppColors.cardBorder,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          value,
                          style: AppTypography.buttonSmall(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textMain,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _typeButton(String value) {
    final selected = _displayType == value;
    return Semantics(
      button: true,
      selected: selected,
      label: 'Lọc kết quả: $value',
      onTap: () => setState(() => _displayType = value),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => setState(() => _displayType = value),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
          child: Center(
            child: Text(
              value,
              style: AppTypography.buttonSmall(
                fontSize: 13,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w700,
                color: selected ? AppColors.primary : AppColors.textMuted,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _divider() => Container(
    width: 1,
    height: 13,
    color: AppColors.cardBorder,
    margin: const EdgeInsets.symmetric(horizontal: 9),
  );

  String _specialValue(LotteryResult? result, {bool isSingle = false}) {
    final value = result?.prizes.special.trim() ?? '';
    if (value.isNotEmpty) {
      return value;
    }
    return isSingle && widget.isWaitingForResults ? 'Đang chờ' : '--';
  }

  Widget _renderNumber(String fullNumber, TextStyle baseStyle) {
    if (fullNumber == '--' || fullNumber == '—' || fullNumber == 'Đang chờ') {
      return FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          fullNumber,
          maxLines: 1,
          softWrap: false,
          textAlign: TextAlign.center,
          style: fullNumber == 'Đang chờ'
              ? baseStyle.copyWith(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                )
              : baseStyle.copyWith(
                  color: AppColors.contentPlaceholder,
                  fontWeight: FontWeight.w700,
                ),
        ),
      );
    }

    var displayNum = fullNumber;
    if (_displayType == '2 SỐ' && fullNumber.length >= 2) {
      displayNum = fullNumber.substring(fullNumber.length - 2);
    } else if (_displayType == '3 SỐ' && fullNumber.length >= 3) {
      displayNum = fullNumber.substring(fullNumber.length - 3);
    }

    if (_digits.isEmpty) {
      return FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          displayNum,
          maxLines: 1,
          softWrap: false,
          textAlign: TextAlign.center,
          style: baseStyle,
        ),
      );
    }

    final lotoStartIndex = displayNum.length >= 2 ? displayNum.length - 2 : 0;
    final lotoPart = displayNum.substring(lotoStartIndex);
    final prefix = displayNum.substring(0, lotoStartIndex);
    final matched = _digits.any(lotoPart.contains);

    if (!matched) {
      return Opacity(
        opacity: 0.3,
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            displayNum,
            maxLines: 1,
            softWrap: false,
            textAlign: TextAlign.center,
            style: baseStyle,
          ),
        ),
      );
    }

    return FittedBox(
      fit: BoxFit.scaleDown,
      child: RichText(
        maxLines: 1,
        softWrap: false,
        textAlign: TextAlign.center,
        text: TextSpan(
          style: baseStyle,
          children: [
            if (prefix.isNotEmpty)
              TextSpan(
                text: prefix,
                style: baseStyle.copyWith(
                  color:
                      baseStyle.color?.withValues(alpha: 0.3) ??
                      AppColors.textMain.withValues(alpha: 0.3),
                ),
              ),
            TextSpan(
              text: lotoPart,
              style: AppTypography.lotteryDigit(
                fontSize: baseStyle.fontSize,
                color: AppColors.brandPrimaryStrong,
                fontWeight: FontWeight.w900,
                height: baseStyle.height,
                letterSpacing: baseStyle.letterSpacing,
              ).copyWith(backgroundColor: AppColors.brandAccentYellow),
            ),
          ],
        ),
      ),
    );
  }
}
