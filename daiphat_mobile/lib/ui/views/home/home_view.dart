import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/theme/app_colors.dart';
import '../../viewmodels/home_viewmodel.dart';
import '../../../data/models/lottery_result.dart';



// ─── Mock data ────────────────────────────────────────────────
const _mockSpecial = {
  'TP. HCM': '458120', 'Đồng Tháp': '654321',
  'Cà Mau': '135790', 'Bình Phước': '987654',
};
const _otherPrizes = [
  ('Giải nhất', '99312'),
  ('Giải nhì',  '45102'),
  ('Giải ba',   '89041\n12345'),
  ('Giải tư',   '8905\n2341\n6789'),
  ('Giải năm',  '5691\n7823'),
  ('Giải sáu',  '651\n234\n890'),
  ('Giải bảy',  '47\n90'),
  ('Giải tám',  '56'),
];
const _lotoRows = [
  ('0^2, 1, 2, 8, 9^3', '0', '0^2, 1, 2^2, 4'),
  ('0, 2^6, 4^2',       '1', '0, 2^3, 4'),
  ('0^2, 1^3, 2^2, 9',  '2', '0, 1^6, 2^2, 3^2'),
  ('2^2, 4',            '3', '4, 5'),
  ('0, 1, 2, 4^2',      '4', '1^2, 3, 4^2, 5^3'),
  ('3, 4^3, 6',         '5', '6^2'),
  ('5^2, 6^2, 7^2',     '6', '5, 6^2, 8'),
  ('6, 7^2, 8',         '7', '6^2, 8^2, 9'),
  ('7, 8^2, 9',         '8', '0, 2, 8, 9^2'),
  ('',                  '9', '0^3, 2, 9'),
];

// ═══════════════════════════════════════════════════════════
//  ROOT WIDGET
// ═══════════════════════════════════════════════════════════
class HomeView extends ConsumerWidget {
  const HomeView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homeState = ref.watch(homeViewModelProvider);
    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: homeState.when(
        data: (results) => _HomeContent(results: results),
        loading: _buildSkeleton,
        error: (e, _) => Center(child: Text('Lỗi: $e')),
      ),
    );
  }

  static Widget _buildSkeleton() => ListView(
    padding: EdgeInsets.zero,
    children: [
      Shimmer.fromColors(
        baseColor: Colors.grey[300]!, highlightColor: Colors.grey[100]!,
        child: Container(height: 120, color: Colors.white),
      ),
      const SizedBox(height: 20),
      ...List.generate(3, (_) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Shimmer.fromColors(
          baseColor: Colors.grey[300]!, highlightColor: Colors.grey[100]!,
          child: Container(height: 100, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12))),
        ),
      )),
    ],
  );
}

// ═══════════════════════════════════════════════════════════
//  PAGE STATE
// ═══════════════════════════════════════════════════════════
class _HomeContent extends StatefulWidget {
  final List<LotteryResult> results;
  const _HomeContent({required this.results});
  @override
  State<_HomeContent> createState() => _HomeContentState();
}

class _HomeContentState extends State<_HomeContent> {
  // Empty set = "Đầy đủ" (all). Non-empty = selected subset.
  final Set<String> _selProvinces = {};
  DateTime _date = DateTime.now();
  final _allProvinces = ['TP. HCM', 'Đồng Tháp', 'Cà Mau', 'Bình Phước'];

  String get _dateStr =>
      '${_date.day.toString().padLeft(2,'0')}/${_date.month.toString().padLeft(2,'0')}/${_date.year}';

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppColors.primaryDark, onPrimary: Colors.white, onSurface: AppColors.textMain,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _date = picked);
  }

  List<String> get _displayProvinces =>
      _selProvinces.isEmpty ? _allProvinces : _allProvinces.where(_selProvinces.contains).toList();

  @override
  Widget build(BuildContext context) {
    final displayProvinces = _displayProvinces;
    return Stack(
      children: [
        // Background fade
        Positioned(
          top: 0, left: 0, right: 0, height: 320,
          child: ShaderMask(
            shaderCallback: (r) => const LinearGradient(
              begin: Alignment.topCenter, end: Alignment.bottomCenter,
              colors: [Colors.white, Colors.transparent], stops: [0.4, 1.0],
            ).createShader(r),
            blendMode: BlendMode.dstIn,
            child: Image.asset('assets/images/home_bg.png', fit: BoxFit.cover),
          ),
        ),

        SafeArea(child: CustomScrollView(slivers: [
          SliverToBoxAdapter(child: _header()),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
          SliverToBoxAdapter(child: _titleAndDate()),
          const SliverToBoxAdapter(child: SizedBox(height: 20)),
          SliverToBoxAdapter(child: _provinceChips()),
          const SliverToBoxAdapter(child: SizedBox(height: 28)),
          SliverToBoxAdapter(child: _ResultsCard(
            displayProvinces: displayProvinces,
            isSingleSel: _selProvinces.length == 1,
            selLabel: _selProvinces.length == 1 ? _selProvinces.first : null,
          )),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
          SliverToBoxAdapter(child: _LotoCard(
            provinces: _allProvinces,
            globalSel: _selProvinces.length == 1 ? _selProvinces.first : null,
          )),
          const SliverToBoxAdapter(child: SizedBox(height: 40)),
        ])),
      ],
    );
  }

  // ─── Header ────────────────────────────────────────────────
  Widget _header() => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    child: Row(children: [
      Container(
        width: 44, height: 44,
        decoration: BoxDecoration(shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha:.1), blurRadius: 8, offset: const Offset(0, 2))]),
        child: ClipOval(child: Image.asset('assets/images/login_logo.jpg', fit: BoxFit.cover)),
      ),
      const SizedBox(width: 10),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('ĐẠI PHÁT', style: GoogleFonts.barlow(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.primaryDark, height: 1.1)),
        Text('XỔ SỐ - MAY MẮN - THỊNH VƯỢNG', style: GoogleFonts.publicSans(fontSize: 9, fontWeight: FontWeight.w800, color: AppColors.goldDark)),
      ]),
      const Spacer(),
      _iconBtn(Icons.calendar_month_outlined),
      const SizedBox(width: 8),
      Stack(children: [
        _iconBtn(Icons.notifications_outlined),
        Positioned(right: 6, top: 6, child: Container(
          width: 8, height: 8,
          decoration: BoxDecoration(color: AppColors.primary, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 1.5)),
        )),
      ]),
    ]),
  );

  Widget _iconBtn(IconData ic) => Container(
    width: 40, height: 40,
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha:.9), borderRadius: BorderRadius.circular(12),
      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha:.04), blurRadius: 10, offset: const Offset(0, 2))],
    ),
    child: Icon(ic, color: AppColors.primary, size: 22),
  );

  // ─── Title + Date ──────────────────────────────────────────
  Widget _titleAndDate() => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16),
    child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('KẾT QUẢ XỔ SỐ', style: GoogleFonts.barlow(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.primaryDark, letterSpacing: .5)),
        Text('HÔM NAY', style: GoogleFonts.barlow(fontSize: 34, fontWeight: FontWeight.w900, color: AppColors.primaryDark, height: 1.0, letterSpacing: 1.0)),
      ]),
      const Spacer(),
      GestureDetector(
        onTap: _pickDate,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.primary, borderRadius: BorderRadius.circular(8),
            boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha:.3), blurRadius: 12, offset: const Offset(0, 4))],
          ),
          child: Row(children: [
            const Icon(Icons.calendar_month_outlined, color: Colors.white, size: 16),
            const SizedBox(width: 8),
            Text(_dateStr, style: GoogleFonts.publicSans(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
            const SizedBox(width: 4),
            const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white, size: 18),
          ]),
        ),
      ),
    ]),
  );

  // ─── Province chips (MULTI-SELECT) ─────────────────────────
  Widget _provinceChips() => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    padding: const EdgeInsets.symmetric(horizontal: 16),
    child: Row(children: [
      // "Đầy đủ" chip: selected when nothing selected
      _chip(null, 'Đầy đủ'),
      ..._allProvinces.map((p) => Padding(
        padding: const EdgeInsets.only(left: 8),
        child: _chip(p, p),
      )),
    ]),
  );

  Widget _chip(String? val, String label) {
    // null = "Đầy đủ" chip (selected when set is empty)
    final isSel = val == null
        ? _selProvinces.isEmpty
        : _selProvinces.contains(val);

    return GestureDetector(
      onTap: () => setState(() {
        if (val == null) {
          // Clear all → back to "Đầy đủ"
          _selProvinces.clear();
        } else {
          if (_selProvinces.contains(val)) {
            _selProvinces.remove(val);
          } else {
            _selProvinces.add(val);
          }
        }
      }),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: isSel ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSel ? AppColors.primary : AppColors.cardBorder),
          boxShadow: isSel
            ? [BoxShadow(color: AppColors.primary.withValues(alpha:.25), blurRadius: 8, offset: const Offset(0, 3))]
            : [BoxShadow(color: Colors.black.withValues(alpha:.02), blurRadius: 4, offset: const Offset(0, 2))],
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (isSel) ...[
            Container(width: 13, height: 13,
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
              child: const Icon(Icons.check, color: AppColors.primary, size: 9),
            ),
            const SizedBox(width: 5),
          ],
          Text(label, style: GoogleFonts.publicSans(
            fontSize: 13, fontWeight: isSel ? FontWeight.w700 : FontWeight.w600,
            color: isSel ? Colors.white : AppColors.textMain,
          )),
        ]),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
//  RESULTS CARD
// ═══════════════════════════════════════════════════════════
class _ResultsCard extends StatefulWidget {
  final List<String> displayProvinces;
  final bool isSingleSel;
  final String? selLabel;
  const _ResultsCard({required this.displayProvinces, required this.isSingleSel, required this.selLabel});
  @override
  State<_ResultsCard> createState() => _ResultsCardState();
}

class _ResultsCardState extends State<_ResultsCard> {
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
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha:.03), blurRadius: 20, offset: const Offset(0, 8))],
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
                    decoration: const BoxDecoration(border: Border(right: BorderSide(color: AppColors.cardBorder))),
                    child: Text('Giải', style: GoogleFonts.publicSans(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                  ),
                  ...provinces.map((p) => Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: p != provinces.last
                          ? const BoxDecoration(border: Border(right: BorderSide(color: AppColors.cardBorder)))
                          : null,
                      alignment: Alignment.center,
                      child: Text(p,
                        textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.publicSans(
                          fontSize: provinces.length > 3 ? 9 : 11,
                          fontWeight: FontWeight.w800, color: AppColors.primary,
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
                  border: Border(bottom: BorderSide(color: AppColors.cardBorder, width: .8)),
                ),
                child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  if (isSingle)
                    Container(
                      width: 90,
                      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 8),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft, end: Alignment.bottomRight,
                          colors: [Color(0xFF8B0000), Color(0xFFEE1314)],
                        ),
                        border: Border(right: BorderSide(color: Color(0x1AFFFFFF))),
                      ),
                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        const Icon(Icons.star_rounded, color: Color(0xFFFFD54F), size: 22),
                        const SizedBox(height: 4),
                        Text('Giải\nĐẶC BIỆT',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.barlow(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white, height: 1.3),
                        ),
                      ]),
                    )
                  else
                    Container(
                      width: 72,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: const BoxDecoration(border: Border(right: BorderSide(color: AppColors.cardBorder))),
                      alignment: Alignment.center,
                      child: Text('Đặc biệt',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.publicSans(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary),
                      ),
                    ),

                  Expanded(child: isSingle
                    ? Padding(
                        padding: const EdgeInsets.symmetric(vertical: 22),
                        child: _renderNumber(
                          _mockSpecial[provinces.first] ?? '000000',
                          GoogleFonts.barlow(fontSize: 36, fontWeight: FontWeight.w900, color: AppColors.primary, letterSpacing: -1),
                        ),
                      )
                    : Row(children: provinces.map((p) => Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: p != provinces.last
                              ? const BoxDecoration(border: Border(right: BorderSide(color: AppColors.cardBorder)))
                              : null,
                          alignment: Alignment.center,
                          child: _renderNumber(
                            _mockSpecial[p] ?? '000000',
                            GoogleFonts.barlow(fontSize: provinces.length > 3 ? 18 : 22, fontWeight: FontWeight.w900, color: AppColors.primary),
                          ),
                        ),
                      )).toList()),
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
                        width: 28, height: 28,
                        decoration: BoxDecoration(
                          color: on ? const Color(0xFFFDE047) : Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: on ? const Color(0xFFFDE047) : AppColors.cardBorder),
                        ),
                        alignment: Alignment.center,
                        child: Text(k, style: GoogleFonts.publicSans(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMain)),
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
      child: Text(t, style: GoogleFonts.barlow(
        fontSize: 13, fontWeight: sel ? FontWeight.w800 : FontWeight.w700,
        color: sel ? AppColors.primary : AppColors.textMuted,
      )),
    );
  }

  Widget _vDiv() => Container(width: 1, height: 13, color: AppColors.cardBorder, margin: const EdgeInsets.symmetric(horizontal: 9));

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
              border: Border(bottom: BorderSide(color: AppColors.cardBorder, width: .5)),
            ),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: labelW,
                padding: const EdgeInsets.symmetric(vertical: 9),
                decoration: const BoxDecoration(border: Border(right: BorderSide(color: AppColors.cardBorder))),
                alignment: Alignment.center,
                child: Text(prize.$1,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.publicSans(fontSize: isSingle ? 11 : 10, fontWeight: FontWeight.w700, color: AppColors.primary),
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

                return Expanded(child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  decoration: prov != provinces.last
                      ? const BoxDecoration(border: Border(right: BorderSide(color: AppColors.cardBorder, width: .5)))
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
              style: baseStyle.copyWith(color: baseStyle.color?.withValues(alpha: 0.3) ?? AppColors.textMain.withValues(alpha: 0.3)),
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

// ═══════════════════════════════════════════════════════════
//  LOTO CARD
// ═══════════════════════════════════════════════════════════
class _LotoCard extends StatefulWidget {
  final List<String> provinces;
  final String? globalSel;
  const _LotoCard({required this.provinces, required this.globalSel});
  @override
  State<_LotoCard> createState() => _LotoCardState();
}

class _LotoCardState extends State<_LotoCard> {
  String? _province;

  @override
  void initState() {
    super.initState();
    _province = widget.globalSel;
  }

  @override
  void didUpdateWidget(_LotoCard old) {
    super.didUpdateWidget(old);
    if (old.globalSel != widget.globalSel) setState(() => _province = widget.globalSel);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder, width: 1.5),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha:.03), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: Column(children: [
        // Header + dropdown
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Icon(Icons.grid_view_rounded, color: AppColors.primary, size: 18),
              const SizedBox(width: 7),
              Text('BẢNG LÔ TÔ', style: GoogleFonts.barlow(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textMain)),
            ]),
            const SizedBox(height: 10),
            Container(
              height: 38,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(color: AppColors.pageBg, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.cardBorder)),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String?>(
                  value: _province,
                  isExpanded: true,
                  isDense: true,
                  icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 18, color: AppColors.textMuted),
                  style: GoogleFonts.publicSans(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textMain),
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
          Expanded(flex: 4, child: Text('CHỤC', textAlign: TextAlign.center,
            style: GoogleFonts.publicSans(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMain))),
          Expanded(flex: 2, child: Text('SỐ', textAlign: TextAlign.center,
            style: GoogleFonts.publicSans(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary))),
          Expanded(flex: 4, child: Text('ĐƠN VỊ', textAlign: TextAlign.center,
            style: GoogleFonts.publicSans(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMain))),
        ]),
      ),
      ..._lotoRows.asMap().entries.map((e) {
        final idx = e.key; final r = e.value;
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: idx.isEven ? AppColors.rowEven : AppColors.rowOdd,
            border: const Border(top: BorderSide(color: AppColors.cardBorder, width: .5)),
          ),
          child: Row(children: [
            Expanded(flex: 4, child: _superscript(r.$1)),
            Expanded(flex: 2, child: Text(r.$2, textAlign: TextAlign.center,
              style: GoogleFonts.barlow(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary))),
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
        spans.add(TextSpan(text: s[0], style: GoogleFonts.publicSans(color: AppColors.textMain, fontWeight: FontWeight.w600, fontSize: 13)));
        spans.add(WidgetSpan(child: Transform.translate(offset: const Offset(0, -5),
          child: Text(s[1], style: GoogleFonts.publicSans(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 9)))));
      } else {
        spans.add(TextSpan(text: p, style: GoogleFonts.publicSans(color: AppColors.textMain, fontWeight: FontWeight.w600, fontSize: 13)));
      }
      if (i < parts.length - 1) spans.add(TextSpan(text: ', ', style: GoogleFonts.publicSans(color: AppColors.textMain, fontSize: 13)));
    }
    return RichText(textAlign: TextAlign.center, text: TextSpan(children: spans));
  }
}
