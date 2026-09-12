import '../../domain/entities/fortune_cast_result.dart';
import '../../domain/repositories/fortune_cast_repository.dart';
import '../fortune_cast_service.dart';

class FortuneCastRepositoryImpl implements FortuneCastRepository {
  final FortuneCastService _service;

  const FortuneCastRepositoryImpl(this._service);

  @override
  Future<FortuneCastResult> cast(CastFortunePayload payload) =>
      _service.cast(payload);

  @override
  Future<FortuneCastResult?> getToday() => _service.getToday();
}
