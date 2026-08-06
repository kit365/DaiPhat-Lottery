import 'package:flutter/material.dart';
import 'package:toastification/toastification.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

/// Toast dùng chung toàn app (toastification, hiển thị phía trên).
class AppToast {
  AppToast._();

  static const AlignmentGeometry alignment = Alignment.topCenter;
  static const Duration _duration = Duration(seconds: 3);

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

    if (actionLabel != null && onAction != null) {
      toastification.showCustom(
        alignment: alignment,
        autoCloseDuration: const Duration(seconds: 4),
        builder: (context, holder) {
          return _ActionToastCard(
            message: message,
            actionLabel: actionLabel,
            type: type,
            onAction: () {
              toastification.dismiss(holder);
              onAction();
            },
            onClose: () => toastification.dismiss(holder),
          );
        },
      );
      return;
    }

    toastification.show(
      type: type,
      style: ToastificationStyle.flatColored,
      alignment: alignment,
      title: Text(message),
      autoCloseDuration: _duration,
      showProgressBar: false,
      closeOnClick: true,
      dragToClose: true,
      borderRadius: BorderRadius.circular(12),
    );
  }
}

class _ActionToastCard extends StatelessWidget {
  final String message;
  final String actionLabel;
  final ToastificationType type;
  final VoidCallback onAction;
  final VoidCallback onClose;

  const _ActionToastCard({
    required this.message,
    required this.actionLabel,
    required this.type,
    required this.onAction,
    required this.onClose,
  });

  Color get _accent {
    if (type == ToastificationType.success) return AppColors.success;
    if (type == ToastificationType.error) return AppColors.error;
    if (type == ToastificationType.warning) return const Color(0xFFFFB020);
    return const Color(0xFF2065D1);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _accent.withValues(alpha: 0.35)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline_rounded, color: _accent, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textMain,
              ),
            ),
          ),
          TextButton(
            onPressed: onAction,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(horizontal: 8),
            ),
            child: Text(
              actionLabel,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
          IconButton(
            onPressed: onClose,
            icon: const Icon(Icons.close_rounded, size: 18),
            color: AppColors.textMuted,
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}
