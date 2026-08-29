import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

class FortuneStickCard extends StatelessWidget {
  const FortuneStickCard({super.key, required this.luckyTail});

  final String luckyTail;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD4A24A), width: 3),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFFFF6E0),
            Color(0xFFF2D089),
            Color(0xFFD4A24A),
            Color(0xFFA16207),
          ],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x4778350F),
            blurRadius: 22,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            'ĐUÔI MAY MẮN',
            style: AppTypography.mainWith(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 2.2,
              color: const Color(0xFF451A03),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '吉',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF7F1D1D),
                  fontFamily: 'serif',
                ),
              ),
              const SizedBox(width: 16),
              Text(
                luckyTail,
                style: AppTypography.mainWith(
                  fontSize: 56,
                  height: 1,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF5C1A0A),
                ),
              ),
              const SizedBox(width: 16),
              Text(
                '祥',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF7F1D1D),
                  fontFamily: 'serif',
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Thẻ xăm Đại Phát',
            style: AppTypography.mainWith(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: const Color(0xCC451A03),
            ),
          ),
        ],
      ),
    );
  }
}
