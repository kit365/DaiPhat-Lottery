import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
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
        border: Border.all(color: AppColors.fortuneGoldWarm, width: 3),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.fortuneCreamLight,
            AppColors.fortuneGoldLight,
            AppColors.fortuneGoldWarm,
            AppColors.fortuneWoodDark,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.fortuneWoodDark.withValues(alpha: 0.3),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            'ĐUÔI MAY MẮN',
            style: AppTypography.overline(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 2.2,
              color: AppColors.fortuneWoodDark,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '吉',
                style: AppTypography.traditional(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: AppColors.brandPrimaryCrimson,
                ),
              ),
              const SizedBox(width: 16),
              Text(
                luckyTail,
                style: AppTypography.lotteryDigit(
                  fontSize: 56,
                  height: 1,
                  fontWeight: FontWeight.w900,
                  color: AppColors.fortuneWoodDark,
                ),
              ),
              const SizedBox(width: 16),
              Text(
                '祥',
                style: AppTypography.traditional(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: AppColors.brandPrimaryCrimson,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Thẻ xăm Đại Phát',
            style: AppTypography.subtitle2(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.fortuneWoodDark.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }
}
