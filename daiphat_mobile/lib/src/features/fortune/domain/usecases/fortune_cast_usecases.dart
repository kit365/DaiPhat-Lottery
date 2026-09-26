import '../entities/fortune_cast_result.dart';
import '../repositories/fortune_cast_repository.dart';

class CastFortune {
  final FortuneCastRepository _repository;
  const CastFortune(this._repository);

  Future<FortuneCastResult> call(CastFortunePayload payload) =>
      _repository.cast(payload);
}

class GetTodayFortuneCast {
  final FortuneCastRepository _repository;
  const GetTodayFortuneCast(this._repository);

  Future<FortuneCastResult?> call() => _repository.getToday();
}
