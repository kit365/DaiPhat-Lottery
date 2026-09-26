import '../entities/lottery_result.dart';
import '../repositories/home_lottery_repository.dart';

class FetchHomeLotteryResults {
  final HomeLotteryRepository _repository;
  const FetchHomeLotteryResults(this._repository);

  Future<HomeLotteryFetchResult> call(DateTime drawDate) =>
      _repository.fetchResults(drawDate);
}
