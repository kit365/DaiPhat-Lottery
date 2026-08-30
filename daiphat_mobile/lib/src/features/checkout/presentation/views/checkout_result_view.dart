import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';

class CheckoutResultView extends StatelessWidget {
  final String? code;
  final String? orderCode;
  final String? internalCode;
  final String? status;
  final String? cancel;
  final String? checkoutUrl;
  final String? orderId;

  const CheckoutResultView({
    super.key,
    this.code,
    this.orderCode,
    this.internalCode,
    this.status,
    this.cancel,
    this.checkoutUrl,
    this.orderId,
  });

  bool get isSuccess {
    // From PayOS: code === '00' && cancel !== 'true'
    // From offline: code === '00' means success
    return code == '00' && cancel != 'true';
  }

  String get displayCode {
    if (internalCode != null && internalCode!.isNotEmpty) return internalCode!;
    if (orderCode != null && orderCode!.isNotEmpty) return 'DP$orderCode';
    return '';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        backgroundColor: AppColors.surfacePrimary,
        surfaceTintColor: AppColors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 20,
            color: AppColors.contentPrimary,
          ),
          onPressed: () {
            // Go back to home
            context.go(AppRoute.home.path);
          },
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Top decoration line
              Container(
                height: 4,
                width: 80,
                decoration: BoxDecoration(
                  color: isSuccess
                      ? AppColors.statusSuccess
                      : AppColors.primary,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 32),

              // Icon
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isSuccess
                      ? AppColors.statusSuccessSurface
                      : AppColors.surfaceEmptyState,
                  border: Border.all(
                    color: isSuccess
                        ? AppColors.statusSuccessSurface
                        : AppColors.borderWarm,
                    width: 3,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: (isSuccess ? AppColors.statusSuccess : AppColors.primary)
                          .withValues(alpha: 0.15),
                      blurRadius: 20,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Icon(
                  isSuccess ? Icons.check_circle_rounded : Icons.cancel_rounded,
                  size: 56,
                  color: isSuccess
                      ? AppColors.statusSuccess
                      : AppColors.primary,
                ),
              ),
              const SizedBox(height: 24),

              // Title
              Text(
                isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại',
                style: AppTypography.h3(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: isSuccess
                      ? AppColors.statusSuccess
                      : AppColors.primary,
                ),
              ),
              const SizedBox(height: 8),

              Text(
                isSuccess
                    ? 'Cảm ơn bạn đã đặt vé tại Đại Phát.'
                    : 'Rất tiếc, quá trình thanh toán không thành công hoặc đã bị hủy.',
                textAlign: TextAlign.center,
                style: AppTypography.bodyLarge(
                  color: AppColors.contentMuted,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 32),

              // Order details card
              if (displayCode.isNotEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.surfacePrimary,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.cardBorder),
                    boxShadow: const [
                      BoxShadow(
                        color: AppColors.shadowLight,
                        blurRadius: 10,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: const BoxDecoration(
                              color: AppColors.backgroundPrimary,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.tag_rounded,
                              size: 18,
                              color: AppColors.contentMuted,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'Mã đơn hàng',
                            style: AppTypography.subtitle2(
                              color: AppColors.contentPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              displayCode,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.end,
                              style: AppTypography.monoCode(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w900,
                                fontSize: 15,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 1, color: AppColors.borderLight),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: const BoxDecoration(
                              color: AppColors.backgroundPrimary,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.calendar_month_rounded,
                              size: 18,
                              color: AppColors.contentMuted,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'Thời gian đặt',
                            style: AppTypography.subtitle2(
                              color: AppColors.contentPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            AppFormatters.formatDateTime(DateTime.now()),
                            style: AppTypography.bodyMedium(
                              color: AppColors.contentPrimary,
                              fontWeight: FontWeight.w800,
                              fontSize: 14.5,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 32),

              // Actions
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => context.go(AppRoute.home.path),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.contentPrimary,
                        side: const BorderSide(color: AppColors.borderDefault),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: Text(
                        'Về trang chủ',
                        style: AppTypography.buttonMedium(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: AppColors.contentPrimary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        if (orderId != null && orderId!.isNotEmpty) {
                          context.pushNamed(
                            AppRoute.orderDetail.name,
                            pathParameters: {'id': orderId!},
                          );
                        } else {
                          context.go(AppRoute.myOrders.path);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.surfacePrimary,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        'Xem chi tiết đơn',
                        style: AppTypography.buttonMedium(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: AppColors.surfacePrimary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
