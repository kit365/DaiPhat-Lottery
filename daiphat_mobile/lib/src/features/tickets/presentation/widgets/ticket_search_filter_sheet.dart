import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import '../../utils/ticket_search_filter.dart';

Future<TicketSearchFilter?> showTicketSearchFilterSheet({
  required BuildContext context,
  required TicketSearchFilter initial,
}) {
  return showModalBottomSheet<TicketSearchFilter>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) {
      return Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
        child: TicketSearchFilterSheet(initial: initial),
      );
    },
  );
}

class TicketSearchFilterSheet extends StatefulWidget {
  const TicketSearchFilterSheet({super.key, required this.initial});

  final TicketSearchFilter initial;

  @override
  State<TicketSearchFilterSheet> createState() => _TicketSearchFilterSheetState();
}

class _TicketSearchFilterSheetState extends State<TicketSearchFilterSheet> {
  late List<String> _draftRanges;
  late Set<String> _draftTypes;
  final _fromController = TextEditingController(text: '00');
  final _toController = TextEditingController(text: '99');

  static const _typeOptions = [
    (label: 'Số kép (00, 11...)', value: 'DOUBLE', icon: Icons.copy_rounded),
    (
      label: 'Số tiến (12, 34...)',
      value: 'SEQUENTIAL',
      icon: Icons.trending_up_rounded,
    ),
    (
      label: 'Số lặp (1212...)',
      value: 'REPEATING',
      icon: Icons.loop_rounded,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _draftRanges = widget.initial.tailRanges.map(toUiTailRangeLabel).toList();
    _draftTypes = {...widget.initial.numberTypes};
  }

  @override
  void dispose() {
    _fromController.dispose();
    _toController.dispose();
    super.dispose();
  }

  void _toggleRange(String apiRange) {
    final label = toUiTailRangeLabel(apiRange);
    setState(() {
      if (_draftRanges.contains(label)) {
        _draftRanges = [..._draftRanges]..remove(label);
      } else {
        _draftRanges = [..._draftRanges, label];
      }
    });
  }

  void _toggleType(String value) {
    setState(() {
      final next = {..._draftTypes};
      if (!next.add(value)) {
        next.remove(value);
      }
      _draftTypes = next;
    });
  }

  void _addCustomRange() {
    final from = normalizeTwoDigitTail(_fromController.text);
    final to = normalizeTwoDigitTail(_toController.text);
    final fromNum = int.tryParse(from);
    final toNum = int.tryParse(to);
    if (fromNum == null ||
        toNum == null ||
        fromNum > toNum ||
        fromNum < 0 ||
        toNum > 99) {
      AppToast.info('Khoảng số không hợp lệ (00–99, từ ≤ đến)');
      return;
    }
    final label = '$from - $to';
    if (_draftRanges.contains(label)) {
      return;
    }
    setState(() => _draftRanges = [..._draftRanges, label]);
  }

  void _clear() {
    Navigator.of(context).pop(TicketSearchFilter.empty);
  }

  void _apply() {
    Navigator.of(context).pop(
      TicketSearchFilter(
        tailRanges: _draftRanges.map(toApiTailRange).toList(),
        numberTypes: _draftTypes.toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * 0.86,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFD1D5DB),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 12, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Lọc theo khoảng số',
                      style: AppTypography.main(
                        const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.ink,
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
            Flexible(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                children: [
                  Text(
                    'Chọn khoảng 2 số cuối để lọc vé. Nhiều khoảng: khớp một khoảng là đủ. Kết hợp với loại số: phải thỏa cả hai nhóm.',
                    style: AppTypography.main(
                      const TextStyle(
                        fontSize: 13,
                        color: AppColors.textMuted,
                        height: 1.4,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: TicketSearchFilter.presetTailRanges.map((range) {
                      final label = toUiTailRangeLabel(range);
                      final selected = _draftRanges.contains(label);
                      return _ChipButton(
                        label: label,
                        selected: selected,
                        onTap: () => _toggleRange(range),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Tùy chọn đặc biệt',
                    style: AppTypography.main(
                      const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF475569),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _typeOptions.map((opt) {
                      final selected = _draftTypes.contains(opt.value);
                      return _ChipButton(
                        label: opt.label,
                        selected: selected,
                        icon: opt.icon,
                        onTap: () => _toggleType(opt.value),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Thêm khoảng tùy chỉnh',
                    style: AppTypography.main(
                      const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF475569),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _DigitField(
                          controller: _fromController,
                          prefix: 'Từ',
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          '–',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                      ),
                      Expanded(
                        child: _DigitField(
                          controller: _toController,
                          prefix: 'Đến',
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        height: 44,
                        child: OutlinedButton(
                          onPressed: _addCustomRange,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: const BorderSide(color: AppColors.primary),
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'Thêm',
                            style: TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Khoảng đã chọn (${_draftRanges.length})',
                    style: AppTypography.main(
                      const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF475569),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (_draftRanges.isEmpty)
                    Text(
                      'Chưa chọn khoảng nào',
                      style: AppTypography.main(
                        const TextStyle(
                          fontSize: 13,
                          fontStyle: FontStyle.italic,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                    )
                  else
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _draftRanges.map((range) {
                        return InputChip(
                          label: Text(range),
                          onDeleted: () {
                            setState(
                              () => _draftRanges = [..._draftRanges]
                                ..remove(range),
                            );
                          },
                          deleteIconColor: AppColors.primary,
                          backgroundColor: const Color(0xFFFFF4F4),
                          side: const BorderSide(color: Color(0xFFFECDD3)),
                          labelStyle: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                          ),
                        );
                      }).toList(),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _clear,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF475569),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Xóa bộ lọc',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: FilledButton(
                      onPressed: _apply,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Áp dụng',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChipButton extends StatelessWidget {
  const _ChipButton({
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.primary : Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? AppColors.primary : const Color(0xFFE2E8F0),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 14,
                  color: selected ? Colors.white : AppColors.primary,
                ),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: AppTypography.main(
                  TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: selected ? Colors.white : const Color(0xFF334155),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DigitField extends StatelessWidget {
  const _DigitField({required this.controller, required this.prefix});

  final TextEditingController controller;
  final String prefix;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      maxLength: 2,
      textAlign: TextAlign.center,
      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
      decoration: InputDecoration(
        counterText: '',
        prefixText: '$prefix ',
        prefixStyle: const TextStyle(
          fontWeight: FontWeight.w500,
          fontSize: 13,
          color: Color(0xFF64748B),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
      ),
    );
  }
}
