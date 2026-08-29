import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import '../../data/models/lottery_station_schedule.dart';
import '../providers/schedule_providers.dart';

class ScheduleView extends ConsumerStatefulWidget {
  const ScheduleView({super.key});

  static const _headerRed = AppColors.brandPrimaryStrong;

  @override
  ConsumerState<ScheduleView> createState() => _ScheduleViewState();
}

class _ScheduleViewState extends ConsumerState<ScheduleView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref.invalidate(lotteryScheduleProvider);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final asyncSchedule = ref.watch(lotteryScheduleProvider);

    return Scaffold(
      backgroundColor: AppColors.surfacePrimary,
      appBar: AppBar(
        backgroundColor: AppColors.surfacePrimary,
        surfaceTintColor: AppColors.transparent,
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
          style: AppTypography.mainWith(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppColors.textMain,
          ),
        ),
        centerTitle: true,
      ),
      body: asyncSchedule.when(
        skipLoadingOnReload: true,
        skipLoadingOnRefresh: true,
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
          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () => ref.refresh(lotteryScheduleProvider.future),
            child: _ScheduleTable(stations: stations),
          );
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
            const Icon(
              Icons.error_outline,
              size: 48,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: AppTypography.mainWith(
                fontSize: 14,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: onRetry,
              child: Text(
                'Thử lại',
                style: AppTypography.mainWith(
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

  @override
  Widget build(BuildContext context) {
    final regions = availableScheduleRegions(stations);
    final drawTimes = scheduleRegionDrawTimes(stations, regions);
    final days = buildScheduleByDay(stations, regions);
    final todayId = todayScheduleDayId();

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        Text(
          'Theo dõi thời gian quay số theo từng miền',
          style: AppTypography.mainWith(
            fontSize: 13,
            color: AppColors.contentNeutral,
          ),
        ),
        const SizedBox(height: 18),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surfacePrimary,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.borderDefault),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final minTableWidth = 128.0 + 180.0 * regions.length;
              final tableWidth = constraints.maxWidth > minTableWidth
                  ? constraints.maxWidth
                  : minTableWidth;
              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: SizedBox(
                  width: tableWidth,
                  child: Table(
                    border: const TableBorder(
                      horizontalInside: BorderSide(
                        color: AppColors.borderDefault,
                      ),
                      verticalInside: BorderSide(
                        color: AppColors.borderDefault,
                      ),
                    ),
                    defaultVerticalAlignment: TableCellVerticalAlignment.middle,
                    columnWidths: {
                      0: const FlexColumnWidth(1.15),
                      for (var i = 0; i < regions.length; i++)
                        i + 1: const FlexColumnWidth(1.85),
                    },
                    children: [
                      TableRow(
                        children: [
                          _headerCell('KHU VỰC'),
                          ...regions.map((region) {
                            final label =
                                (scheduleRegionLabels[region] ?? region)
                                    .toUpperCase();
                            final time = drawTimes[region] ?? '--:--';
                            return _headerCell('$label ($time)');
                          }),
                        ],
                      ),
                      ...days.map((day) {
                        final isToday = day.dayId == todayId;
                        return TableRow(
                          decoration: BoxDecoration(
                            color: isToday
                                ? AppColors.statusErrorSurface
                                : AppColors.surfacePrimary,
                          ),
                          children: [
                            _dayCell(day.dayLabel, isToday: isToday),
                            ...regions.map((region) {
                              final list =
                                  day.stationsByRegion[region] ?? const [];
                              return _stationCell(list, isToday: isToday);
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

  Widget _headerCell(String title) {
    return Container(
      constraints: const BoxConstraints(minHeight: 48),
      color: ScheduleView._headerRed,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      alignment: Alignment.center,
      child: Text(
        title,
        textAlign: TextAlign.center,
        style: AppTypography.mainWith(
          fontSize: 13,
          fontWeight: FontWeight.w800,
          color: AppColors.surfacePrimary,
          letterSpacing: 0.3,
        ),
      ),
    );
  }

  Widget _dayCell(String label, {required bool isToday}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            isToday ? Icons.star_rounded : Icons.calendar_month_outlined,
            size: 16,
            color: AppColors.primary,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            textAlign: TextAlign.center,
            style: AppTypography.mainWith(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: isToday ? AppColors.primary : AppColors.textMain,
            ),
          ),
        ],
      ),
    );
  }

  Widget _stationCell(
    List<LotteryStationSchedule> stations, {
    required bool isToday,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: stations
            .map(
              (station) => Text(
                'Xổ Số ${station.stationName}',
                textAlign: TextAlign.center,
                style: AppTypography.mainWith(
                  fontSize: 13,
                  height: 1.5,
                  fontWeight: isToday ? FontWeight.w700 : FontWeight.w500,
                  color: isToday ? AppColors.primary : const Color(0xFF333333),
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}
