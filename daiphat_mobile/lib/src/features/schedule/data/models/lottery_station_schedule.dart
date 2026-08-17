class LotteryStationSchedule {
  const LotteryStationSchedule({
    required this.stationId,
    required this.stationName,
    required this.region,
    required this.drawDays,
    required this.drawDaysDisplay,
    required this.drawTime,
  });

  final int stationId;
  final String stationName;
  final String region;
  final List<String> drawDays;
  final List<String> drawDaysDisplay;
  final String drawTime;

  factory LotteryStationSchedule.fromJson(Map<String, dynamic> json) {
    return LotteryStationSchedule(
      stationId: _asInt(json['stationId'] ?? json['id']) ?? 0,
      stationName: (json['stationName'] ?? json['name'] ?? '').toString(),
      region: (json['region'] ?? '').toString(),
      drawDays: _stringList(json['drawDays']),
      drawDaysDisplay: _stringList(json['drawDaysDisplay']),
      drawTime: (json['drawTime'] ?? '').toString(),
    );
  }
}

class ScheduleByDay {
  const ScheduleByDay({
    required this.dayId,
    required this.dayLabel,
    required this.stationsByRegion,
  });

  final String dayId;
  final String dayLabel;
  final Map<String, List<LotteryStationSchedule>> stationsByRegion;
}

const scheduleDayOrder = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const scheduleDayLabels = <String, String>{
  'MONDAY': 'Thứ 2',
  'TUESDAY': 'Thứ 3',
  'WEDNESDAY': 'Thứ 4',
  'THURSDAY': 'Thứ 5',
  'FRIDAY': 'Thứ 6',
  'SATURDAY': 'Thứ 7',
  'SUNDAY': 'Chủ Nhật',
};

const scheduleRegionOrder = ['MIEN_NAM', 'MIEN_TRUNG', 'MIEN_BAC'];

const scheduleRegionLabels = <String, String>{
  'MIEN_NAM': 'Miền Nam',
  'MIEN_TRUNG': 'Miền Trung',
  'MIEN_BAC': 'Miền Bắc',
};

List<String> availableScheduleRegions(List<LotteryStationSchedule> data) {
  final regions = data.map((item) => item.region).toSet();
  return scheduleRegionOrder.where(regions.contains).toList();
}

Map<String, String> scheduleRegionDrawTimes(
  List<LotteryStationSchedule> data,
  List<String> regions,
) {
  final times = <String, String>{};
  for (final region in regions) {
    final stations = data.where((item) => item.region == region);
    final sorted = stations
        .map((item) => item.drawTime.trim())
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList()
      ..sort();
    if (sorted.isEmpty) {
      times[region] = '--:--';
    } else if (sorted.length == 1) {
      times[region] = sorted.first;
    } else {
      times[region] = '${sorted.first} - ${sorted.last}';
    }
  }
  return times;
}

List<ScheduleByDay> buildScheduleByDay(
  List<LotteryStationSchedule> data,
  List<String> regions,
) {
  final result = scheduleDayOrder
      .map(
        (dayId) => ScheduleByDay(
          dayId: dayId,
          dayLabel: scheduleDayLabels[dayId] ?? dayId,
          stationsByRegion: {
            for (final region in regions) region: <LotteryStationSchedule>[],
          },
        ),
      )
      .toList();

  for (final station in data) {
    for (final day in station.drawDays) {
      for (final dayRecord in result) {
        if (dayRecord.dayId != day) continue;
        dayRecord.stationsByRegion[station.region]?.add(station);
        break;
      }
    }
  }

  return result
      .where(
        (day) => regions.any(
          (region) => (day.stationsByRegion[region] ?? const []).isNotEmpty,
        ),
      )
      .toList();
}

String todayScheduleDayId() {
  const map = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];
  return map[DateTime.now().weekday - 1];
}

List<String> _stringList(dynamic value) {
  if (value is! List) return const [];
  return value.map((item) => item.toString()).where((item) => item.isNotEmpty).toList();
}

int? _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}
