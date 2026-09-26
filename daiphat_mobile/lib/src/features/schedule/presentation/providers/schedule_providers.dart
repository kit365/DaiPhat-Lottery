import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/lottery_station_schedule.dart';
import '../../domain/repositories/schedule_repository.dart';
import '../../domain/usecases/get_lottery_schedule.dart';

final scheduleRepositoryProvider = Provider<ScheduleRepository>((ref) {
  throw UnimplementedError(
    'scheduleRepositoryProvider must be overridden in bootstrap',
  );
});

final getLotteryScheduleProvider = Provider<GetLotterySchedule>((ref) {
  return GetLotterySchedule(ref.watch(scheduleRepositoryProvider));
});

final lotteryScheduleProvider =
    FutureProvider.autoDispose<List<LotteryStationSchedule>>((ref) {
  return ref.watch(getLotteryScheduleProvider)();
});
