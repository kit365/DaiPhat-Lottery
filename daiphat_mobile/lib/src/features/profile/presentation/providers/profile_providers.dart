import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/features/profile/data/bank_account_service.dart';
import 'package:daiphat_mobile/src/features/profile/data/prize_payout_service.dart';

final prizePayoutServiceProvider = Provider<PrizePayoutService>((ref) {
  throw UnimplementedError('prizePayoutServiceProvider phải được override trong bootstrap');
});

final bankAccountServiceProvider = Provider<BankAccountService>((ref) {
  throw UnimplementedError('bankAccountServiceProvider phải được override trong bootstrap');
});
