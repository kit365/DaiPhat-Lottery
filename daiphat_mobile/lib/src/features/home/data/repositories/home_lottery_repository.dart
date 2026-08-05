import '../models/lottery_result.dart';
import '../services/home_lottery_api_service.dart';

class HomeLotteryRepository {
  HomeLotteryRepository(this._apiService);

  final HomeLotteryApiService _apiService;

  Future<HomeLotteryFetchResult> fetchResults(DateTime drawDate) async {
    final summary = await _apiService.getBoard(drawDate);
    final isToday = _isSameDate(drawDate, DateTime.now());

    if (summary.isEmpty) {
      return HomeLotteryFetchResult(
        data: HomeLotteryData(
          results: const [],
          availableProvinces: const [],
          isWaitingForResults: isToday,
        ),
        shouldPollSummary: isToday,
      );
    }

    final baseResults = summary.map(mapSummaryToLotteryResult).toList();
    final detailItems = await _apiService.getDetails(
      summary.map((item) => item.id).where((id) => id > 0).toList(),
    );

    final detailByResultId = <int, LotteryResultLiveItemApiResponse>{
      for (final item in detailItems) item.result.id: item,
    };

    final mergedResults = baseResults
        .map((item) => mergeResultWithLiveDetails(item, detailByResultId[item.id]))
        .toList();

    final provinces = mergedResults.map((item) => item.province).toSet().toList();
    final waiting = mergedResults.isNotEmpty &&
        mergedResults.every((item) => item.prizes.special.trim().isEmpty);
    final nextPollAfterSeconds = detailItems
        .map((item) => item.pollAfterSeconds)
        .whereType<int>()
        .where((value) => value > 0)
        .fold<int?>(null, (min, value) => min == null ? value : (value < min ? value : min));

    return HomeLotteryFetchResult(
      data: HomeLotteryData(
        results: mergedResults,
        availableProvinces: provinces,
        isWaitingForResults: waiting,
      ),
      nextPollAfterSeconds: nextPollAfterSeconds,
    );
  }
}

bool _isSameDate(DateTime left, DateTime right) {
  return left.year == right.year &&
      left.month == right.month &&
      left.day == right.day;
}
