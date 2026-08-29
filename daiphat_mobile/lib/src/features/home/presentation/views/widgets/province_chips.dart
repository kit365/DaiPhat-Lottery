import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

class ProvinceChips extends StatelessWidget {
  final List<String> allProvinces;
  final Set<String> selectedProvinces;
  final void Function(String?) onToggleProvince;

  const ProvinceChips({
    super.key,
    required this.allProvinces,
    required this.selectedProvinces,
    required this.onToggleProvince,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(children: [
        // "Đầy đủ" chip: selected when nothing selected
        _chip(null, 'Đầy đủ'),
        ...allProvinces.map((p) => Padding(
              padding: const EdgeInsets.only(left: 8),
              child: _chip(p, p),
            )),
      ]),
    );
  }

  Widget _chip(String? val, String label) {
    // null = "Đầy đủ" chip (selected when set is empty)
    final isSel = val == null
        ? selectedProvinces.isEmpty
        : selectedProvinces.contains(val);

    return GestureDetector(
      onTap: () => onToggleProvince(val),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: isSel ? AppColors.primary : const Color(0xFFDBD1D2),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSel ? AppColors.primary : AppColors.cardBorder),
          boxShadow: isSel
              ? [
                  BoxShadow(
                      color: AppColors.primary.withValues(alpha: .25),
                      blurRadius: 8,
                      offset: const Offset(0, 3))
                ]
              : [
                  BoxShadow(
                      color: Colors.black.withValues(alpha: .02),
                      blurRadius: 4,
                      offset: const Offset(0, 2))
                ],
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (isSel) ...[
            Container(
              width: 13,
              height: 13,
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
              child: const Icon(Icons.check, color: AppColors.primary, size: 9),
            ),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: AppTypography.main(
              TextStyle(
                fontSize: 13,
                fontWeight: isSel ? FontWeight.w700 : FontWeight.w600,
                color: isSel ? Colors.white : AppColors.textMain,
              ),
            ),
          ),
        ]),
      ),
    );
  }
}
