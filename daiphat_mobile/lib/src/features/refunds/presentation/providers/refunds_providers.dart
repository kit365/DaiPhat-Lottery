import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repositories/refunds_repository.dart';
import '../../domain/usecases/refund_usecases.dart';

final refundsRepositoryProvider = Provider<RefundsRepository>((ref) {
  throw UnimplementedError('refundsRepositoryProvider must be overridden in bootstrap');
});

final getMyRefundsProvider = Provider<GetMyRefunds>((ref) =>
    GetMyRefunds(ref.watch(refundsRepositoryProvider)));
final getRefundDetailProvider = Provider<GetRefundDetail>((ref) =>
    GetRefundDetail(ref.watch(refundsRepositoryProvider)));
final attachRefundBankAccountProvider = Provider<AttachRefundBankAccount>((ref) =>
    AttachRefundBankAccount(ref.watch(refundsRepositoryProvider)));
