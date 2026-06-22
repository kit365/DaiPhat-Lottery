import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import '../../data/models/lottery_result.dart';
import '../../data/repositories/home_lottery_repository.dart';
import '../../data/services/home_lottery_api_service.dart';

final homeLotteryApiServiceProvider = Provider<HomeLotteryApiService>((ref) {
  return HomeLotteryApiService(ref.watch(apiClientProvider));
});

final homeLotteryRepositoryProvider = Provider<HomeLotteryRepository>((ref) {
  return HomeLotteryRepository(ref.watch(homeLotteryApiServiceProvider));
});

final homeLotteryProvider =
    FutureProvider.autoDispose.family<HomeLotteryData, DateTime>((ref, drawDate) async {
  final repository = ref.watch(homeLotteryRepositoryProvider);
  return repository.fetchResults(drawDate);
});
