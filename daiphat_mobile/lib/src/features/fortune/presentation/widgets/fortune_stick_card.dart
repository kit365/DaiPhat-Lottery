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
        border: Border.all(color: const Color(0xFFFFDF7D), width: 2.5),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFFFFBEB),
            Color(0xFFFEF3C7),
            Color(0xFFFDE68A),
            Color(0xFFF59E0B),
            Color(0xFFD97706),
          ],
          stops: [0.0, 0.25, 0.55, 0.85, 1.0],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF59E0B).withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            'ĐUÔI MAY MẮN',
            style: AppTypography.overline(
              fontSize: 12.5,
              fontWeight: FontWeight.w900,
              letterSpacing: 2.2,
              color: const Color(0xFF78350F),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '吉',
                style: AppTypography.traditional(
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFFB91C1C),
                ),
              ),
              const SizedBox(width: 18),
              Text(
                luckyTail,
                style: AppTypography.lotteryDigit(
                  fontSize: 60,
                  height: 1,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF4A0A0D),
                ),
              ),
              const SizedBox(width: 18),
              Text(
                '祥',
                style: AppTypography.traditional(
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFFB91C1C),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Thẻ xăm Đại Phát',
            style: AppTypography.subtitle2(
              fontSize: 13.5,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF78350F),
            ),
          ),
        ],
      ),
    );
  }
}
