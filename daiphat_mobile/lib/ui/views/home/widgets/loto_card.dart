import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_colors.dart';

const _lotoRows = [
  ('0^2, 1, 2, 8, 9^3', '0', '0^2, 1, 2^2, 4'),
  ('0, 2^6, 4^2', '1', '0, 2^3, 4'),
  ('0^2, 1^3, 2^2, 9', '2', '0, 1^6, 2^2, 3^2'),
  ('2^2, 4', '3', '4, 5'),
  ('0, 1, 2, 4^2', '4', '1^2, 3, 4^2, 5^3'),
  ('3, 4^3, 6', '5', '6^2'),
  ('5^2, 6^2, 7^2', '6', '5, 6^2, 8'),
  ('6, 7^2, 8', '7', '6^2, 8^2, 9'),
  ('7, 8^2, 9', '8', '0, 2, 8, 9^2'),
  ('', '9', '0^3, 2, 9'),
];

class LotoCard extends StatefulWidget {
  final List<String> provinces;
  final String? globalSel;

  const LotoCard({
    super.key,
    required this.provinces,
    required this.globalSel,
  });

  @override
  State<LotoCard> createState() => _LotoCardState();
}

class _LotoCardState extends State<LotoCard> {
  String? _province;

  @override
  void initState() {
    super.initState();
    _province = widget.globalSel;
  }

  @override
  void didUpdateWidget(LotoCard old) {
    super.didUpdateWidget(old);
    if (old.globalSel != widget.globalSel) setState(() => _province = widget.globalSel);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
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
      child: Column(children: [
        // Header + dropdown
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Icon(Icons.grid_view_rounded, color: AppColors.primary, size: 18),
              const SizedBox(width: 7),
              Text('BẢNG LÔ TÔ',
                  style: GoogleFonts.barlow(
                      fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textMain)),
            ]),
            const SizedBox(height: 10),
            Container(
              height: 38,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                  color: AppColors.pageBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.cardBorder)),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String?>(
                  value: _province,
                  isExpanded: true,
                  isDense: true,
                  icon: const Icon(Icons.keyboard_arrow_down_rounded,
                      size: 18, color: AppColors.textMuted),
                  style: GoogleFonts.publicSans(
                      fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textMain),
                  onChanged: (v) => setState(() => _province = v),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('Tất cả đài')),
                    ...widget.provinces.map((p) => DropdownMenuItem(value: p, child: Text('Đài $p'))),
                  ],
                ),
              ),
            ),
          ]),
        ),

        // Loto table
        _lotoTable(),
      ]),
    );
  }

  Widget _lotoTable() => Container(
        decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.cardBorder))),
        child: Column(children: [
          Container(
            color: AppColors.rowOdd,
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Row(children: [
              Expanded(
                  flex: 4,
                  child: Text('CHỤC',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.publicSans(
                          fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMain))),
              Expanded(
                  flex: 2,
                  child: Text('SỐ',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.publicSans(
                          fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary))),
              Expanded(
                  flex: 4,
                  child: Text('ĐƠN VỊ',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.publicSans(
                          fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMain))),
            ]),
          ),
          ..._lotoRows.asMap().entries.map((e) {
            final idx = e.key;
            final r = e.value;
            return Container(
              padding: const EdgeInsets.symmetric(vertical: 9),
              decoration: BoxDecoration(
                color: idx.isEven ? AppColors.rowEven : AppColors.rowOdd,
                border: const Border(top: BorderSide(color: AppColors.cardBorder, width: .5)),
              ),
              child: Row(children: [
                Expanded(flex: 4, child: _superscript(r.$1)),
                Expanded(
                    flex: 2,
                    child: Text(r.$2,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.barlow(
                            fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary))),
                Expanded(flex: 4, child: _superscript(r.$3)),
              ]),
            );
          }),
          const SizedBox(height: 6),
        ]),
      );

  Widget _superscript(String text) {
    if (text.isEmpty) return const SizedBox();
    final parts = text.split(', ');
    final spans = <InlineSpan>[];
    for (int i = 0; i < parts.length; i++) {
      final p = parts[i];
      if (p.contains('^')) {
        final s = p.split('^');
        spans.add(TextSpan(
            text: s[0],
            style: GoogleFonts.publicSans(
                color: AppColors.textMain, fontWeight: FontWeight.w600, fontSize: 13)));
        spans.add(WidgetSpan(
            child: Transform.translate(
                offset: const Offset(0, -5),
                child: Text(s[1],
                    style: GoogleFonts.publicSans(
                        color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 9)))));
      } else {
        spans.add(TextSpan(
            text: p,
            style: GoogleFonts.publicSans(
                color: AppColors.textMain, fontWeight: FontWeight.w600, fontSize: 13)));
      }
      if (i < parts.length - 1) {
        spans.add(TextSpan(
            text: ', ', style: GoogleFonts.publicSans(color: AppColors.textMain, fontSize: 13)));
      }
    }
    return RichText(textAlign: TextAlign.center, text: TextSpan(children: spans));
  }
}
