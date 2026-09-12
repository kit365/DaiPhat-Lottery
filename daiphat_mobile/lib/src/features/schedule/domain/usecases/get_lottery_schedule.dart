import '../entities/lottery_station_schedule.dart';
import '../repositories/schedule_repository.dart';

class GetLotterySchedule {
  final ScheduleRepository _repository;
  const GetLotterySchedule(this._repository);

  Future<List<LotteryStationSchedule>> call({String? region}) =>
      _repository.fetchAll(region: region);
}
