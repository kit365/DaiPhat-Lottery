import 'package:flutter_test/flutter_test.dart';

import 'package:daiphat_mobile/src/features/bank_accounts/domain/entities/bank_account.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/domain/repositories/bank_accounts_repository.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/domain/usecases/bank_account_usecases.dart';

class _FakeBankAccountsRepository implements BankAccountsRepository {
  CreateUserBankAccountRequest? request;
  int? id;

  final account = const UserBankAccountResponse(
    id: 9,
    bankName: 'Test Bank',
    bankBin: '970000',
    bankAccountNo: '123456',
    bankAccountName: 'NGUYEN VAN A',
    isDefault: true,
  );

  @override
  Future<UserBankAccountResponse> createAccount(CreateUserBankAccountRequest request) async {
    this.request = request;
    return account;
  }

  @override
  Future<void> deleteAccount(int id) async => this.id = id;

  @override
  Future<List<VietQrBankResponse>> getBanks() async => const [];

  @override
  Future<List<UserBankAccountResponse>> getMyAccounts() async => [account];

  @override
  Future<UserBankAccountResponse> setDefaultAccount(int id) async {
    this.id = id;
    return account;
  }

  @override
  Future<UserBankAccountResponse> updateAccount(
    int id,
    CreateUserBankAccountRequest request,
  ) async {
    this.id = id;
    this.request = request;
    return account;
  }
}

void main() {
  test('bank account parser keeps numeric id and default state', () {
    final account = UserBankAccountResponse.fromJson({
      'id': 9.0,
      'bankName': 'Test Bank',
      'bankBin': '970000',
      'bankAccountNo': '123456',
      'bankAccountName': 'NGUYEN VAN A',
      'isDefault': true,
    });

    expect(account.id, 9);
    expect(account.isDefault, isTrue);
  });

  test('bank account use cases preserve mutation payloads', () async {
    final repository = _FakeBankAccountsRepository();
    const request = CreateUserBankAccountRequest(
      bankBin: '970000',
      bankAccountNo: '123456',
      bankAccountName: 'NGUYEN VAN A',
      agreedToRefundTerms: true,
    );

    await CreateBankAccount(repository)(request);
    expect(repository.request?.bankAccountNo, '123456');

    await UpdateBankAccount(repository)(9, request);
    expect(repository.id, 9);

    await DeleteBankAccount(repository)(9);
    expect(repository.id, 9);
  });
}
