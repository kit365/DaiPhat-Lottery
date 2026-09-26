import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

/// Refined countdown & draw status banner matching the DaiPhat design language.
/// Uses elegant dark slate-700 text, vibrant brand red for the countdown timer,
/// and a soft-tinted clock/hourglass icon in place of the generic blue box.
class LotteryCountdownBanner extends StatefulWidget {
  final DateTime date;
  final List<String> selectedProvinces;
  final List<String> allAvailableProvinces;
  final String drawTime;
  final bool isWaitingForResults;
  final bool hasResults;
  final VoidCallback? onRefresh;

  const LotteryCountdownBanner({
    super.key,
    required this.date,
    required this.selectedProvinces,
    required this.allAvailableProvinces,
    this.drawTime = '16:15',
    required this.isWaitingForResults,
    required this.hasResults,
    this.onRefresh,
  });

  @override
  State<LotteryCountdownBanner> createState() => _LotteryCountdownBannerState();
}

class _LotteryCountdownBannerState extends State<LotteryCountdownBanner> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  DateTime _parseTargetDrawTime(DateTime date, String drawTime) {
    final parts = drawTime.split(':');
    final hour = parts.isNotEmpty ? int.tryParse(parts[0]) ?? 16 : 16;
    final minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 15 : 15;
    return DateTime(date.year, date.month, date.day, hour, minute, 0);
  }

  String _resolveProvinceLabel() {
    final selected = widget.selectedProvinces;
    final all = widget.allAvailableProvinces;

    if (selected.isEmpty || (all.isNotEmpty && selected.length == all.length)) {
      return 'Các đài miền Nam';
    }
    if (selected.length == 1) {
      return selected.first;
    }
    if (selected.length == 2) {
      return '${selected[0]} và ${selected[1]}';
    }
    return 'Các đài miền Nam';
  }

  String _formatNum(int value) => value.toString().padLeft(2, '0');

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final selectedDay = DateTime(
      widget.date.year,
      widget.date.month,
      widget.date.day,
    );
    final targetTime = _parseTargetDrawTime(widget.date, widget.drawTime);

    final isSameDay = selectedDay.isAtSameMomentAs(today);
    final isPastDay = selectedDay.isBefore(today);
    final isFutureDay = selectedDay.isAfter(today);

    // If past day and has results, hide
    if (isPastDay && widget.hasResults) {
      return const SizedBox.shrink();
    }

    // If today, completed with results, and not waiting, hide
    if (isSameDay && widget.hasResults && !widget.isWaitingForResults) {
      return const SizedBox.shrink();
    }

    final provinceLabel = _resolveProvinceLabel();
    final provincePrefix = provinceLabel.isNotEmpty ? '$provinceLabel ' : '';

    bool isExpired = false;
    String? timeCountdownText;
    String fullMessage = '';

    if (isSameDay) {
      final diff = targetTime.difference(now);
      if (diff.isNegative || diff.inSeconds <= 0) {
        isExpired = true;
        fullMessage = '$provincePrefixđã tới giờ quay số lúc ${widget.drawTime}. Hệ thống đang chờ cập nhật kết quả.';
      } else {
        final hours = diff.inHours;
        final minutes = diff.inMinutes.remainder(60);
        final seconds = diff.inSeconds.remainder(60);
        timeCountdownText = '${_formatNum(hours)}:${_formatNum(minutes)}:${_formatNum(seconds)}';
        fullMessage = '$provincePrefixđang chờ xổ số lúc ${widget.drawTime}. Còn $timeCountdownText nữa';
      }
    } else if (isFutureDay) {
      final formattedDate = DateFormat('dd/MM/yyyy').format(widget.date);
      final diff = targetTime.difference(now);
      if (diff.inDays < 1) {
        final hours = diff.inHours;
        final minutes = diff.inMinutes.remainder(60);
        final seconds = diff.inSeconds.remainder(60);
        timeCountdownText = '${_formatNum(hours)}:${_formatNum(minutes)}:${_formatNum(seconds)}';
        fullMessage = '$provincePrefixđang chờ xổ số lúc ${widget.drawTime}. Còn $timeCountdownText nữa';
      } else {
        fullMessage = '$provincePrefixđang chờ xổ số lúc ${widget.drawTime} ngày $formattedDate.';
      }
    } else {
      if (!widget.hasResults) {
        final formattedDate = DateFormat('dd/MM/yyyy').format(widget.date);
        fullMessage = 'Chưa có dữ liệu kết quả cho ngày $formattedDate.';
      } else {
        return const SizedBox.shrink();
      }
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Material(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: widget.onRefresh,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.surfacePrimary,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Soft tinted circular icon badge matching app aesthetic
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: isExpired
                        ? const Color(0xFFFEF3C7) // soft amber tint
                        : const Color(0xFFFFF1F2), // soft rose tint
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isExpired
                        ? Icons.hourglass_top_rounded
                        : Icons.access_time_rounded,
                    size: 16,
                    color: isExpired
                        ? const Color(0xFFD97706)
                        : const Color(0xFFEE1314),
                  ),
                ),
                const SizedBox(width: 12),
                // Text with classy slate-700 body and bold red timer countdown
                Expanded(
                  child: timeCountdownText != null
                      ? Text.rich(
                          TextSpan(
                            style: const TextStyle(
                              color: Color(0xFF334155), // text-slate-700
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              height: 1.35,
                            ),
                            children: [
                              TextSpan(
                                text: '$provincePrefixđang chờ xổ số lúc ${widget.drawTime}. Còn ',
                              ),
                              TextSpan(
                                text: timeCountdownText,
                                style: const TextStyle(
                                  color: Color(0xFFEE1314), // brand red
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const TextSpan(text: ' nữa'),
                            ],
                          ),
                        )
                      : Text(
                          fullMessage,
                          style: TextStyle(
                            color: isExpired
                                ? const Color(0xFFB45309) // warm amber-700
                                : const Color(0xFF334155), // slate-700
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            height: 1.35,
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
