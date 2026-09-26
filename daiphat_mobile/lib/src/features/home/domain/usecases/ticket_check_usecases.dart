import '../entities/ticket_check.dart';
import '../repositories/ticket_check_repository.dart';

class GetTicketCheckStationsForDate {
  final TicketCheckRepository _repository;
  const GetTicketCheckStationsForDate(this._repository);

  Future<List<LotteryStationDraw>> call(DateTime drawDate) =>
      _repository.getScheduleForDate(drawDate);
}

class CheckTicketWinning {
  final TicketCheckRepository _repository;
  const CheckTicketWinning(this._repository);

  Future<TicketCheckResult> call({
    required int stationId,
    required DateTime drawDate,
    required String ticketNumber,
  }) =>
      _repository.checkWinning(
        stationId: stationId,
        drawDate: drawDate,
        ticketNumber: ticketNumber,
      );
}
