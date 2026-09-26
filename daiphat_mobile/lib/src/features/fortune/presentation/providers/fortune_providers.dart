import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repositories/fortune_cast_repository.dart';
import '../../domain/usecases/fortune_cast_usecases.dart';

final fortuneCastRepositoryProvider = Provider<FortuneCastRepository>((ref) {
  throw UnimplementedError(
    'fortuneCastRepositoryProvider must be overridden in bootstrap',
  );
});

final castFortuneProvider = Provider<CastFortune>((ref) {
  return CastFortune(ref.watch(fortuneCastRepositoryProvider));
});

final getTodayFortuneCastProvider = Provider<GetTodayFortuneCast>((ref) {
  return GetTodayFortuneCast(ref.watch(fortuneCastRepositoryProvider));
});
