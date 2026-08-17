import 'package:flutter/material.dart';

/// Brand red scrollbar matching mua-vé style.
/// Track/thumb span half the viewport height (centered via vertical padding).
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
    return LayoutBuilder(
      builder: (context, constraints) {
        final height = constraints.maxHeight;
        final verticalPad =
            height.isFinite && height > 0 ? height / 4 : 4.0;

        return RawScrollbar(
          controller: controller,
          thumbVisibility: true,
          trackVisibility: true,
          thickness: 4,
          radius: const Radius.circular(999),
          thumbColor: const Color(0x66C90F1D),
          trackColor: const Color(0x14C90F1D),
          trackBorderColor: Colors.transparent,
          padding: EdgeInsets.only(
            right: 2,
            top: verticalPad,
            bottom: verticalPad,
          ),
          child: child,
        );
      },
    );
  }
}
