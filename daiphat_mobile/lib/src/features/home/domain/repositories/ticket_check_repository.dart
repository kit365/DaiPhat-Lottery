import '../entities/ticket_check.dart';

abstract class TicketCheckRepository {
  Future<List<LotteryStationDraw>> getScheduleForDate(DateTime drawDate);

  Future<TicketCheckResult> checkWinning({
    required int stationId,
    required DateTime drawDate,
    required String ticketNumber,
  });
}
