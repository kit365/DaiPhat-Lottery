import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

class AppStatusTabItem<T> {
  final T value;
  final String label;
  final int? count;

  const AppStatusTabItem({
    required this.value,
    required this.label,
    this.count,
  });
}

/// Thanh tab trạng thái cuộn ngang với vạch gạch chân indicator chuẩn thương hiệu DaiPhat.
class AppStatusTabBar<T> extends StatelessWidget {
  final List<AppStatusTabItem<T>> items;
  final T? selectedValue;
  final ValueChanged<T> onSelected;
  final double height;
  final Color backgroundColor;
  final Color activeColor;
  final Color inactiveColor;

  const AppStatusTabBar({
    super.key,
    required this.items,
    required this.selectedValue,
    required this.onSelected,
    this.height = 44,
    this.backgroundColor = AppColors.surfacePrimary,
    this.activeColor = AppColors.primary,
    this.inactiveColor = const Color(0xFF555555),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: backgroundColor,
      height: height,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          final isSelected = item.value == selectedValue;

          final displayLabel = item.count != null && item.count! > 0
              ? '${item.label} (${item.count})'
              : item.label;

          return InkWell(
            onTap: () => onSelected(item.value),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              alignment: Alignment.center,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Spacer(),
                  Text(
                    displayLabel,
                    style: AppTypography.main(
                      TextStyle(
                        fontSize: 13.5,
                        fontWeight:
                            isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? activeColor : inactiveColor,
                      ),
                    ),
                  ),
                  const Spacer(),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    height: 2.5,
                    width: isSelected ? 28 : 0,
                    decoration: BoxDecoration(
                      color: isSelected ? activeColor : AppColors.transparent,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
