import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

class HomeTitleDate extends StatelessWidget {
  final DateTime date;
  final VoidCallback onPickDate;

  const HomeTitleDate({
    super.key,
    required this.date,
    required this.onPickDate,
  });

  String get _dateStr =>
      '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('KẾT QUẢ XỔ SỐ',
              style: GoogleFonts.barlow(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primaryDark,
                  letterSpacing: .5)),
          Text('HÔM NAY',
              style: GoogleFonts.barlow(
                  fontSize: 34,
                  fontWeight: FontWeight.w900,
                  color: AppColors.primaryDark,
                  height: 1.0,
                  letterSpacing: 1.0)),
        ]),
        const Spacer(),
        GestureDetector(
          onTap: onPickDate,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                    color: AppColors.primary.withValues(alpha: .3),
                    blurRadius: 12,
                    offset: const Offset(0, 4))
              ],
            ),
            child: Row(children: [
              const Icon(Icons.calendar_month_outlined, color: Colors.white, size: 16),
              const SizedBox(width: 8),
              Text(_dateStr,
                  style: GoogleFonts.publicSans(
                      fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
              const SizedBox(width: 4),
              const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white, size: 18),
            ]),
          ),
        ),
      ]),
    );
  }
}

