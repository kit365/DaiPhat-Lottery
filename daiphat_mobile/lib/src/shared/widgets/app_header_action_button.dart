import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

enum AppHeaderActionVariant { light, translucent }

class AppHeaderActionButton extends StatelessWidget {
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

  @override
  Widget build(BuildContext context) {
    final effectiveBorderRadius = borderRadius ?? BorderRadius.circular(999);

    final defaultBgColor = variant == AppHeaderActionVariant.translucent
        ? Colors.white.withValues(alpha: 0.2)
        : Colors.white;

    final effectiveBgColor = backgroundColor ?? defaultBgColor;

    final defaultIconColor = variant == AppHeaderActionVariant.translucent
        ? Colors.white
        : AppColors.primary;

    final effectiveIconColor = iconColor ?? defaultIconColor;

    Widget button = Material(
      color: effectiveBgColor,
      borderRadius: effectiveBorderRadius,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: effectiveBorderRadius,
        child: SizedBox(
          width: size,
          height: size,
          child: Center(
            child: Icon(icon, color: effectiveIconColor, size: iconSize),
          ),
        ),
      ),
    );

    if (variant == AppHeaderActionVariant.light) {
      button = Container(
        decoration: BoxDecoration(
          borderRadius: effectiveBorderRadius,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: button,
      );
    }

    final buttonWithBadge = Stack(
      clipBehavior: Clip.none,
      children: [
        button,
        if (badgeCount > 0)
          Positioned(
            right: -3,
            top: -3,
            child: IgnorePointer(
              child: Container(
                constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                padding: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: AppColors.goldDark,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
                alignment: Alignment.center,
                child: Text(
                  badgeCount > 99 ? '99+' : '$badgeCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    height: 1,
                  ),
                ),
              ),
            ),
          ),
      ],
    );

    if (tooltip != null && tooltip!.isNotEmpty) {
      return Semantics(
        button: true,
        label: tooltip,
        child: Tooltip(message: tooltip!, child: buttonWithBadge),
      );
    }

    return Semantics(button: true, child: buttonWithBadge);
  }
}
