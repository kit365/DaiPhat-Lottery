import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

/// Date/Time picker nhận vé:
/// - Ngày: hôm nay / ngày mai
/// - Giờ: 5, 6, 7, 8
/// - Hôm nay: chỉ AM | Ngày mai: AM hoặc PM
/// - Slot phút: 00 / 15 / 30 / 45
/// - Lead time tối thiểu 15 phút
class CheckoutDateTimePicker extends StatefulWidget {
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
  State<CheckoutDateTimePicker> createState() => _CheckoutDateTimePickerState();
}

class _CheckoutDateTimePickerState extends State<CheckoutDateTimePicker> {
  Timer? _tickTimer;
  DateTime _now = DateTime.now();

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

  /// Slot sớm nhất hôm nay trong khung AM 5–8 (nếu còn).
  DateTime? get _earliestToday {
    final open = DateTime(_today.year, _today.month, _today.day, 5);
    final close = DateTime(_today.year, _today.month, _today.day, 8, 45);
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
    final period = selected.hour >= 12 ? 'PM' : 'AM';
    final h12 = _toHour12(selected.hour);
    final time =
        '${h12.toString().padLeft(2, '0')}:${selected.minute.toString().padLeft(2, '0')} $period';
    return '$time · $dateLabel (${DateFormat('dd/MM/yyyy').format(selected)})';
  }

  Future<void> _openSheet() async {
    final result = await showModalBottomSheet<DateTime>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _PickupTimeSheet(
        initial: _selected,
        minLeadMinutes: widget.minLeadMinutes,
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
      return InkWell(
        onTap: _openSheet,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const SizedBox(
                    width: 48,
                    child: Icon(
                      Icons.calendar_month_outlined,
                      color: Color(0xFF15213B),
                      size: 26,
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Thời gian đến lấy *',
                          style: TextStyle(
                            color: hasError
                                ? AppColors.primary
                                : const Color(0xFF8B94A3),
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _displayText,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: hasValue
                                ? const Color(0xFF15213B)
                                : AppColors.loginPlaceholder,
                            fontSize: 15,
                            fontWeight:
                                hasValue ? FontWeight.w700 : FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: Color(0xFF15213B),
                    size: 28,
                  ),
                ],
              ),
              if (hasError)
                Padding(
                  padding: const EdgeInsets.only(left: 48, top: 6),
                  child: Text(
                    widget.errorText!,
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Thời gian đến lấy *',
              style: TextStyle(
                color: Color(0xFF374151),
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (widget.onInfoTap != null) ...[
              const SizedBox(width: 4),
              InkWell(
                onTap: widget.onInfoTap,
                borderRadius: BorderRadius.circular(12),
                child: const Padding(
                  padding: EdgeInsets.all(2),
                  child: Icon(
                    Icons.error_outline_rounded,
                    size: 18,
                    color: Color(0xFFFFB020),
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: _openSheet,
          borderRadius: BorderRadius.circular(12),
          child: InputDecorator(
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.calendar_month_rounded),
              errorText: widget.errorText,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: hasError ? Colors.red : const Color(0xFFE5E7EB),
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: hasError ? Colors.red : AppColors.primary,
                  width: 1.5,
                ),
              ),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    _displayText,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: hasValue ? FontWeight.w600 : FontWeight.w400,
                      color: hasValue
                          ? const Color(0xFF15213B)
                          : AppColors.loginPlaceholder,
                    ),
                  ),
                ),
                const Icon(
                  Icons.access_time_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Hôm nay: buổi sáng (AM). Ngày mai: AM hoặc PM. Giờ 5–8, cách ít nhất ${widget.minLeadMinutes} phút.',
          style: const TextStyle(
            fontSize: 11,
            color: Color(0xFF919EAB),
            height: 1.4,
          ),
        ),
      ],
    );
  }

  static int _toHour12(int hour24) {
    final h = hour24 % 12;
    return h == 0 ? 12 : h;
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
  final bool canSelectToday;
  final DateTime? earliestToday;
  final DateTime today;
  final DateTime tomorrow;
  final DateTime minSelectable;

  const _PickupTimeSheet({
    required this.initial,
    required this.minLeadMinutes,
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
  static const _hours12 = [5, 6, 7, 8];
  static const _slotMinutes = [0, 15, 30, 45];

  late bool _isToday;
  late String _period; // AM | PM
  late int _hour12; // 5..8
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
            5,
          );
    final initial = widget.initial;
    final seed = (initial != null && !initial.isBefore(widget.minSelectable))
        ? initial
        : fallback;

    _isToday = _isSameDay(seed, widget.today);
    if (_isToday && !widget.canSelectToday) {
      _isToday = false;
    }

    _period = _isToday ? 'AM' : (seed.hour >= 12 ? 'PM' : 'AM');
    _hour12 = _toHour12(seed.hour);
    if (!_hours12.contains(_hour12)) _hour12 = 5;
    _minute = (seed.minute ~/ 15) * 15;
    _normalizeSelection();
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  int _toHour12(int hour24) {
    final h = hour24 % 12;
    return h == 0 ? 12 : h;
  }

  int _toHour24(int hour12, String period) {
    if (period == 'AM') return hour12; // 5..8
    return hour12 + 12; // 17..20
  }

  DateTime get _selectedDate => _isToday ? widget.today : widget.tomorrow;

  List<String> get _availablePeriods =>
      _isToday ? const ['AM'] : const ['AM', 'PM'];

  List<int> get _availableHours12 {
    return _hours12.where((h12) {
      final h24 = _toHour24(h12, _period);
      if (!_isToday) return true;
      final earliest = widget.earliestToday;
      if (earliest == null) return false;
      if (h24 < earliest.hour) return false;
      if (h24 == earliest.hour) {
        return _slotMinutes.any((m) {
          final candidate = DateTime(
            widget.today.year,
            widget.today.month,
            widget.today.day,
            h24,
            m,
          );
          return !candidate.isBefore(earliest);
        });
      }
      // Hôm nay chỉ AM → không vượt quá 8:45
      return h24 <= 8;
    }).toList();
  }

  List<int> get _availableMinutes {
    final h24 = _toHour24(_hour12, _period);
    if (!_isToday) return List<int>.from(_slotMinutes);
    final earliest = widget.earliestToday;
    if (earliest == null) return const [];
    return _slotMinutes.where((m) {
      final candidate = DateTime(
        widget.today.year,
        widget.today.month,
        widget.today.day,
        h24,
        m,
      );
      return !candidate.isBefore(earliest);
    }).toList();
  }

  void _normalizeSelection() {
    if (!_availablePeriods.contains(_period)) {
      _period = _availablePeriods.first;
    }
    final hours = _availableHours12;
    if (hours.isEmpty) return;
    if (!hours.contains(_hour12)) _hour12 = hours.first;
    final minutes = _availableMinutes;
    if (minutes.isEmpty) return;
    if (!minutes.contains(_minute)) _minute = minutes.first;
  }

  void _selectToday() {
    if (!widget.canSelectToday || widget.earliestToday == null) return;
    setState(() {
      _isToday = true;
      _period = 'AM';
      _hour12 = _toHour12(widget.earliestToday!.hour);
      _minute = widget.earliestToday!.minute;
      _normalizeSelection();
    });
  }

  void _selectTomorrow() {
    setState(() {
      _isToday = false;
      _period = 'AM';
      _hour12 = 5;
      _minute = 0;
      _normalizeSelection();
    });
  }

  void _confirm() {
    final h24 = _toHour24(_hour12, _period);
    var picked = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      h24,
      _minute,
    );
    if (picked.isBefore(widget.minSelectable)) {
      picked = widget.canSelectToday
          ? widget.earliestToday!
          : DateTime(
              widget.tomorrow.year,
              widget.tomorrow.month,
              widget.tomorrow.day,
              5,
            );
    }
    Navigator.pop(context, picked);
  }

  String _fmtDay(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final hours = _availableHours12;
    final minutes = _availableMinutes;
    final periods = _availablePeriods;
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
                  color: const Color(0xFFDFE3E8),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Chọn thời gian nhận vé',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: Color(0xFF15213B),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Ngày nhận vé',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFF212B36),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _DayChip(
                    label: 'Hôm nay',
                    subLabel: _fmtDay(widget.today),
                    selected: _isToday,
                    enabled: widget.canSelectToday,
                    onTap: _selectToday,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _DayChip(
                    label: 'Ngày mai',
                    subLabel: _fmtDay(widget.tomorrow),
                    selected: !_isToday,
                    enabled: true,
                    onTap: _selectTomorrow,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _isToday
                  ? 'Hôm nay chỉ chọn buổi sáng (AM), tối thiểu sau ${widget.minLeadMinutes} phút.'
                  : 'Ngày mai có thể chọn AM hoặc PM. Giờ 5–8.',
              style: const TextStyle(fontSize: 11, color: Color(0xFF919EAB)),
            ),
            const SizedBox(height: 18),
            const Text(
              'Thời gian nhận vé',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFF212B36),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _DropdownBox<int>(
                    value: hours.contains(_hour12) ? _hour12 : null,
                    items: hours,
                    labelBuilder: (h) => h.toString().padLeft(2, '0'),
                    onChanged: (v) {
                      if (v == null) return;
                      setState(() {
                        _hour12 = v;
                        _normalizeSelection();
                      });
                    },
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6),
                  child: Text(
                    ':',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Expanded(
                  child: _DropdownBox<int>(
                    value: minutes.contains(_minute) ? _minute : null,
                    items: minutes,
                    labelBuilder: (m) => m.toString().padLeft(2, '0'),
                    onChanged: (v) {
                      if (v == null) return;
                      setState(() => _minute = v);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _DropdownBox<String>(
                    value: periods.contains(_period) ? _period : null,
                    items: periods,
                    labelBuilder: (p) => p,
                    onChanged: (v) {
                      if (v == null) return;
                      setState(() {
                        _period = v;
                        _normalizeSelection();
                      });
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: canConfirm ? _confirm : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: const Color(0xFFF3B5B2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Xác nhận',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DayChip extends StatelessWidget {
  final String label;
  final String subLabel;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  const _DayChip({
    required this.label,
    required this.subLabel,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : 0.4,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFFFFF4F4) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? AppColors.primary : const Color(0xFFE5E7EB),
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Column(
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: selected ? AppColors.primary : const Color(0xFF15213B),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subLabel,
                style: TextStyle(
                  fontSize: 12,
                  color: selected ? AppColors.primary : const Color(0xFF6B7280),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DropdownBox<T> extends StatelessWidget {
  final T? value;
  final List<T> items;
  final String Function(T) labelBuilder;
  final ValueChanged<T?> onChanged;

  const _DropdownBox({
    required this.value,
    required this.items,
    required this.labelBuilder,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFE5E7EB)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          isExpanded: true,
          value: value,
          hint: const Text('-'),
          items: items
              .map(
                (e) => DropdownMenuItem<T>(
                  value: e,
                  child: Text(
                    labelBuilder(e),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              )
              .toList(),
          onChanged: items.isEmpty ? null : onChanged,
        ),
      ),
    );
  }
}
