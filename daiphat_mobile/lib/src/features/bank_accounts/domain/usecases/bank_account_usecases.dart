import '../entities/bank_account.dart';
import '../repositories/bank_accounts_repository.dart';

class GetMyBankAccounts {
  final BankAccountsRepository _repository;
  const GetMyBankAccounts(this._repository);
  Future<List<UserBankAccountResponse>> call() => _repository.getMyAccounts();
}

class GetBanks {
  final BankAccountsRepository _repository;
  const GetBanks(this._repository);
  Future<List<VietQrBankResponse>> call() => _repository.getBanks();
}

class CreateBankAccount {
  final BankAccountsRepository _repository;
  const CreateBankAccount(this._repository);
  Future<UserBankAccountResponse> call(CreateUserBankAccountRequest request) =>
      _repository.createAccount(request);
}

class UpdateBankAccount {
  final BankAccountsRepository _repository;
  const UpdateBankAccount(this._repository);
  Future<UserBankAccountResponse> call(int id, CreateUserBankAccountRequest request) =>
      _repository.updateAccount(id, request);
}

class DeleteBankAccount {
  final BankAccountsRepository _repository;
  const DeleteBankAccount(this._repository);
  Future<void> call(int id) => _repository.deleteAccount(id);
}

class SetDefaultBankAccount {
  final BankAccountsRepository _repository;
  const SetDefaultBankAccount(this._repository);
  Future<UserBankAccountResponse> call(int id) => _repository.setDefaultAccount(id);
}
