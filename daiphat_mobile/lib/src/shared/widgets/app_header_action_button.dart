import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

enum AppHeaderActionVariant { light, translucent, bare }

class AppHeaderActionButton extends StatefulWidget {
  const AppHeaderActionButton({
    super.key,
    required this.icon,
    required this.onTap,
    this.tooltip,
    this.badgeCount = 0,
    this.iconSize = 21,
    this.size = 42,
    this.iconColor,
    this.backgroundColor,
    this.variant = AppHeaderActionVariant.light,
    this.borderRadius,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final String? tooltip;
  final int badgeCount;
  final double iconSize;
  final double size;
  final Color? iconColor;
  final Color? backgroundColor;
  final AppHeaderActionVariant variant;
  final BorderRadius? borderRadius;

  @visibleForTesting
  static DateTime Function()? debugNowOverride;

  @override
  State<AppHeaderActionButton> createState() => _AppHeaderActionButtonState();
}

class _AppHeaderActionButtonState extends State<AppHeaderActionButton> {
  int _lastTapTimestamp = 0;

  void _handleTap() {
    if (widget.onTap == null) return;
    final now = (AppHeaderActionButton.debugNowOverride != null
            ? AppHeaderActionButton.debugNowOverride!()
            : DateTime.now())
        .millisecondsSinceEpoch;
    if (now - _lastTapTimestamp < 500) {
      return;
    }
    _lastTapTimestamp = now;
    widget.onTap!();
  }

  @override
  Widget build(BuildContext context) {
    final effectiveBorderRadius =
        widget.borderRadius ?? BorderRadius.circular(999);

    final defaultBgColor = switch (widget.variant) {
      AppHeaderActionVariant.light => AppColors.surfacePrimary,
      AppHeaderActionVariant.translucent => AppColors.surfacePrimary.withValues(
        alpha: 0.2,
      ),
      AppHeaderActionVariant.bare => AppColors.transparent,
    };

    final effectiveBgColor = widget.backgroundColor ?? defaultBgColor;

    final defaultIconColor = widget.variant == AppHeaderActionVariant.translucent
        ? AppColors.surfacePrimary
        : AppColors.primary;

    final effectiveIconColor = widget.iconColor ?? defaultIconColor;

    Widget button = Material(
      color: effectiveBgColor,
      borderRadius: effectiveBorderRadius,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: widget.onTap != null ? _handleTap : null,
        borderRadius: effectiveBorderRadius,
        child: SizedBox(
          width: widget.size,
          height: widget.size,
          child: Center(
            child: Icon(widget.icon, color: effectiveIconColor, size: widget.iconSize),
          ),
        ),
      ),
    );

    if (widget.variant == AppHeaderActionVariant.light) {
      button = Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          borderRadius: effectiveBorderRadius,
          boxShadow: const [
            BoxShadow(
              color: AppColors.shadowLight,
              blurRadius: 10,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: button,
      );
    }

    final buttonWithBadge = SizedBox(
      width: widget.size,
      height: widget.size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          button,
          if (widget.badgeCount > 0)
            Positioned(
              right: -3,
              top: -3,
              child: IgnorePointer(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 4,
                    vertical: 2,
                  ),
                  decoration: const BoxDecoration(
                    color: AppColors.statusError,
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 16,
                    minHeight: 16,
                  ),
                  child: Center(
                    child: Text(
                      widget.badgeCount > 99 ? '99+' : '${widget.badgeCount}',
                      style: AppTypography.overline(
                        color: AppColors.surfacePrimary,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );

    if (widget.tooltip != null && widget.tooltip!.isNotEmpty) {
      return Semantics(
        button: true,
        label: widget.tooltip,
        child: Tooltip(message: widget.tooltip!, child: buttonWithBadge),
      );
    }

    return Semantics(button: true, child: buttonWithBadge);
  }
}
