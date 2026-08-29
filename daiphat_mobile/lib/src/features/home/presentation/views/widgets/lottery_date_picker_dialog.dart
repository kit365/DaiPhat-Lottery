import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

class LotteryDatePickerDialog extends StatefulWidget {
  final DateTime initialDate;

  const LotteryDatePickerDialog({
    super.key,
    required this.initialDate,
  });

  static Future<DateTime?> show(BuildContext context, DateTime initialDate) {
    return showDialog<DateTime>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.45),
      builder: (_) => LotteryDatePickerDialog(initialDate: initialDate),
    );
  }

  @override
  State<LotteryDatePickerDialog> createState() => _LotteryDatePickerDialogState();
}

class _LotteryDatePickerDialogState extends State<LotteryDatePickerDialog> {
  late DateTime _selectedDate;
  late DateTime _viewMonth;

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime(
      widget.initialDate.year,
      widget.initialDate.month,
      widget.initialDate.day,
    );
    _viewMonth = DateTime(_selectedDate.year, _selectedDate.month, 1);
  }

  DateTime get _today {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  void _prevYear() {
    setState(() {
      _viewMonth = DateTime(_viewMonth.year - 1, _viewMonth.month, 1);
    });
  }

  void _nextYear() {
    final next = DateTime(_viewMonth.year + 1, _viewMonth.month, 1);
    if (!next.isAfter(_today)) {
      setState(() {
        _viewMonth = next;
      });
    } else {
      setState(() {
        _viewMonth = DateTime(_today.year, _today.month, 1);
      });
    }
  }

  void _prevMonth() {
    setState(() {
      _viewMonth = DateTime(_viewMonth.year, _viewMonth.month - 1, 1);
    });
  }

  void _nextMonth() {
    final next = DateTime(_viewMonth.year, _viewMonth.month + 1, 1);
    if (!next.isAfter(_today)) {
      setState(() {
        _viewMonth = next;
      });
    }
  }

  bool get _canNextMonth {
    final next = DateTime(_viewMonth.year, _viewMonth.month + 1, 1);
    return !next.isAfter(_today);
  }

  bool get _canNextYear {
    final next = DateTime(_viewMonth.year + 1, _viewMonth.month, 1);
    return !next.isAfter(_today);
  }

  List<DateTime?> _buildDays() {
    final firstDayOfMonth = DateTime(_viewMonth.year, _viewMonth.month, 1);
    final daysInMonth = DateUtils.getDaysInMonth(_viewMonth.year, _viewMonth.month);

    // Monday = 1, Sunday = 7
    final weekdayOffset = (firstDayOfMonth.weekday - 1) % 7;

    final days = <DateTime?>[];
    for (var i = 0; i < weekdayOffset; i++) {
      days.add(null);
    }
    for (var i = 1; i <= daysInMonth; i++) {
      days.add(DateTime(_viewMonth.year, _viewMonth.month, i));
    }

    final totalSlots = days.length;
    final remaining = totalSlots % 7 == 0 ? 0 : 7 - (totalSlots % 7);
    for (var i = 0; i < remaining; i++) {
      days.add(null);
    }

    return days;
  }

  @override
  Widget build(BuildContext context) {
    final days = _buildDays();

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 360),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 28,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header Month / Year
            Row(
              children: [
                // Prev Year (<<)
                _IconButton(
                  icon: Icons.keyboard_double_arrow_left_rounded,
                  onTap: _prevYear,
                ),
                // Prev Month (<)
                _IconButton(
                  icon: Icons.chevron_left_rounded,
                  onTap: _prevMonth,
                ),

                // Month Title
                Expanded(
                  child: Text(
                    'Tháng ${_viewMonth.month} ${_viewMonth.year}',
                    textAlign: TextAlign.center,
                    style: AppTypography.main(
                      const TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textMain,
                      ),
                    ),
                  ),
                ),

                // Next Month (>)
                _IconButton(
                  icon: Icons.chevron_right_rounded,
                  onTap: _canNextMonth ? _nextMonth : null,
                  disabled: !_canNextMonth,
                ),
                // Next Year (>>)
                _IconButton(
                  icon: Icons.keyboard_double_arrow_right_rounded,
                  onTap: _canNextYear ? _nextYear : null,
                  disabled: !_canNextYear,
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Weekday Headers
            Row(
              children: [
                for (var i = 0; i < 7; i++)
                  Expanded(
                    child: Center(
                      child: Text(
                        ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i],
                        style: AppTypography.main(
                          TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: i >= 5 ? AppColors.primary : const Color(0x99444444),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 8),

            // Days Grid
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 7,
                mainAxisSpacing: 4,
                crossAxisSpacing: 4,
                childAspectRatio: 1.0,
              ),
              itemCount: days.length,
              itemBuilder: (context, index) {
                final d = days[index];
                if (d == null) return const SizedBox.shrink();

                final isSelected = DateUtils.isSameDay(d, _selectedDate);
                final isToday = DateUtils.isSameDay(d, _today);
                final isFuture = d.isAfter(_today);

                return Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: isFuture
                        ? null
                        : () {
                            Navigator.of(context).pop(d);
                          },
                    borderRadius: BorderRadius.circular(100),
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isSelected ? AppColors.primary : Colors.transparent,
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: AppColors.primary.withValues(alpha: 0.35),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ]
                            : null,
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Text(
                            '${d.day}',
                            style: AppTypography.main(
                              TextStyle(
                                fontSize: 14.5,
                                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                color: isSelected
                                    ? Colors.white
                                    : (isFuture
                                        ? const Color(0xFFCBD5E1)
                                        : AppColors.textMain),
                              ),
                            ),
                          ),
                          if (isToday && !isSelected)
                            Positioned(
                              bottom: 4,
                              child: Container(
                                width: 14,
                                height: 2.5,
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.5),
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),

            const SizedBox(height: 14),

            // Today button
            SizedBox(
              width: double.infinity,
              height: 42,
              child: TextButton(
                onPressed: () {
                  Navigator.of(context).pop(_today);
                },
                style: TextButton.styleFrom(
                  backgroundColor: const Color(0xFFFDE8E5),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  'Hôm nay',
                  style: AppTypography.main(
                    const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _IconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final bool disabled;

  const _IconButton({
    required this.icon,
    required this.onTap,
    this.disabled = false,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: disabled ? null : onTap,
        borderRadius: BorderRadius.circular(20),
        child: SizedBox(
          width: 32,
          height: 32,
          child: Icon(
            icon,
            size: 19,
            color: disabled ? const Color(0xFFCBD5E1) : const Color(0xFF444444),
          ),
        ),
      ),
    );
  }
}
