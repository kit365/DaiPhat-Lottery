import '../entities/fortune_cast_result.dart';

abstract class FortuneCastRepository {
  Future<FortuneCastResult> cast(CastFortunePayload payload);

  Future<FortuneCastResult?> getToday();
}
