import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

class CheckTicketShortcut extends StatelessWidget {
  const CheckTicketShortcut({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Material(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () => context.push(AppRoute.checkTicket.path),
          borderRadius: BorderRadius.circular(16),
          child: Ink(
            padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.brandPrimaryBorderLight),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.qr_code_scanner_rounded,
                    color: AppColors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Dò vé của bạn',
                        style: AppTypography.subtitle1(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.contentHeading,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Nhập số vé để xem bạn có trúng thưởng không',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.caption(
                          fontSize: 12,
                          color: AppColors.contentSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceDestructiveSoft,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    'Dò ngay',
                    style: AppTypography.buttonSmall(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
