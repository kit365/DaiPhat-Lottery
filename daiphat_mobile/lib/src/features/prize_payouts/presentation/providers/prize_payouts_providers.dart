import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repositories/prize_payouts_repository.dart';
import '../../domain/usecases/prize_payout_usecases.dart';

final prizePayoutsRepositoryProvider = Provider<PrizePayoutsRepository>((ref) {
  throw UnimplementedError('prizePayoutsRepositoryProvider must be overridden in bootstrap');
});

final previewPrizePayoutProvider = Provider<PreviewPrizePayout>((ref) =>
    PreviewPrizePayout(ref.watch(prizePayoutsRepositoryProvider)));
final createPrizePayoutProvider = Provider<CreatePrizePayout>((ref) =>
    CreatePrizePayout(ref.watch(prizePayoutsRepositoryProvider)));
final getMyPrizePayoutsProvider = Provider<GetMyPrizePayouts>((ref) =>
    GetMyPrizePayouts(ref.watch(prizePayoutsRepositoryProvider)));
final getPrizePayoutDetailProvider = Provider<GetPrizePayoutDetail>((ref) =>
    GetPrizePayoutDetail(ref.watch(prizePayoutsRepositoryProvider)));
final cancelPrizePayoutProvider = Provider<CancelPrizePayout>((ref) =>
    CancelPrizePayout(ref.watch(prizePayoutsRepositoryProvider)));
