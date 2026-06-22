import '../models/lottery_result.dart';
import '../services/home_lottery_api_service.dart';

class HomeLotteryRepository {
  HomeLotteryRepository(this._apiService);

  final HomeLotteryApiService _apiService;

  Future<HomeLotteryData> fetchResults(DateTime drawDate) async {
    final summary = await _apiService.getBoard(drawDate);
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

    return HomeLotteryData(
      results: mergedResults,
      availableProvinces: provinces,
      isWaitingForResults: waiting,
    );
  }
}
