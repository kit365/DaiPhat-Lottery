import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

/// Brand red scrollbar matching mua-vé style.
class BrandScrollbar extends StatelessWidget {
  const BrandScrollbar({
    super.key,
    required this.controller,
    required this.child,
  });

  final ScrollController controller;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return RawScrollbar(
      controller: controller,
      thumbVisibility: true,
      trackVisibility: true,
      thickness: 4,
      radius: const Radius.circular(999),
      thumbColor: const Color(0x66C90F1D),
      trackColor: const Color(0x14C90F1D),
      trackBorderColor: AppColors.transparent,
      padding: const EdgeInsets.only(right: 2, top: 4, bottom: 4),
      child: child,
    );
  }
}
