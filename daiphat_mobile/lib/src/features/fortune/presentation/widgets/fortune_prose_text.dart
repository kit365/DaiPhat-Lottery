import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

import '../../utils/fortune_ui.dart';

class FortuneProseText extends StatelessWidget {
  const FortuneProseText({super.key, required this.prose, this.luckyTail});

  final String prose;
  final String? luckyTail;

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(children: _spans(localizeFortuneProseDates(prose), luckyTail)),
      style: AppTypography.bodyMedium(
        fontSize: 15,
        height: 1.75,
        color: AppColors.fortuneCream.withValues(alpha: 0.85),
      ),
    );
  }
}

List<TextSpan> _spans(String localized, String? luckyTail) {
  final keywords = <String>[
    if (luckyTail != null && luckyTail.isNotEmpty) luckyTail,
    'Bản mệnh',
    'Hành ngày',
    'đuôi may mắn',
    'Đuôi may mắn',
    'Vận Kim',
    'Vận Mộc',
    'Vận Thủy',
    'Vận Hỏa',
    'Vận Thổ',
    'Kim',
    'Mộc',
    'Thủy',
    'Hỏa',
    'Thổ',
  ];
  keywords.sort((a, b) => b.length.compareTo(a.length));
  final escaped = keywords.map(RegExp.escape).join('|');
  final pattern = RegExp('$escaped|\\d{2}-\\d{2}-\\d{4}|\\d{4}-\\d{2}-\\d{2}');

  final spans = <TextSpan>[];
  var last = 0;
  for (final match in pattern.allMatches(localized)) {
    if (match.start > last) {
      spans.add(TextSpan(text: localized.substring(last, match.start)));
    }
    spans.add(
      TextSpan(
        text: match.group(0),
        style: AppTypography.bodyMedium(
          fontWeight: FontWeight.w800,
          color: AppColors.fortuneGoldLight,
        ),
      ),
    );
    last = match.end;
  }
  if (last < localized.length) {
    spans.add(TextSpan(text: localized.substring(last)));
  }
  return spans.isEmpty ? [TextSpan(text: localized)] : spans;
}
