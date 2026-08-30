import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

class HomeTitleDate extends StatelessWidget {
  final DateTime date;
  final VoidCallback onPickDate;
  final VoidCallback onPreviousDay;
  final VoidCallback onNextDay;

  const HomeTitleDate({
    super.key,
    required this.date,
    required this.onPickDate,
    required this.onPreviousDay,
    required this.onNextDay,
  });

  String get _dateStr =>
      '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';

  String _getWeekdayName(DateTime d) {
    switch (d.weekday) {
      case DateTime.monday:
        return 'Thứ Hai';
      case DateTime.tuesday:
        return 'Thứ Ba';
      case DateTime.wednesday:
        return 'Thứ Tư';
      case DateTime.thursday:
        return 'Thứ Năm';
      case DateTime.friday:
        return 'Thứ Sáu';
      case DateTime.saturday:
        return 'Thứ Bảy';
      case DateTime.sunday:
        return 'Chủ Nhật';
      default:
        return '';
    }
  }

  bool get _isToday {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month && date.day == now.day;
  }

  bool get _isYesterday {
    final yest = DateTime.now().subtract(const Duration(days: 1));
    return date.year == yest.year && date.month == yest.month && date.day == yest.day;
  }

  bool get _canGoNext {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final curr = DateTime(date.year, date.month, date.day);
    return curr.isBefore(today);
  }

  @override
  Widget build(BuildContext context) {
    final weekday = _getWeekdayName(date);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Left: Dynamic Title
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Container(
                      width: 4,
                      height: 14,
                      margin: const EdgeInsets.only(right: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    Text(
                      'KẾT QUẢ XỔ SỐ',
                      style: AppTypography.h6(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                        letterSpacing: .6,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  _isToday
                      ? 'HÔM NAY'
                      : (_isYesterday ? 'HÔM QUA' : weekday.toUpperCase()),
                  style: AppTypography.h2(
                    color: AppColors.textMain,
                    height: 1.15,
                    letterSpacing: .5,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '$weekday, $_dateStr',
                  style: AppTypography.bodySmall(
                    fontWeight: FontWeight.w500,
                    color: AppColors.textMuted,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),

          const SizedBox(width: 8),

          // Right: Date Controller Capsule
          SizedBox(
            height: 44,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: AppColors.surfacePrimary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.borderDefault,
                  width: 1.2,
                ),
                boxShadow: const [
                  BoxShadow(
                    color: AppColors.shadowFaint,
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Previous Day Button (‹)
                  Semantics(
                    button: true,
                    label: 'Xem kết quả ngày trước',
                    onTap: onPreviousDay,
                    child: Material(
                      color: AppColors.transparent,
                      child: InkWell(
                        onTap: onPreviousDay,
                        borderRadius: const BorderRadius.horizontal(
                          left: Radius.circular(11),
                        ),
                        child: const SizedBox(
                          width: 44,
                          height: 44,
                          child: Center(
                            child: Icon(
                              Icons.chevron_left_rounded,
                              color: AppColors.contentSecondary,
                              size: 20,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Center Date Picker Trigger
                  Semantics(
                    button: true,
                    label: 'Chọn ngày $_dateStr',
                    onTap: onPickDate,
                    child: Material(
                      color: AppColors.transparent,
                      child: InkWell(
                        onTap: onPickDate,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: SizedBox(
                            height: 44,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.calendar_month_rounded,
                                  color: AppColors.primary,
                                  size: 15,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  _dateStr,
                                  style: AppTypography.labelMedium(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.contentPrimary,
                                    letterSpacing: -0.2,
                                  ),
                                ),
                                const SizedBox(width: 2),
                                const Icon(
                                  Icons.expand_more_rounded,
                                  color: AppColors.contentDisabled,
                                  size: 16,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Next Day Button (›)
                  Semantics(
                    button: true,
                    enabled: _canGoNext,
                    label: 'Xem kết quả ngày tiếp theo',
                    onTap: _canGoNext ? onNextDay : null,
                    child: Material(
                      color: AppColors.transparent,
                      child: InkWell(
                        onTap: _canGoNext ? onNextDay : null,
                        borderRadius: const BorderRadius.horizontal(
                          right: Radius.circular(11),
                        ),
                        child: SizedBox(
                          width: 44,
                          height: 44,
                          child: Center(
                            child: Icon(
                              Icons.chevron_right_rounded,
                              color: _canGoNext
                                  ? AppColors.contentSecondary
                                  : AppColors.borderDisabled,
                              size: 20,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
