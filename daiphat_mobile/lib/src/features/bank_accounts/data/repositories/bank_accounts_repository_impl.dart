import '../../domain/entities/bank_account.dart';
import '../../domain/repositories/bank_accounts_repository.dart';
import '../datasources/bank_account_remote_data_source.dart';

class BankAccountsRepositoryImpl implements BankAccountsRepository {
  final BankAccountRemoteDataSource _remoteDataSource;

  const BankAccountsRepositoryImpl(this._remoteDataSource);

  @override
  Future<List<UserBankAccountResponse>> getMyAccounts() => _remoteDataSource.getMyAccounts();

  @override
  Future<List<VietQrBankResponse>> getBanks() => _remoteDataSource.getBanks();

  @override
  Future<UserBankAccountResponse> createAccount(CreateUserBankAccountRequest request) =>
      _remoteDataSource.createAccount(request);

  @override
  Future<UserBankAccountResponse> updateAccount(int id, CreateUserBankAccountRequest request) =>
      _remoteDataSource.updateAccount(id, request);

  @override
  Future<void> deleteAccount(int id) => _remoteDataSource.deleteAccount(id);

  @override
  Future<UserBankAccountResponse> setDefaultAccount(int id) =>
      _remoteDataSource.setDefaultAccount(id);
}
