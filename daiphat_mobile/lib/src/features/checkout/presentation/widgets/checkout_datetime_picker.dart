import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
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

  static int _toHour12(int hour24) {
    final h = hour24 % 12;
    return h == 0 ? 12 : h;
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
    final m = selected.minute.toString().padLeft(2, '0');
    final time = '${h12.toString().padLeft(2, '0')}:$m $period';
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
                      color: AppColors.contentPrimary,
                      size: 26,
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Thời gian đến lấy *',
                          style: AppTypography.main(
                            TextStyle(
                              color: hasError
                                  ? AppColors.primary
                                  : AppColors.contentMuted,
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _displayText,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.main(
                            TextStyle(
                              color: hasValue
                                  ? AppColors.contentPrimary
                                  : AppColors.contentPlaceholder,
                              fontSize: 15,
                              fontWeight: hasValue
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.contentPrimary,
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
                            color: Color(0xFFFFB020),
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
        Semantics(
          button: true,
          label: hasValue
              ? 'Thời gian đến lấy: $_displayText'
              : 'Chọn ngày và giờ nhận vé',
          hint: hasError ? widget.errorText : 'Mở bộ chọn ngày và giờ nhận vé',
          onTap: _openSheet,
          child: ExcludeSemantics(
            child: InkWell(
              onTap: _openSheet,
              borderRadius: BorderRadius.circular(12),
              child: InputDecorator(
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.calendar_month_rounded),
                  errorText: widget.errorText,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: hasError ? Colors.red : AppColors.borderDefault,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: hasError ? Colors.red : AppColors.primary,
                      width: 1.5,
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 14,
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _displayText,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: hasValue
                              ? FontWeight.w600
                              : FontWeight.w400,
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
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Giờ mở cửa: ${_opHours.openTime} – ${_opHours.closeTime}. Đặt trước ít nhất ${widget.minLeadMinutes} phút.',
          style: AppTypography.main(
            const TextStyle(
              fontSize: 11.5,
              color: AppColors.contentPlaceholder,
              height: 1.4,
            ),
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
  late String _period; // AM | PM
  late int _hour12;
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

    _period = seed.hour >= 12 ? 'PM' : 'AM';
    _hour12 = _toHour12(seed.hour);
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
    if (period == 'AM') {
      return hour12 == 12 ? 0 : hour12;
    } else {
      return hour12 == 12 ? 12 : hour12 + 12;
    }
  }

  DateTime get _selectedDate => _isToday ? widget.today : widget.tomorrow;

  List<String> get _availablePeriods {
    final periods = <String>[];
    for (final p in ['AM', 'PM']) {
      final hours = _getAvailableHours12ForPeriod(p);
      if (hours.isNotEmpty) {
        periods.add(p);
      }
    }
    return periods.isNotEmpty ? periods : ['AM'];
  }

  List<int> _getAvailableHours12ForPeriod(String period) {
    final start24 = period == 'AM' ? 0 : 12;
    final end24 = period == 'AM' ? 11 : 23;

    final openRangeStart = widget.operatingHours.openHour > start24
        ? widget.operatingHours.openHour
        : start24;
    final closeRangeEnd = widget.operatingHours.closeHour < end24
        ? widget.operatingHours.closeHour
        : end24;

    if (openRangeStart > closeRangeEnd) return [];

    final hours12 = <int>[];
    for (var h24 = openRangeStart; h24 <= closeRangeEnd; h24++) {
      if (!_isToday) {
        hours12.add(_toHour12(h24));
      } else {
        final earliest = widget.earliestToday;
        if (earliest == null) continue;
        if (h24 < earliest.hour) continue;
        if (h24 == earliest.hour) {
          final hasSlot = _slotMinutes.any((m) {
            final candidate = DateTime(
              widget.today.year,
              widget.today.month,
              widget.today.day,
              h24,
              m,
            );
            return !candidate.isBefore(earliest);
          });
          if (hasSlot) hours12.add(_toHour12(h24));
        } else {
          hours12.add(_toHour12(h24));
        }
      }
    }
    return hours12.toSet().toList();
  }

  List<int> get _availableHours12 => _getAvailableHours12ForPeriod(_period);

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
    final periods = _availablePeriods;
    if (!periods.contains(_period)) {
      _period = periods.first;
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
      final earliest = widget.earliestToday!;
      _period = earliest.hour >= 12 ? 'PM' : 'AM';
      _hour12 = _toHour12(earliest.hour);
      _minute = earliest.minute;
      _normalizeSelection();
    });
  }

  void _selectTomorrow() {
    setState(() {
      _isToday = false;
      _period = widget.operatingHours.openHour >= 12 ? 'PM' : 'AM';
      _hour12 = _toHour12(widget.operatingHours.openHour);
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
    final periods = _availablePeriods;
    final hours = _availableHours12;
    final minutes = _availableMinutes;
    final canConfirm =
        periods.isNotEmpty && hours.isNotEmpty && minutes.isNotEmpty;

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
              style: AppTypography.main(
                const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.contentPrimary,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Date buttons
            Text(
              'Ngày nhận vé',
              style: AppTypography.main(
                const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.contentMuted,
                ),
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

            // Time Selection: 3 compact dropdowns (Giờ, Phút, AM/PM)
            Text(
              'Khung giờ',
              style: AppTypography.main(
                const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.contentMuted,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                // 1. Hour 12h dropdown
                Expanded(
                  flex: 5,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.cardBorder),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<int>(
                        value: hours.contains(_hour12)
                            ? _hour12
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
                              style: AppTypography.main(
                                const TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.contentPrimary,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                        onChanged: (newHour) {
                          if (newHour == null) return;
                          setState(() {
                            _hour12 = newHour;
                            _normalizeSelection();
                          });
                        },
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // 2. Minute dropdown
                Expanded(
                  flex: 5,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
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
                              style: AppTypography.main(
                                const TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.contentPrimary,
                                ),
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
                const SizedBox(width: 8),

                // 3. AM / PM dropdown
                Expanded(
                  flex: 4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.cardBorder),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: periods.contains(_period)
                            ? _period
                            : (periods.isNotEmpty ? periods.first : null),
                        isExpanded: true,
                        icon: const Icon(
                          Icons.arrow_drop_down_rounded,
                          color: AppColors.contentMuted,
                        ),
                        items: periods.map((p) {
                          return DropdownMenuItem<String>(
                            value: p,
                            child: Text(
                              p,
                              style: AppTypography.main(
                                const TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.contentPrimary,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                        onChanged: (newPeriod) {
                          if (newPeriod == null) return;
                          setState(() {
                            _period = newPeriod;
                            _normalizeSelection();
                          });
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
              style: AppTypography.main(
                const TextStyle(
                  fontSize: 11.5,
                  color: AppColors.contentPlaceholder,
                  height: 1.3,
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Confirm button
            ElevatedButton(
              onPressed: canConfirm ? _confirm : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.surfacePrimary,
                disabledBackgroundColor: const Color(0xFFF3B5B2),
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: Text(
                'Xác nhận',
                style: AppTypography.main(
                  const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.surfacePrimary,
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
              style: AppTypography.main(
                const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.contentPlaceholder,
                ),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subLabel,
              style: AppTypography.main(
                const TextStyle(
                  fontSize: 11,
                  color: AppColors.contentPlaceholder,
                ),
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
          color: isSelected ? const Color(0xFFFFF1EF) : AppColors.surfacePrimary,
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
              style: AppTypography.main(
                TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? AppColors.primary : AppColors.contentPrimary,
                ),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subLabel,
              style: AppTypography.main(
                TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? AppColors.primary : AppColors.contentMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
