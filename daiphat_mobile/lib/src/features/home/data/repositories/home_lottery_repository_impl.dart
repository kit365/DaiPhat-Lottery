import '../../domain/entities/lottery_result.dart';
import '../../domain/repositories/home_lottery_repository.dart';
import '../services/home_lottery_api_service.dart';

class HomeLotteryRepositoryImpl implements HomeLotteryRepository {
  HomeLotteryRepositoryImpl(this._apiService);

  final HomeLotteryApiService _apiService;

  @override
  Future<HomeLotteryFetchResult> fetchResults(
    DateTime drawDate, {
    String? region,
  }) async {
    final summary = await _apiService.getBoard(drawDate, region: region);
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
    List<LotteryResultLiveItemApiResponse> detailItems = const [];
    try {
      detailItems = await _apiService.getDetails(
        summary.map((item) => item.id).where((id) => id > 0).toList(),
      );
    } catch (_) {
      // Giữ summary board khi getDetails lỗi hoặc timeout
    }

    final detailByResultId = <int, LotteryResultLiveItemApiResponse>{
      for (final item in detailItems) item.result.id: item,
    };
    final detailByStationId = <int, LotteryResultLiveItemApiResponse>{
      for (final item in detailItems)
        if (item.result.stationId > 0) item.result.stationId: item,
    };

    final mergedResults = baseResults
        .map(
          (item) => mergeResultWithLiveDetails(
            item,
            detailByResultId[item.id] ?? detailByStationId[item.stationId],
          ),
        )
        .toList();

    final provinces = mergedResults
        .map((item) => item.province)
        .toSet()
        .toList();
    final waiting = mergedResults.isNotEmpty &&
        mergedResults.every((item) => item.prizes.special.trim().isEmpty);
    final nextPollAfterSeconds = detailItems
        .map((item) => item.pollAfterSeconds)
        .whereType<int>()
        .where((value) => value > 0)
        .fold<int?>(
          null,
          (min, value) => min == null ? value : (value < min ? value : min),
        );

    return HomeLotteryFetchResult(
      data: HomeLotteryData(
        results: mergedResults,
        availableProvinces: provinces,
        isWaitingForResults: waiting,
      ),
      shouldPollSummary: isToday || waiting,
      nextPollAfterSeconds: nextPollAfterSeconds,
    );
  }
}

bool _isSameDate(DateTime left, DateTime right) {
  return left.year == right.year &&
      left.month == right.month &&
      left.day == right.day;
}
