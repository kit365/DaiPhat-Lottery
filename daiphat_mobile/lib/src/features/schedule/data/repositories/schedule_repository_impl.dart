import '../../domain/entities/lottery_station_schedule.dart';
import '../../domain/repositories/schedule_repository.dart';
import '../services/schedule_api_service.dart';

class ScheduleRepositoryImpl implements ScheduleRepository {
  final ScheduleApiService _apiService;

  const ScheduleRepositoryImpl(this._apiService);

  @override
  Future<List<LotteryStationSchedule>> fetchAll({String? region}) =>
      _apiService.fetchAll(region: region);
}
