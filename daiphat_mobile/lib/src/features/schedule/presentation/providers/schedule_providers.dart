import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import '../../data/models/lottery_station_schedule.dart';
import '../../data/services/schedule_api_service.dart';

final scheduleApiServiceProvider = Provider<ScheduleApiService>((ref) {
  return ScheduleApiService(ref.watch(apiClientProvider));
});

final lotteryScheduleProvider =
    FutureProvider<List<LotteryStationSchedule>>((ref) {
  return ref.watch(scheduleApiServiceProvider).fetchAll();
});
