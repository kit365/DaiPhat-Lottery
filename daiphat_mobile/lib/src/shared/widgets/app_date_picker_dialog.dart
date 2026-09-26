import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

/// Unified custom DatePickerDialog following the DaiPhat Design System.
///
/// Features:
/// - Custom brand calendar styling (Material 3 tokens, AA contrast)
/// - Quick year jump grid by tapping the Month/Year header
/// - Prev/Next month and year navigation
/// - Vietnamese weekday headers (T2 -> CN)
/// - Flexible bounds (`firstDate`, `lastDate`, `initialDate`)
class AppDatePickerDialog extends StatefulWidget {
  final DateTime initialDate;
  final DateTime? firstDate;
  final DateTime? lastDate;
  final String? title;
  final bool showTodayButton;

  const AppDatePickerDialog({
    super.key,
    required this.initialDate,
    this.firstDate,
    this.lastDate,
    this.title,
    this.showTodayButton = true,
  });

  static Future<DateTime?> show(
    BuildContext context,
    DateTime initialDate, {
    DateTime? firstDate,
    DateTime? lastDate,
    String? title,
    bool showTodayButton = true,
  }) {
    return showDialog<DateTime>(
      context: context,
      barrierColor: AppColors.neutralInk.withValues(alpha: 0.45),
      builder: (_) => AppDatePickerDialog(
        initialDate: initialDate,
        firstDate: firstDate,
        lastDate: lastDate,
        title: title,
        showTodayButton: showTodayButton,
      ),
    );
  }

  @override
  State<AppDatePickerDialog> createState() => _AppDatePickerDialogState();
}

class _AppDatePickerDialogState extends State<AppDatePickerDialog> {
  late DateTime _selectedDate;
  late DateTime _viewMonth;
  late final DateTime _firstDate;
  late final DateTime _lastDate;
  bool _isYearPickerMode = false;
  late final ScrollController _yearScrollController;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _firstDate = widget.firstDate ?? DateTime(1900, 1, 1);
    _lastDate = widget.lastDate ?? DateTime(now.year + 5, 12, 31);

    var init = DateTime(
      widget.initialDate.year,
      widget.initialDate.month,
      widget.initialDate.day,
    );
    if (init.isBefore(_firstDate)) init = _firstDate;
    if (init.isAfter(_lastDate)) init = _lastDate;

    _selectedDate = init;
    _viewMonth = DateTime(_selectedDate.year, _selectedDate.month, 1);

    _yearScrollController = ScrollController();
  }

  @override
  void dispose() {
    _yearScrollController.dispose();
    super.dispose();
  }

  DateTime get _today {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  bool _isDateDisabled(DateTime date) {
    if (date.isBefore(DateTime(_firstDate.year, _firstDate.month, _firstDate.day))) {
      return true;
    }
    if (date.isAfter(DateTime(_lastDate.year, _lastDate.month, _lastDate.day))) {
      return true;
    }
    return false;
  }

  void _prevYear() {
    final target = DateTime(_viewMonth.year - 1, _viewMonth.month, 1);
    if (target.year >= _firstDate.year) {
      setState(() {
        _viewMonth = target;
      });
    }
  }

  void _nextYear() {
    final target = DateTime(_viewMonth.year + 1, _viewMonth.month, 1);
    if (target.year <= _lastDate.year) {
      setState(() {
        _viewMonth = target;
      });
    }
  }

  void _prevMonth() {
    final target = DateTime(_viewMonth.year, _viewMonth.month - 1, 1);
    if (!target.isBefore(DateTime(_firstDate.year, _firstDate.month, 1))) {
      setState(() {
        _viewMonth = target;
      });
    }
  }

  void _nextMonth() {
    final target = DateTime(_viewMonth.year, _viewMonth.month + 1, 1);
    if (!target.isAfter(DateTime(_lastDate.year, _lastDate.month, 1))) {
      setState(() {
        _viewMonth = target;
      });
    }
  }

  bool get _canPrevMonth {
    final target = DateTime(_viewMonth.year, _viewMonth.month - 1, 1);
    return !target.isBefore(DateTime(_firstDate.year, _firstDate.month, 1));
  }

  bool get _canNextMonth {
    final target = DateTime(_viewMonth.year, _viewMonth.month + 1, 1);
    return !target.isAfter(DateTime(_lastDate.year, _lastDate.month, 1));
  }

  bool get _canPrevYear {
    return _viewMonth.year > _firstDate.year;
  }

  bool get _canNextYear {
    return _viewMonth.year < _lastDate.year;
  }

  void _toggleYearPicker() {
    setState(() {
      _isYearPickerMode = !_isYearPickerMode;
    });

    if (_isYearPickerMode) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_yearScrollController.hasClients) return;
        final selectedIndex = _viewMonth.year - _firstDate.year;
        final row = selectedIndex ~/ 4;
        final offset = (row * 48.0) - 80.0;
        _yearScrollController.animateTo(
          offset.clamp(0.0, _yearScrollController.position.maxScrollExtent),
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      });
    }
  }

  void _selectYear(int year) {
    setState(() {
      _viewMonth = DateTime(year, _viewMonth.month, 1);
      _isYearPickerMode = false;
    });
  }

  List<DateTime?> _buildDays() {
    final firstDayOfMonth = DateTime(_viewMonth.year, _viewMonth.month, 1);
    final daysInMonth = DateUtils.getDaysInMonth(
      _viewMonth.year,
      _viewMonth.month,
    );

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
    final canSelectToday = !_isDateDisabled(_today);

    return Dialog(
      backgroundColor: AppColors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 360),
        decoration: BoxDecoration(
          color: AppColors.surfacePrimary,
          borderRadius: BorderRadius.circular(20),
          boxShadow: const [
            BoxShadow(
              color: AppColors.shadowElevated,
              blurRadius: 28,
              offset: Offset(0, 10),
            ),
          ],
        ),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Optional Custom Title (e.g. "Chọn ngày sinh")
            if (widget.title != null) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    widget.title!,
                    style: AppTypography.h5(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textMain,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                    color: AppColors.contentMuted,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],

            // Header Month / Year
            Row(
              children: [
                // Prev Year (<<)
                _IconButton(
                  icon: Icons.keyboard_double_arrow_left_rounded,
                  tooltip: 'Năm trước',
                  onTap: _canPrevYear ? _prevYear : null,
                  disabled: !_canPrevYear,
                ),
                // Prev Month (<)
                _IconButton(
                  icon: Icons.chevron_left_rounded,
                  tooltip: 'Tháng trước',
                  onTap: _canPrevMonth ? _prevMonth : null,
                  disabled: !_canPrevMonth,
                ),

                // Month / Year Title with Year Picker toggle
                Expanded(
                  child: InkWell(
                    onTap: _toggleYearPicker,
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Flexible(
                            child: Text(
                              'Tháng ${_viewMonth.month} ${_viewMonth.year}',
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.h5(
                                fontSize: 15.5,
                                fontWeight: FontWeight.w800,
                                color: _isYearPickerMode
                                    ? AppColors.primary
                                    : AppColors.textMain,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            _isYearPickerMode
                                ? Icons.arrow_drop_up_rounded
                                : Icons.arrow_drop_down_rounded,
                            color: _isYearPickerMode
                                ? AppColors.primary
                                : AppColors.contentSecondary,
                            size: 20,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Next Month (>)
                _IconButton(
                  icon: Icons.chevron_right_rounded,
                  tooltip: 'Tháng sau',
                  onTap: _canNextMonth ? _nextMonth : null,
                  disabled: !_canNextMonth,
                ),
                // Next Year (>>)
                _IconButton(
                  icon: Icons.keyboard_double_arrow_right_rounded,
                  tooltip: 'Năm sau',
                  onTap: _canNextYear ? _nextYear : null,
                  disabled: !_canNextYear,
                ),
              ],
            ),

            const SizedBox(height: 10),

            // Content: Year Grid Picker OR Calendar Days Grid
            if (_isYearPickerMode)
              _buildYearGrid()
            else ...[
              // Weekday Headers
              Row(
                children: [
                  for (var i = 0; i < 7; i++)
                    Expanded(
                      child: Center(
                        child: Text(
                          ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i],
                          style: AppTypography.labelMedium(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: i >= 5
                                ? AppColors.primary
                                : AppColors.contentSlate600,
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
                  final isDisabled = _isDateDisabled(d);

                  return Material(
                    color: AppColors.transparent,
                    child: InkWell(
                      onTap: isDisabled
                          ? null
                          : () {
                              Navigator.of(context).pop(d);
                            },
                      borderRadius: BorderRadius.circular(100),
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.transparent,
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color: AppColors.primary.withValues(
                                      alpha: 0.35,
                                    ),
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
                              style: AppTypography.bodyMedium(
                                fontSize: 14.5,
                                fontWeight: isSelected
                                    ? FontWeight.w800
                                    : FontWeight.w600,
                                color: isSelected
                                    ? AppColors.surfacePrimary
                                    : (isDisabled
                                        ? AppColors.contentDisabled
                                        : AppColors.textMain),
                              ),
                            ),
                            if (isToday && !isSelected)
                              Positioned(
                                bottom: 4,
                                child: Container(
                                  width: 14,
                                  height: 2.5,
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(
                                      alpha: 0.5,
                                    ),
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
            ],

            const SizedBox(height: 14),

            // Footer Action: "Hôm nay" (if enabled)
            if (widget.showTodayButton && canSelectToday && !_isYearPickerMode)
              SizedBox(
                width: double.infinity,
                height: 42,
                child: TextButton(
                  onPressed: () {
                    Navigator.of(context).pop(_today);
                  },
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.surfaceBrandSubtle,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'Hôm nay',
                    style: AppTypography.buttonMedium(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildYearGrid() {
    final years = <int>[];
    for (var y = _firstDate.year; y <= _lastDate.year; y++) {
      years.add(y);
    }

    return SizedBox(
      height: 230,
      child: GridView.builder(
        controller: _yearScrollController,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 4,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 1.8,
        ),
        itemCount: years.length,
        itemBuilder: (context, index) {
          final year = years[index];
          final isSelected = year == _viewMonth.year;

          return Material(
            color: isSelected
                ? AppColors.primary
                : AppColors.surfaceSoft,
            borderRadius: BorderRadius.circular(10),
            child: InkWell(
              onTap: () => _selectYear(year),
              borderRadius: BorderRadius.circular(10),
              child: Center(
                child: Text(
                  '$year',
                  style: AppTypography.subtitle2(
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    color: isSelected
                        ? AppColors.surfacePrimary
                        : AppColors.textMain,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _IconButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback? onTap;
  final bool disabled;

  const _IconButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.disabled = false,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.transparent,
      child: Tooltip(
        message: tooltip,
        child: Semantics(
          button: true,
          enabled: !disabled,
          label: tooltip,
          child: InkWell(
            onTap: disabled ? null : onTap,
            borderRadius: BorderRadius.circular(24),
            child: SizedBox(
              width: 44,
              height: 44,
              child: Icon(
                icon,
                size: 19,
                color: disabled
                    ? AppColors.contentDisabled
                    : AppColors.contentSecondary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Backward compatibility alias
typedef LotteryDatePickerDialog = AppDatePickerDialog;
