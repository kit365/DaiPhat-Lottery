import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_picker_field.dart';
import '../../data/system_config_service.dart';
import '../providers/checkout_provider.dart';

/// Date/Time picker nhận vé đọc động từ BE qua [operatingHoursProvider]:
/// - Giờ mở/đóng cửa động từ BE (SITE_SUPPORT_OPEN_TIME, SITE_SUPPORT_CLOSE_TIME)
/// - Ngày: Hôm nay / Ngày mai
/// - Giờ 12h + Phút + AM/PM
/// - Slot phút: 00 / 15 / 30 / 45
/// - Lead time tối thiểu 15 phút
class CheckoutDateTimePicker extends ConsumerStatefulWidget {
  final String? value;
  final ValueChanged<String> onChanged;
  final String? errorText;
  final int minLeadMinutes;
  final VoidCallback? onInfoTap;
  final bool embedded;

  const CheckoutDateTimePicker({
    super.key,
    required this.value,
    required this.onChanged,
    this.errorText,
    this.minLeadMinutes = 15,
    this.onInfoTap,
    this.embedded = false,
  });

  @override
  ConsumerState<CheckoutDateTimePicker> createState() =>
      _CheckoutDateTimePickerState();
}

class _CheckoutDateTimePickerState
    extends ConsumerState<CheckoutDateTimePicker> {
  Timer? _tickTimer;
  DateTime _now = DateTime.now();

  SiteOperatingHours get _opHours =>
      ref.watch(operatingHoursProvider).asData?.value ??
      const SiteOperatingHours();

  @override
  void initState() {
    super.initState();
    _tickTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!mounted) return;
      setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _tickTimer?.cancel();
    super.dispose();
  }

  DateTime get _minSelectable {
    final base = _now.add(Duration(minutes: widget.minLeadMinutes));
    return _ceilToNextSlot(base);
  }

  DateTime get _today => DateTime(_now.year, _now.month, _now.day);
  DateTime get _tomorrow => _today.add(const Duration(days: 1));

  /// Slot sớm nhất hôm nay trong khung giờ mở cửa (nếu còn).
  DateTime? get _earliestToday {
    final open = DateTime(
      _today.year,
      _today.month,
      _today.day,
      _opHours.openHour,
      0,
    );
    final close = DateTime(
      _today.year,
      _today.month,
      _today.day,
      _opHours.closeHour,
      0,
    );
    if (_minSelectable.isAfter(close)) return null;
    return _minSelectable.isBefore(open) ? open : _minSelectable;
  }

  bool get _canSelectToday => _earliestToday != null;

  DateTime? get _selected {
    final raw = widget.value;
    if (raw == null || raw.isEmpty) return null;
    return DateTime.tryParse(raw);
  }

  String get _displayText {
    final selected = _selected;
    if (selected == null) return 'Chọn ngày và giờ';
    final dateLabel = _isSameDay(selected, _today)
        ? 'Hôm nay'
        : _isSameDay(selected, _tomorrow)
        ? 'Ngày mai'
        : DateFormat('dd/MM/yyyy').format(selected);
    final h24 = selected.hour.toString().padLeft(2, '0');
    final m = selected.minute.toString().padLeft(2, '0');
    final time = '$h24:$m';
    return '$time · $dateLabel (${DateFormat('dd/MM/yyyy').format(selected)})';
  }

  Future<void> _openSheet() async {
    final result = await showModalBottomSheet<DateTime>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surfacePrimary,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _PickupTimeSheet(
        initial: _selected,
        minLeadMinutes: widget.minLeadMinutes,
        operatingHours: _opHours,
        canSelectToday: _canSelectToday,
        earliestToday: _earliestToday,
        today: _today,
        tomorrow: _tomorrow,
        minSelectable: _minSelectable,
      ),
    );
    if (result != null) {
      widget.onChanged(_formatLocalIso(result));
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasValue = _selected != null;
    final hasError = widget.errorText != null;

    if (widget.embedded) {
      return AppPickerField(
        label: 'Thời gian đến lấy *',
        value: hasValue ? _displayText : null,
        placeholder: 'Chọn ngày và giờ',
        errorText: widget.errorText,
        prefixIcon: Icons.calendar_month_outlined,
        suffixIcon: Icons.chevron_right_rounded,
        variant: AppPickerFieldVariant.embedded,
        onTap: _openSheet,
        semanticLabel: hasValue
            ? 'Thời gian đến lấy: $_displayText'
            : 'Chọn ngày và giờ nhận vé',
        semanticHint: hasError
            ? widget.errorText
            : 'Mở bộ chọn ngày và giờ nhận vé',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Thời gian đến lấy *',
              style: AppTypography.caption(
                color: AppColors.contentSlate700,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (widget.onInfoTap != null) ...[
              const SizedBox(width: 4),
              Tooltip(
                message: 'Thông tin thời gian nhận vé',
                child: Semantics(
                  button: true,
                  label: 'Xem thông tin thời gian nhận vé',
                  onTap: widget.onInfoTap,
                  child: ExcludeSemantics(
                    child: InkWell(
                      onTap: widget.onInfoTap,
                      borderRadius: BorderRadius.circular(12),
                      child: const SizedBox(
                        width: 44,
                        height: 44,
                        child: Center(
                          child: Icon(
                            Icons.error_outline_rounded,
                            size: 18,
                            color: AppColors.statusWarningForeground,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        AppPickerField(
          value: hasValue ? _displayText : null,
          placeholder: 'Chọn ngày và giờ',
          errorText: widget.errorText,
          prefixIcon: Icons.calendar_month_rounded,
          suffixIcon: Icons.access_time_rounded,
          onTap: _openSheet,
          semanticLabel: hasValue
              ? 'Thời gian đến lấy: $_displayText'
              : 'Chọn ngày và giờ nhận vé',
          semanticHint: hasError
              ? widget.errorText
              : 'Mở bộ chọn ngày và giờ nhận vé',
        ),
        const SizedBox(height: 6),
        Text(
          'Giờ mở cửa: ${_opHours.openTime} – ${_opHours.closeTime}. Đặt trước ít nhất ${widget.minLeadMinutes} phút.',
          style: AppTypography.caption(
            fontSize: 11.5,
            color: AppColors.contentPlaceholder,
            height: 1.4,
          ),
        ),
      ],
    );
  }

  static DateTime _ceilToNextSlot(DateTime minTime) {
    var t = DateTime(
      minTime.year,
      minTime.month,
      minTime.day,
      minTime.hour,
      minTime.minute,
    );
    final mod = t.minute % 15;
    if (mod != 0) {
      t = t.add(Duration(minutes: 15 - mod));
    } else if (minTime.second > 0 || minTime.millisecond > 0) {
      t = t.add(const Duration(minutes: 15));
    }
    while (t.isBefore(minTime)) {
      t = t.add(const Duration(minutes: 15));
    }
    return t;
  }

  static bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  static String _formatLocalIso(DateTime dt) {
    final y = dt.year.toString().padLeft(4, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    final h = dt.hour.toString().padLeft(2, '0');
    final min = dt.minute.toString().padLeft(2, '0');
    return '$y-$m-${d}T$h:$min:00';
  }
}

class _PickupTimeSheet extends StatefulWidget {
  final DateTime? initial;
  final int minLeadMinutes;
  final SiteOperatingHours operatingHours;
  final bool canSelectToday;
  final DateTime? earliestToday;
  final DateTime today;
  final DateTime tomorrow;
  final DateTime minSelectable;

  const _PickupTimeSheet({
    required this.initial,
    required this.minLeadMinutes,
    required this.operatingHours,
    required this.canSelectToday,
    required this.earliestToday,
    required this.today,
    required this.tomorrow,
    required this.minSelectable,
  });

  @override
  State<_PickupTimeSheet> createState() => _PickupTimeSheetState();
}

class _PickupTimeSheetState extends State<_PickupTimeSheet> {
  static const _slotMinutes = [0, 15, 30, 45];

  late bool _isToday;
  late int _hour24;
  late int _minute;

  @override
  void initState() {
    super.initState();
    final fallback = widget.canSelectToday
        ? widget.earliestToday!
        : DateTime(
            widget.tomorrow.year,
            widget.tomorrow.month,
            widget.tomorrow.day,
            widget.operatingHours.openHour,
            0,
          );
    final initial = widget.initial;
    final seed = (initial != null && !initial.isBefore(widget.minSelectable))
        ? initial
        : fallback;

    _isToday = _isSameDay(seed, widget.today);
    if (_isToday && !widget.canSelectToday) {
      _isToday = false;
    }

    _hour24 = seed.hour;
    _minute = (seed.minute ~/ 15) * 15;
    _normalizeSelection();
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  DateTime get _selectedDate => _isToday ? widget.today : widget.tomorrow;

  List<int> get _availableHours24 {
    final hours = <int>[];
    for (var h = widget.operatingHours.openHour;
        h <= widget.operatingHours.closeHour;
        h++) {
      if (!_isToday) {
        hours.add(h);
      } else {
        final earliest = widget.earliestToday;
        if (earliest == null) continue;
        if (h < earliest.hour) continue;
        if (h == earliest.hour) {
          final hasSlot = _slotMinutes.any((m) {
            final candidate = DateTime(
              widget.today.year,
              widget.today.month,
              widget.today.day,
              h,
              m,
            );
            return !candidate.isBefore(earliest);
          });
          if (hasSlot) hours.add(h);
        } else {
          hours.add(h);
        }
      }
    }
    return hours;
  }

  List<int> get _availableMinutes {
    if (!_isToday) return List<int>.from(_slotMinutes);
    final earliest = widget.earliestToday;
    if (earliest == null) return const [];
    return _slotMinutes.where((m) {
      final candidate = DateTime(
        widget.today.year,
        widget.today.month,
        widget.today.day,
        _hour24,
        m,
      );
      return !candidate.isBefore(earliest);
    }).toList();
  }

  void _normalizeSelection() {
    final hours = _availableHours24;
    if (hours.isEmpty) return;
    if (!hours.contains(_hour24)) _hour24 = hours.first;
    final minutes = _availableMinutes;
    if (minutes.isEmpty) return;
    if (!minutes.contains(_minute)) _minute = minutes.first;
  }

  void _selectToday() {
    if (!widget.canSelectToday || widget.earliestToday == null) return;
    setState(() {
      _isToday = true;
      final earliest = widget.earliestToday!;
      _hour24 = earliest.hour;
      _minute = earliest.minute;
      _normalizeSelection();
    });
  }

  void _selectTomorrow() {
    setState(() {
      _isToday = false;
      _hour24 = widget.operatingHours.openHour;
      _minute = 0;
      _normalizeSelection();
    });
  }

  void _confirm() {
    var picked = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _hour24,
      _minute,
    );
    if (picked.isBefore(widget.minSelectable)) {
      picked = widget.canSelectToday
          ? widget.earliestToday!
          : DateTime(
              widget.tomorrow.year,
              widget.tomorrow.month,
              widget.tomorrow.day,
              widget.operatingHours.openHour,
              0,
            );
    }
    Navigator.pop(context, picked);
  }

  String _fmtDay(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final hours = _availableHours24;
    final minutes = _availableMinutes;
    final canConfirm = hours.isNotEmpty && minutes.isNotEmpty;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 12,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Chọn thời gian nhận vé',
              textAlign: TextAlign.left,
              style: AppTypography.h4(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppColors.contentPrimary,
              ),
            ),
            const SizedBox(height: 16),

            // Date buttons
            Text(
              'Ngày nhận vé',
              style: AppTypography.caption(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.contentMuted,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _DateOptionButton(
                    label: 'Hôm nay',
                    subLabel: _fmtDay(widget.today),
                    isSelected: _isToday,
                    isDisabled: !widget.canSelectToday,
                    onTap: _selectToday,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _DateOptionButton(
                    label: 'Ngày mai',
                    subLabel: _fmtDay(widget.tomorrow),
                    isSelected: !_isToday,
                    isDisabled: false,
                    onTap: _selectTomorrow,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Time Selection: 2 dropdowns (Giờ 24h, Phút)
            Text(
              'Khung giờ',
              style: AppTypography.caption(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.contentMuted,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                // 1. Hour 24h dropdown
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.cardBorder),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<int>(
                        value: hours.contains(_hour24)
                            ? _hour24
                            : (hours.isNotEmpty ? hours.first : null),
                        isExpanded: true,
                        icon: const Icon(
                          Icons.arrow_drop_down_rounded,
                          color: AppColors.contentMuted,
                        ),
                        items: hours.map((h) {
                          return DropdownMenuItem<int>(
                            value: h,
                            child: Text(
                              '${h.toString().padLeft(2, '0')} giờ',
                              style: AppTypography.bodyMedium(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                                color: AppColors.contentPrimary,
                              ),
                            ),
                          );
                        }).toList(),
                        onChanged: (newHour) {
                          if (newHour == null) return;
                          setState(() {
                            _hour24 = newHour;
                            _normalizeSelection();
                          });
                        },
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // 2. Minute dropdown
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.cardBorder),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<int>(
                        value: minutes.contains(_minute)
                            ? _minute
                            : (minutes.isNotEmpty ? minutes.first : null),
                        isExpanded: true,
                        icon: const Icon(
                          Icons.arrow_drop_down_rounded,
                          color: AppColors.contentMuted,
                        ),
                        items: minutes.map((m) {
                          return DropdownMenuItem<int>(
                            value: m,
                            child: Text(
                              '${m.toString().padLeft(2, '0')} phút',
                              style: AppTypography.bodyMedium(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                                color: AppColors.contentPrimary,
                              ),
                            ),
                          );
                        }).toList(),
                        onChanged: (newMinute) {
                          if (newMinute == null) return;
                          setState(() => _minute = newMinute);
                        },
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Hint
            Text(
              'Quầy mở cửa: ${widget.operatingHours.openTime} – ${widget.operatingHours.closeTime}. Vui lòng đặt trước ít nhất ${widget.minLeadMinutes} phút.',
              style: AppTypography.caption(
                fontSize: 11.5,
                color: AppColors.contentPlaceholder,
                height: 1.3,
              ),
            ),
            const SizedBox(height: 20),

            // Confirm button
            ElevatedButton(
              onPressed: canConfirm ? _confirm : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.surfacePrimary,
                disabledBackgroundColor: AppColors.brandPrimaryBorder,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: Text(
                'Xác nhận',
                style: AppTypography.buttonMedium(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.surfacePrimary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DateOptionButton extends StatelessWidget {
  final String label;
  final String subLabel;
  final bool isSelected;
  final bool isDisabled;
  final VoidCallback onTap;

  const _DateOptionButton({
    required this.label,
    required this.subLabel,
    required this.isSelected,
    required this.isDisabled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (isDisabled) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.cardBorder),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: AppTypography.bodySmall(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.contentPlaceholder,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subLabel,
              style: AppTypography.caption(
                fontSize: 11,
                color: AppColors.contentPlaceholder,
              ),
            ),
          ],
        ),
      );
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.surfaceEmptyState
              : AppColors.surfacePrimary,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.cardBorder,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: AppTypography.bodySmall(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: isSelected
                    ? AppColors.primary
                    : AppColors.contentPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subLabel,
              style: AppTypography.caption(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: isSelected ? AppColors.primary : AppColors.contentMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
