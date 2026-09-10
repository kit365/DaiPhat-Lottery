import 'package:flutter/material.dart';
import 'package:toastification/toastification.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

/// Toast dùng chung toàn app với giao diện Custom chuẩn DaiPhat Design System.
class AppToast {
  AppToast._();

  static const AlignmentGeometry alignment = Alignment.topCenter;
  static const Duration _duration = Duration(seconds: 3);
  static const Duration _actionDuration = Duration(seconds: 4);

  static void success(String message) =>
      show(message, type: ToastificationType.success);

  static void error(String message) =>
      show(message, type: ToastificationType.error);

  static void info(String message) =>
      show(message, type: ToastificationType.info);

  static void warning(String message) =>
      show(message, type: ToastificationType.warning);

  static void show(
    String message, {
    ToastificationType type = ToastificationType.info,
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    toastification.dismissAll(delayForAnimation: false);

    final autoCloseDuration = (actionLabel != null && onAction != null)
        ? _actionDuration
        : _duration;

    toastification.showCustom(
      alignment: alignment,
      autoCloseDuration: autoCloseDuration,
      animationDuration: const Duration(milliseconds: 280),
      builder: (context, holder) {
        return _CustomToastCard(
          message: message,
          type: type,
          actionLabel: actionLabel,
          onAction: (actionLabel != null && onAction != null)
              ? () {
                  toastification.dismiss(holder);
                  onAction();
                }
              : null,
          onClose: () => toastification.dismiss(holder),
        );
      },
    );
  }
}

class _ToastThemeSpec {
  const _ToastThemeSpec({
    required this.icon,
    required this.accentColor,
    required this.badgeBgColor,
    required this.borderColor,
  });

  final IconData icon;
  final Color accentColor;
  final Color badgeBgColor;
  final Color borderColor;
}

_ToastThemeSpec _resolveToastTheme(ToastificationType type) {
  switch (type) {
    case ToastificationType.success:
      return const _ToastThemeSpec(
        icon: Icons.check_circle_rounded,
        accentColor: AppColors.toastSuccessAccent,
        badgeBgColor: AppColors.toastSuccessSurface,
        borderColor: AppColors.toastSuccessBorder,
      );
    case ToastificationType.error:
      return const _ToastThemeSpec(
        icon: Icons.cancel_rounded,
        accentColor: AppColors.redAlert,
        badgeBgColor: AppColors.toastErrorSurface,
        borderColor: AppColors.toastErrorBorder,
      );
    case ToastificationType.warning:
      return const _ToastThemeSpec(
        icon: Icons.warning_rounded,
        accentColor: AppColors.toastWarningAccent,
        badgeBgColor: AppColors.toastWarningSurface,
        borderColor: AppColors.toastWarningBorder,
      );
    case ToastificationType.info:
    default:
      return const _ToastThemeSpec(
        icon: Icons.info_rounded,
        accentColor: AppColors.toastInfoAccent,
        badgeBgColor: AppColors.toastInfoSurface,
        borderColor: AppColors.toastInfoBorder,
      );
  }
}

class _CustomToastCard extends StatelessWidget {
  const _CustomToastCard({
    required this.message,
    required this.type,
    this.actionLabel,
    this.onAction,
    required this.onClose,
  });

  final String message;
  final ToastificationType type;
  final String? actionLabel;
  final VoidCallback? onAction;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final spec = _resolveToastTheme(type);

    return SafeArea(
      bottom: false,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: AppColors.surfacePrimary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: spec.borderColor.withValues(alpha: 0.7),
            width: 1.0,
          ),
          boxShadow: [
            const BoxShadow(
              color: AppColors.shadowSubtle,
              blurRadius: 18,
              offset: Offset(0, 6),
              spreadRadius: -2,
            ),
            BoxShadow(
              color: spec.accentColor.withValues(alpha: 0.08),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Soft Circular Icon Badge
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: spec.badgeBgColor,
                shape: BoxShape.circle,
                border: Border.all(
                  color: spec.borderColor.withValues(alpha: 0.5),
                  width: 0.8,
                ),
              ),
              child: Center(
                child: Icon(spec.icon, color: spec.accentColor, size: 18),
              ),
            ),
            const SizedBox(width: 11),

            // Message text
            Expanded(
              child: Text(
                message,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.subtitle2(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: AppColors.contentNavy,
                  height: 1.32,
                ),
              ),
            ),

            // Action Pill Button (Optional)
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(width: 8),
              Material(
                color: AppColors.transparent,
                child: InkWell(
                  onTap: onAction,
                  borderRadius: BorderRadius.circular(999),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 11,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(999),
                      boxShadow: const [
                        BoxShadow(
                          color: AppColors.shadowBrand,
                          blurRadius: 6,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Text(
                      actionLabel!,
                      style: AppTypography.buttonSmall(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.surfacePrimary,
                      ),
                    ),
                  ),
                ),
              ),
            ],

            const SizedBox(width: 6),

            // Subtle Close Button
            Material(
              color: AppColors.transparent,
              child: InkWell(
                onTap: onClose,
                borderRadius: BorderRadius.circular(999),
                child: const Padding(
                  padding: EdgeInsets.all(4),
                  child: Icon(
                    Icons.close_rounded,
                    size: 16,
                    color: AppColors.contentSubtle,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
