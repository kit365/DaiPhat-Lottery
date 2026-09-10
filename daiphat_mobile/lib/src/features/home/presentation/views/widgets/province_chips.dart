import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/shared/widgets/app_filter_tab_strip.dart';

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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          // "Đầy đủ" chip: selected when nothing selected
          AppFilterChip(
            label: 'Đầy đủ',
            isSelected: selectedProvinces.isEmpty,
            onTap: () => onToggleProvince(null),
          ),
          ...allProvinces.map(
            (p) => Padding(
              padding: const EdgeInsets.only(left: 8),
              child: AppFilterChip(
                label: p,
                isSelected: selectedProvinces.contains(p),
                onTap: () => onToggleProvince(p),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
