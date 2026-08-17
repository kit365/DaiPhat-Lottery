import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import '../../data/models/lottery_station_schedule.dart';
import '../providers/schedule_providers.dart';

class ScheduleView extends ConsumerWidget {
  const ScheduleView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncSchedule = ref.watch(lotteryScheduleProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 20,
            color: AppColors.primary,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Lịch mở thưởng',
          style: GoogleFonts.publicSans(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        centerTitle: true,
      ),
      body: asyncSchedule.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (error, _) => _ScheduleError(
          message: error.toString(),
          onRetry: () => ref.invalidate(lotteryScheduleProvider),
        ),
        data: (stations) {
          if (stations.isEmpty) {
            return _ScheduleError(
              message: 'Chưa có lịch mở thưởng.',
              onRetry: () => ref.invalidate(lotteryScheduleProvider),
            );
          }
          return _ScheduleTable(stations: stations);
        },
      ),
    );
  }
}

class _ScheduleError extends StatelessWidget {
  const _ScheduleError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.textMuted),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.publicSans(
                fontSize: 14,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: onRetry,
              child: Text(
                'Thử lại',
                style: GoogleFonts.publicSans(
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScheduleTable extends StatelessWidget {
  const _ScheduleTable({required this.stations});

  final List<LotteryStationSchedule> stations;

  static const _regionColors = <String, Color>{
    'MIEN_NAM': Color(0xFFEE1314),
    'MIEN_TRUNG': Color(0xFFF26522),
    'MIEN_BAC': Color(0xFFF59E0B),
  };

  @override
  Widget build(BuildContext context) {
    final regions = availableScheduleRegions(stations);
    final drawTimes = scheduleRegionDrawTimes(stations, regions);
    final days = buildScheduleByDay(stations, regions);
    final todayId = todayScheduleDayId();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Text(
          'Theo dõi thời gian quay số theo từng miền',
          style: GoogleFonts.publicSans(
            fontSize: 13,
            color: AppColors.textMuted,
          ),
        ),
        const SizedBox(height: 14),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE5E7EB)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final minTableWidth = 112.0 + 168.0 * regions.length;
              final tableWidth = constraints.maxWidth > minTableWidth
                  ? constraints.maxWidth
                  : minTableWidth;
              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: SizedBox(
                  width: tableWidth,
                  child: Table(
                    border: const TableBorder(
                      horizontalInside: BorderSide(color: Color(0xFFE5E7EB)),
                      verticalInside: BorderSide(color: Color(0xFFE5E7EB)),
                    ),
                    defaultVerticalAlignment: TableCellVerticalAlignment.middle,
                    columnWidths: {
                      0: const FlexColumnWidth(1.05),
                      for (var i = 0; i < regions.length; i++)
                        i + 1: const FlexColumnWidth(1.7),
                    },
                    children: [
                      TableRow(
                        children: [
                          _headerCell('Khu vực', color: AppColors.primary),
                          ...regions.map((region) {
                            final color =
                                _regionColors[region] ?? AppColors.primary;
                            return _headerCell(
                              scheduleRegionLabels[region] ?? region,
                              subtitle: '(${drawTimes[region] ?? '--:--'})',
                              color: color,
                            );
                          }),
                        ],
                      ),
                      ...days.map((day) {
                        final isToday = day.dayId == todayId;
                        return TableRow(
                          decoration: BoxDecoration(
                            color: isToday
                                ? const Color(0xFFFFF4F4)
                                : Colors.white,
                          ),
                          children: [
                            _dayCell(day.dayLabel, isToday: isToday),
                            ...regions.map((region) {
                              final list =
                                  day.stationsByRegion[region] ?? const [];
                              final color = isToday
                                  ? (_regionColors[region] ?? AppColors.primary)
                                  : const Color(0xFF333333);
                              return _stationCell(
                                list,
                                color: color,
                                bold: isToday,
                              );
                            }),
                          ],
                        );
                      }),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _headerCell(String title, {required Color color, String? subtitle}) {
    return TableCell(
      verticalAlignment: TableCellVerticalAlignment.fill,
      child: Container(
        color: color,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        alignment: Alignment.center,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              title.toUpperCase(),
              textAlign: TextAlign.center,
              style: GoogleFonts.publicSans(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: 0.4,
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: GoogleFonts.publicSans(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: Colors.white.withValues(alpha: 0.9),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _dayCell(String label, {required bool isToday}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (isToday) ...[
            const Icon(Icons.star_rounded, size: 14, color: AppColors.primary),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.publicSans(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: isToday ? AppColors.primary : AppColors.navy,
            ),
          ),
        ],
      ),
    );
  }

  Widget _stationCell(
    List<LotteryStationSchedule> stations, {
    required Color color,
    required bool bold,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: stations
            .map(
              (station) => Text(
                'Xổ Số ${station.stationName}',
                textAlign: TextAlign.center,
                style: GoogleFonts.publicSans(
                  fontSize: 13,
                  height: 1.45,
                  fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
                  color: color,
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}
