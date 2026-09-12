import '../entities/lottery_station_schedule.dart';

abstract class ScheduleRepository {
  Future<List<LotteryStationSchedule>> fetchAll({String? region});
}
