import '../../domain/entities/ticket_check.dart';
import '../../domain/repositories/ticket_check_repository.dart';
import '../services/ticket_check_api_service.dart';

class TicketCheckRepositoryImpl implements TicketCheckRepository {
  final TicketCheckApiService _apiService;

  const TicketCheckRepositoryImpl(this._apiService);

  @override
  Future<List<LotteryStationDraw>> getScheduleForDate(DateTime drawDate) =>
      _apiService.getScheduleForDate(drawDate);

  @override
  Future<TicketCheckResult> checkWinning({
    required int stationId,
    required DateTime drawDate,
    required String ticketNumber,
  }) =>
      _apiService.checkWinning(
        stationId: stationId,
        drawDate: drawDate,
        ticketNumber: ticketNumber,
      );
}
