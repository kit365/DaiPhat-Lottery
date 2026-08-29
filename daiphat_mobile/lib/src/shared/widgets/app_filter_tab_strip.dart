import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

class AppFilterTabItem<T> {
  final T value;
  final String label;
  final int? count;
  final IconData? icon;

  const AppFilterTabItem({
    required this.value,
    required this.label,
    this.count,
    this.icon,
  });
}

class AppFilterTabStrip<T> extends StatelessWidget {
  final List<AppFilterTabItem<T>> items;
  final T? selectedValue;
  final ValueChanged<T> onSelected;
  final EdgeInsetsGeometry padding;
  final double height;
  final double spacing;

  const AppFilterTabStrip({
    super.key,
    required this.items,
    required this.selectedValue,
    required this.onSelected,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    this.height = 48,
    this.spacing = 8,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: padding,
        itemCount: items.length,
        separatorBuilder: (_, _) => SizedBox(width: spacing),
        itemBuilder: (context, index) {
          final item = items[index];
          final isSelected = item.value == selectedValue;

          final displayLabel = item.count != null && item.count! > 0
              ? '${item.label} (${item.count})'
              : item.label;

          return AppFilterChip(
            label: displayLabel,
            isSelected: isSelected,
            icon: item.icon,
            onTap: () => onSelected(item.value),
          );
        },
      ),
    );
  }
}

class AppFilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final IconData? icon;
  final VoidCallback onTap;

  const AppFilterChip({
    super.key,
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7.5),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primary
                : AppColors.surfacePrimary.withValues(alpha: 0.94),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? AppColors.primary : const Color(0xFFEBE3E1),
              width: 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.28),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 4,
                      offset: const Offset(0, 1.5),
                    ),
                  ],
          ),
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 14,
                  color: isSelected
                      ? AppColors.surfacePrimary
                      : AppColors.contentMuted,
                ),
                const SizedBox(width: 5),
              ],
              Text(
                label,
                style: AppTypography.main(
                  TextStyle(
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected
                        ? AppColors.surfacePrimary
                        : AppColors.contentPrimary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
