import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repositories/bank_accounts_repository.dart';
import '../../domain/usecases/bank_account_usecases.dart';

final bankAccountsRepositoryProvider = Provider<BankAccountsRepository>((ref) {
  throw UnimplementedError('bankAccountsRepositoryProvider must be overridden in bootstrap');
});

final getMyBankAccountsProvider = Provider<GetMyBankAccounts>((ref) =>
    GetMyBankAccounts(ref.watch(bankAccountsRepositoryProvider)));
final getBanksProvider = Provider<GetBanks>((ref) =>
    GetBanks(ref.watch(bankAccountsRepositoryProvider)));
final createBankAccountProvider = Provider<CreateBankAccount>((ref) =>
    CreateBankAccount(ref.watch(bankAccountsRepositoryProvider)));
final updateBankAccountProvider = Provider<UpdateBankAccount>((ref) =>
    UpdateBankAccount(ref.watch(bankAccountsRepositoryProvider)));
final deleteBankAccountProvider = Provider<DeleteBankAccount>((ref) =>
    DeleteBankAccount(ref.watch(bankAccountsRepositoryProvider)));
final setDefaultBankAccountProvider = Provider<SetDefaultBankAccount>((ref) =>
    SetDefaultBankAccount(ref.watch(bankAccountsRepositoryProvider)));
