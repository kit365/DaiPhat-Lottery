import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

const _mockSpecial = {
  'TP. HCM': '458120',
  'Đồng Tháp': '654321',
  'Cà Mau': '135790',
  'Bình Phước': '987654',
};

const _otherPrizes = [
  ('Giải nhất', '99312'),
  ('Giải nhì', '45102'),
  ('Giải ba', '89041\n12345'),
  ('Giải tư', '8905\n2341\n6789'),
  ('Giải năm', '5691\n7823'),
  ('Giải sáu', '651\n234\n890'),
  ('Giải bảy', '47\n90'),
  ('Giải tám', '56'),
];

class ResultsCard extends StatefulWidget {
  final List<String> displayProvinces;
  final bool isSingleSel;
  final String? selLabel;

  const ResultsCard({
    super.key,
    required this.displayProvinces,
    required this.isSingleSel,
    required this.selLabel,
  });

  @override
  State<ResultsCard> createState() => _ResultsCardState();
}

class _ResultsCardState extends State<ResultsCard> {
  String _displayType = 'ĐẦY ĐỦ';
  final Set<String> _digits = {};

  @override
  Widget build(BuildContext context) {
    final provinces = widget.displayProvinces;
    final isSingle = provinces.length == 1;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.cardBorder, width: 1.5),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: .03),
                blurRadius: 20,
                offset: const Offset(0, 8))
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(15),
          child: Column(children: [
            // ── Province header row (multi mode only)
            if (!isSingle)
              Container(
                color: const Color(0xFFFCE5DF).withValues(alpha: .3),
                child: Row(children: [
                  Container(
                    width: 72,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                        border: Border(right: BorderSide(color: AppColors.cardBorder))),
                    child: Text('Giải',
                        style: GoogleFonts.publicSans(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textMuted)),
                  ),
                  ...provinces.map((p) => Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: p != provinces.last
                              ? const BoxDecoration(
                                  border: Border(right: BorderSide(color: AppColors.cardBorder)))
                              : null,
                          alignment: Alignment.center,
                          child: Text(
                            p,
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.publicSans(
                              fontSize: provinces.length > 3 ? 9 : 11,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      )),
                ]),
              ),

            // ── Giải ĐẶC BIỆT row
            IntrinsicHeight(
              child: Container(
                decoration: BoxDecoration(
                  color: isSingle ? const Color(0xFFFCE5DF).withValues(alpha: .3) : Colors.white,
                  border: const Border(bottom: BorderSide(color: AppColors.cardBorder, width: .8)),
                ),
                child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  if (isSingle)
                    Container(
                      width: 90,
                      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 8),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFF8B0000), Color(0xFFEE1314)],
                        ),
                        border: Border(right: BorderSide(color: Color(0x1AFFFFFF))),
                      ),
                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        const Icon(Icons.star_rounded, color: Color(0xFFFFD54F), size: 22),
                        const SizedBox(height: 4),
                        Text(
                          'Giải\nĐẶC BIỆT',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.barlow(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                              height: 1.3),
                        ),
                      ]),
                    )
                  else
                    Container(
                      width: 72,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: const BoxDecoration(
                          border: Border(right: BorderSide(color: AppColors.cardBorder))),
                      alignment: Alignment.center,
                      child: Text(
                        'Đặc biệt',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.publicSans(
                            fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary),
                      ),
                    ),
                  Expanded(
                    child: isSingle
                        ? Padding(
                            padding: const EdgeInsets.symmetric(vertical: 22),
                            child: _renderNumber(
                              _mockSpecial[provinces.first] ?? '000000',
                              GoogleFonts.barlow(
                                  fontSize: 36,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.primary,
                                  letterSpacing: -1),
                            ),
                          )
                        : Row(
                            children: provinces
                                .map((p) => Expanded(
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(vertical: 12),
                                        decoration: p != provinces.last
                                            ? const BoxDecoration(
                                                border: Border(
                                                    right: BorderSide(color: AppColors.cardBorder)))
                                            : null,
                                        alignment: Alignment.center,
                                        child: _renderNumber(
                                          _mockSpecial[p] ?? '000000',
                                          GoogleFonts.barlow(
                                              fontSize: provinces.length > 3 ? 18 : 22,
                                              fontWeight: FontWeight.w900,
                                              color: AppColors.primary),
                                        ),
                                      ),
                                    ))
                                .toList()),
                  ),
                ]),
              ),
            ),

            // ── Full results
            _fullResultsTable(provinces, isSingle),

            // ── Filter bar: ĐẦY ĐỦ | 2 SỐ | 3 SỐ | 0–9
            Container(
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.cardBorder))),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: Row(children: [
                  _typeBtn('ĐẦY ĐỦ'),
                  _vDiv(),
                  _typeBtn('2 SỐ'),
                  _vDiv(),
                  _typeBtn('3 SỐ'),
                  _vDiv(),
                  ...List.generate(10, (i) {
                    final k = '$i';
                    final on = _digits.contains(k);
                    return GestureDetector(
                      onTap: () => setState(() => on ? _digits.remove(k) : _digits.add(k)),
                      child: Container(
                        margin: const EdgeInsets.only(right: 6),
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: on ? const Color(0xFFFDE047) : Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: on ? const Color(0xFFFDE047) : AppColors.cardBorder),
                        ),
                        alignment: Alignment.center,
                        child: Text(k,
                            style: GoogleFonts.publicSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textMain)),
                      ),
                    );
                  }),
                ]),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _typeBtn(String t) {
    final sel = _displayType == t;
    return GestureDetector(
      onTap: () => setState(() => _displayType = t),
      child: Text(t,
          style: GoogleFonts.barlow(
            fontSize: 13,
            fontWeight: sel ? FontWeight.w800 : FontWeight.w700,
            color: sel ? AppColors.primary : AppColors.textMuted,
          )),
    );
  }

  Widget _vDiv() => Container(
      width: 1,
      height: 13,
      color: AppColors.cardBorder,
      margin: const EdgeInsets.symmetric(horizontal: 9));

  Widget _fullResultsTable(List<String> provinces, bool isSingle) {
    final double labelW = isSingle ? 90.0 : 72.0;
    return Container(
      decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.cardBorder))),
      child: Column(
        children: _otherPrizes.asMap().entries.map((e) {
          final idx = e.key;
          final prize = e.value;
          final isBold = prize.$1 == 'Giải tám';
          return Container(
            decoration: BoxDecoration(
              color: idx.isOdd ? AppColors.rowOdd : AppColors.rowEven,
              border: const Border(bottom: BorderSide(color: AppColors.cardBorder, width: .5)),
            ),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: labelW,
                padding: const EdgeInsets.symmetric(vertical: 9),
                decoration: const BoxDecoration(border: Border(right: BorderSide(color: AppColors.cardBorder))),
                alignment: Alignment.center,
                child: Text(
                  prize.$1,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.publicSans(
                      fontSize: isSingle ? 11 : 10,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary),
                ),
              ),
              ...provinces.map((prov) {
                final seed = prov.codeUnits.fold(0, (a, b) => a + b);
                final nums = prize.$2.split('\n').map((n) {
                  final v = (int.tryParse(n) ?? 0) + seed % 100;
                  return v.toString().padLeft(n.length, '0');
                }).toList();

                final baseStyle = GoogleFonts.barlow(
                  fontSize: isBold ? (isSingle ? 18 : 14) : (isSingle ? 15 : 12),
                  fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
                  color: isBold ? AppColors.primary : AppColors.textMain,
                  height: 1.6,
                );

                return Expanded(
                    child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  decoration: prov != provinces.last
                      ? const BoxDecoration(
                          border: Border(right: BorderSide(color: AppColors.cardBorder, width: .5)))
                      : null,
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: nums.map((n) => _renderNumber(n, baseStyle)).toList(),
                  ),
                ));
              }),
            ]),
          );
        }).toList(),
      ),
    );
  }

  Widget _renderNumber(String fullNumber, TextStyle baseStyle) {
    String displayNum = fullNumber;
    if (_displayType == '2 SỐ' && fullNumber.length >= 2) {
      displayNum = fullNumber.substring(fullNumber.length - 2);
    } else if (_displayType == '3 SỐ' && fullNumber.length >= 3) {
      displayNum = fullNumber.substring(fullNumber.length - 3);
    }

    if (_digits.isEmpty) {
      return Text(displayNum, textAlign: TextAlign.center, style: baseStyle);
    }

    final length = displayNum.length;
    final lotoStartIndex = length >= 2 ? length - 2 : 0;
    final lotoPart = displayNum.substring(lotoStartIndex);

    bool isMatch = false;
    for (final d in _digits) {
      if (lotoPart.contains(d)) {
        isMatch = true;
        break;
      }
    }

    if (!isMatch) {
      return Opacity(
        opacity: 0.3,
        child: Text(displayNum, textAlign: TextAlign.center, style: baseStyle),
      );
    }

    final prefix = displayNum.substring(0, lotoStartIndex);

    return RichText(
      textAlign: TextAlign.center,
      text: TextSpan(
        style: baseStyle,
        children: [
          if (prefix.isNotEmpty)
            TextSpan(
              text: prefix,
              style: baseStyle.copyWith(
                  color: baseStyle.color?.withValues(alpha: 0.3) ??
                      AppColors.textMain.withValues(alpha: 0.3)),
            ),
          TextSpan(
            text: lotoPart,
            style: GoogleFonts.barlow(
              fontSize: baseStyle.fontSize,
              backgroundColor: const Color(0xFFFDE047),
              color: const Color(0xFFEE1314),
              fontWeight: FontWeight.w900,
              height: baseStyle.height,
              letterSpacing: baseStyle.letterSpacing,
            ),
          ),
        ],
      ),
    );
  }
}

