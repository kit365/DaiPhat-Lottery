import '../entities/lottery_result.dart';

abstract class HomeLotteryRepository {
  Future<HomeLotteryFetchResult> fetchResults(DateTime drawDate);
}
