import '../entities/bank_account.dart';

abstract interface class BankAccountsRepository {
  Future<List<UserBankAccountResponse>> getMyAccounts();
  Future<List<VietQrBankResponse>> getBanks();
  Future<UserBankAccountResponse> createAccount(CreateUserBankAccountRequest request);
  Future<UserBankAccountResponse> updateAccount(int id, CreateUserBankAccountRequest request);
  Future<void> deleteAccount(int id);
  Future<UserBankAccountResponse> setDefaultAccount(int id);
}
